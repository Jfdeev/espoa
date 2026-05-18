// IA-02 — Apoio na geração de relatórios PNAE.
//
// Organiza e transforma os dados de produção (já agregados pelo backend) em
// informações compreensíveis para um edital: cruzamento produção × demanda,
// nível de prontidão, seções textuais e um texto final pronto para ser salvo
// em `relatorio_pnae.conteudo`. É determinístico — não usa LLM — seguindo o
// mesmo padrão dos analisadores de IA-01.

import {
  daysUntil,
  formatCurrency,
  formatDateBR,
  formatNumber,
  formatPercent,
} from "./format";
import type {
  PnaeMatchItem,
  PnaeMatchStatus,
  PnaeProntidaoNivel,
  PnaeReportResponse,
  PnaeReportSection,
  PnaeReportSnapshot,
} from "./types";

/** Normaliza nome de cultura/produto p/ casar demanda × produção. */
function normalize(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function buildMatching(snapshot: PnaeReportSnapshot): PnaeMatchItem[] {
  const produtos = snapshot.edital.produtos ?? [];
  if (produtos.length === 0) return [];

  const producaoPorCultura = new Map<string, number>();
  for (const item of snapshot.producao.porCultura) {
    const key = normalize(item.cultura);
    producaoPorCultura.set(
      key,
      (producaoPorCultura.get(key) ?? 0) + item.quantidadeTotal,
    );
  }

  return produtos.map((p) => {
    const demanda = Math.max(0, p.quantidade);
    const disponivel = producaoPorCultura.get(normalize(p.produto)) ?? 0;
    const unidade = p.unidade?.trim() || "kg";
    const cobertura = demanda > 0 ? disponivel / demanda : disponivel > 0 ? 1 : 0;
    const gap = Math.max(0, demanda - disponivel);
    const surplus = Math.max(0, disponivel - demanda);

    let status: PnaeMatchStatus;
    if (disponivel <= 0) status = "sem_producao";
    else if (cobertura >= 1) status = "atende";
    else status = "parcial";

    const valorEstimado =
      p.precoReferencia != null
        ? Number((p.precoReferencia * Math.min(demanda, disponivel)).toFixed(2))
        : null;

    let mensagem: string;
    if (status === "sem_producao") {
      mensagem = `Nao ha producao registrada de "${p.produto}" no periodo. O edital pede ${formatNumber(
        demanda,
      )} ${unidade}.`;
    } else if (status === "atende") {
      mensagem = `A producao registrada (${formatNumber(
        disponivel,
      )} ${unidade}) cobre a demanda de ${formatNumber(
        demanda,
      )} ${unidade}${
        surplus > 0 ? `, com folga de ${formatNumber(surplus)} ${unidade}` : ""
      }.`;
    } else {
      mensagem = `Producao parcial: ${formatNumber(
        disponivel,
      )} ${unidade} de ${formatNumber(
        demanda,
      )} ${unidade} (${formatPercent(cobertura)}). Faltam ${formatNumber(
        gap,
      )} ${unidade} para atender o edital.`;
    }

    return {
      produto: p.produto,
      unidade,
      demanda,
      disponivel,
      cobertura: Number(cobertura.toFixed(4)),
      status,
      gap,
      surplus,
      valorEstimado,
      mensagem,
    };
  });
}

function computeProntidao(
  snapshot: PnaeReportSnapshot,
  matching: PnaeMatchItem[],
): PnaeReportResponse["prontidao"] {
  if (matching.length === 0) {
    // Sem demanda detalhada: prontidão deriva da existência de produção.
    const temProducao = snapshot.producao.quantidadeTotal > 0;
    return {
      nivel: temProducao ? "media" : "baixa",
      coberturaMedia: 0,
      produtosAtendidos: 0,
      produtosTotal: 0,
    };
  }

  const coberturaMedia =
    matching.reduce((sum, m) => sum + Math.min(m.cobertura, 1), 0) /
    matching.length;
  const produtosAtendidos = matching.filter(
    (m) => m.status === "atende",
  ).length;

  let nivel: PnaeProntidaoNivel;
  if (coberturaMedia >= 0.8) nivel = "alta";
  else if (coberturaMedia >= 0.4) nivel = "media";
  else nivel = "baixa";

  return {
    nivel,
    coberturaMedia: Number(coberturaMedia.toFixed(4)),
    produtosAtendidos,
    produtosTotal: matching.length,
  };
}

function buildAlertas(
  snapshot: PnaeReportSnapshot,
  matching: PnaeMatchItem[],
): string[] {
  const alertas: string[] = [];
  const { edital, producao } = snapshot;

  const dias = daysUntil(edital.dataLimite);
  if (dias != null) {
    if (dias < 0) {
      alertas.push(
        `O prazo do edital venceu ha ${Math.abs(dias)} dia(s) (${formatDateBR(
          edital.dataLimite,
        )}).`,
      );
    } else if (dias === 0) {
      alertas.push(`O prazo do edital vence hoje (${formatDateBR(edital.dataLimite)}).`);
    } else if (dias <= 7) {
      alertas.push(
        `Prazo curto: faltam ${dias} dia(s) para o limite do edital (${formatDateBR(
          edital.dataLimite,
        )}).`,
      );
    }
  }

  if (edital.status && edital.status.toLowerCase() === "encerrado") {
    alertas.push("O edital esta marcado como encerrado.");
  }

  if (producao.quantidadeTotal <= 0) {
    alertas.push(
      "Nenhuma producao foi registrada no periodo — registre a producao dos associados antes de submeter o relatorio.",
    );
  }

  const semProducao = matching.filter((m) => m.status === "sem_producao");
  if (semProducao.length > 0) {
    alertas.push(
      `${semProducao.length} produto(s) do edital sem producao registrada: ${semProducao
        .map((m) => m.produto)
        .join(", ")}.`,
    );
  }

  return alertas;
}

function buildSecoes(
  snapshot: PnaeReportSnapshot,
  matching: PnaeMatchItem[],
  prontidao: PnaeReportResponse["prontidao"],
): PnaeReportSection[] {
  const { edital, periodo, producao } = snapshot;
  const secoes: PnaeReportSection[] = [];

  // 1. Identificação do edital
  const idLinhas = [
    `Edital: ${edital.titulo}`,
    edital.numeroEdital ? `Numero: ${edital.numeroEdital}` : null,
    edital.orgaoResponsavel ? `Orgao responsavel: ${edital.orgaoResponsavel}` : null,
    edital.municipio || edital.estado
      ? `Local: ${[edital.municipio, edital.estado].filter(Boolean).join(" / ")}`
      : null,
    `Data limite: ${formatDateBR(edital.dataLimite)}`,
    edital.valorTotalEstimado != null
      ? `Valor total estimado: ${formatCurrency(edital.valorTotalEstimado)}`
      : null,
  ].filter((l): l is string => l !== null);
  secoes.push({
    id: "identificacao",
    titulo: "Identificacao do edital",
    conteudo: idLinhas.join("\n"),
  });

  // 2. Capacidade de produção da associação
  const topCulturas = [...producao.porCultura]
    .sort((a, b) => b.quantidadeTotal - a.quantidadeTotal)
    .slice(0, 5)
    .map(
      (c) =>
        `- ${c.cultura}: ${formatNumber(c.quantidadeTotal)} (${c.registros} registro(s))`,
    );
  secoes.push({
    id: "capacidade_producao",
    titulo: "Capacidade de producao da associacao",
    conteudo:
      `No periodo de ${formatDateBR(periodo.inicio)} a ${formatDateBR(
        periodo.fim,
      )}, a associacao registrou ${formatNumber(
        producao.quantidadeTotal,
      )} de producao total, em ${producao.totalRegistros} registro(s), ` +
      `envolvendo ${producao.associadosUnicos} associado(s) e ${producao.culturasUnicas} cultura(s).` +
      (topCulturas.length > 0
        ? `\n\nPrincipais culturas produzidas:\n${topCulturas.join("\n")}`
        : "\n\nNenhuma cultura registrada no periodo."),
  });

  // 3. Atendimento à demanda (matching) — só quando há demanda detalhada
  if (matching.length > 0) {
    const linhas = matching.map((m) => {
      const valor =
        m.valorEstimado != null
          ? ` | valor estimado: ${formatCurrency(m.valorEstimado)}`
          : "";
      return `- ${m.produto}: demanda ${formatNumber(
        m.demanda,
      )} ${m.unidade} | disponivel ${formatNumber(m.disponivel)} ${m.unidade} | cobertura ${formatPercent(
        Math.min(m.cobertura, 1),
      )} (${m.status})${valor}`;
    });
    secoes.push({
      id: "atendimento_demanda",
      titulo: "Atendimento a demanda do edital",
      conteudo: `${prontidao.produtosAtendidos} de ${prontidao.produtosTotal} produto(s) do edital sao atendidos integralmente pela producao registrada (cobertura media de ${formatPercent(
        prontidao.coberturaMedia,
      )}).\n\n${linhas.join("\n")}`,
    });
  } else {
    secoes.push({
      id: "atendimento_demanda",
      titulo: "Atendimento a demanda do edital",
      conteudo:
        "O edital nao informou a lista de produtos/quantidades solicitados. " +
        "Use o resumo de capacidade de producao acima para preencher manualmente o projeto de venda. " +
        "Quando os produtos do edital forem cadastrados, este relatorio passara a cruzar producao x demanda automaticamente.",
    });
  }

  // 4. Recomendações de organização (apoio, não decisão)
  const recomendacoes: string[] = [];
  const gaps = matching.filter((m) => m.status !== "atende");
  if (gaps.length > 0) {
    recomendacoes.push(
      `Priorize organizar a producao/coleta dos produtos com lacuna: ${gaps
        .map((m) => m.produto)
        .join(", ")}.`,
    );
  }
  const surplus = matching.filter((m) => m.surplus > 0);
  if (surplus.length > 0) {
    recomendacoes.push(
      `Ha excedente em ${surplus
        .map((m) => m.produto)
        .join(", ")} — avalie direcionar a outros editais ou canais de venda.`,
    );
  }
  if (producao.associadosUnicos <= 1 && producao.quantidadeTotal > 0) {
    recomendacoes.push(
      "A producao esta concentrada em poucos associados — engajar mais membros reduz risco de nao atendimento.",
    );
  }
  recomendacoes.push(
    "Confira documentacao (DAP/CAF, alvara sanitario, notas fiscais) antes de submeter — este relatorio cobre apenas os dados de producao.",
  );
  secoes.push({
    id: "recomendacoes_organizacao",
    titulo: "Recomendacoes de organizacao (apoio)",
    conteudo: recomendacoes.map((r) => `- ${r}`).join("\n"),
  });

  return secoes;
}

function buildResumoExecutivo(
  snapshot: PnaeReportSnapshot,
  matching: PnaeMatchItem[],
  prontidao: PnaeReportResponse["prontidao"],
): string {
  const { edital, producao } = snapshot;
  const nivelTexto: Record<PnaeProntidaoNivel, string> = {
    alta: "alta — a producao registrada cobre a maior parte da demanda",
    media: "media — parte da demanda e atendida, ha lacunas a organizar",
    baixa: "baixa — a producao registrada ainda nao cobre a demanda",
  };

  if (matching.length === 0) {
    return (
      `Relatorio de apoio ao edital "${edital.titulo}". ` +
      `No periodo analisado a associacao registrou ${formatNumber(
        producao.quantidadeTotal,
      )} de producao, em ${producao.culturasUnicas} cultura(s) e ${producao.associadosUnicos} associado(s). ` +
      `O edital nao trouxe a lista de produtos solicitados, entao este relatorio organiza os dados de producao para preenchimento manual do projeto de venda.`
    );
  }

  return (
    `Relatorio de apoio ao edital "${edital.titulo}". ` +
    `Prontidao ${nivelTexto[prontidao.nivel]} (cobertura media de ${formatPercent(
      prontidao.coberturaMedia,
    )}). ` +
    `${prontidao.produtosAtendidos} de ${prontidao.produtosTotal} produto(s) sao atendidos integralmente pela producao de ${formatNumber(
      producao.quantidadeTotal,
    )} registrada no periodo. ` +
    `Este material e um apoio a decisao — a conferencia final e a submissao sao responsabilidade da associacao.`
  );
}

function buildTextoRelatorio(
  resumoExecutivo: string,
  secoes: PnaeReportSection[],
  alertas: string[],
): string {
  const partes: string[] = [
    "RELATORIO DE APOIO PNAE",
    "",
    "RESUMO EXECUTIVO",
    resumoExecutivo,
  ];

  for (const secao of secoes) {
    partes.push("", secao.titulo.toUpperCase(), secao.conteudo);
  }

  if (alertas.length > 0) {
    partes.push(
      "",
      "ALERTAS",
      ...alertas.map((a) => `- ${a}`),
    );
  }

  partes.push(
    "",
    "---",
    "Gerado automaticamente como apoio. Revise antes de submeter; a decisao final e da associacao.",
  );

  return partes.join("\n");
}

export function generatePnaeReport(
  snapshot: PnaeReportSnapshot,
): PnaeReportResponse {
  const matching = buildMatching(snapshot);
  const prontidao = computeProntidao(snapshot, matching);
  const alertas = buildAlertas(snapshot, matching);
  const secoes = buildSecoes(snapshot, matching, prontidao);
  const resumoExecutivo = buildResumoExecutivo(snapshot, matching, prontidao);
  const textoRelatorio = buildTextoRelatorio(resumoExecutivo, secoes, alertas);

  return {
    associacaoId: snapshot.associacaoId,
    generatedAt: new Date().toISOString(),
    edital: { id: snapshot.edital.id, titulo: snapshot.edital.titulo },
    resumoExecutivo,
    prontidao,
    matching,
    secoes,
    alertas,
    textoRelatorio,
  };
}
