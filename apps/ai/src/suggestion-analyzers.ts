// IA-03 — Sugestões de ação.
//
// Recomendações de ajustes na gestão financeira e na organização da produção.
// SEMPRE como apoio à decisão, NUNCA decisão automática: cada sugestão carrega
// `apoio: true` + justificativa, e a resposta inclui um aviso explícito de que
// a decisão final é da associação. Determinístico, sem LLM (padrão IA-01).

import { formatCurrency, formatNumber, formatPercent } from "./format";
import type {
  ActionSuggestion,
  SuggestionsResponse,
  SuggestionsSnapshot,
} from "./types";

const AVISO =
  "Estas sao sugestoes de apoio geradas a partir dos seus dados. Elas nao executam nenhuma acao: a analise e a decisao final sao sempre da associacao.";

type Rule = (s: SuggestionsSnapshot) => ActionSuggestion | null;

// ── Financeiro ───────────────────────────────────────────────────────────────

const saldoNegativo: Rule = (s) => {
  const { saldoAtual } = s.financeiro;
  if (saldoAtual >= 0) return null;
  return {
    id: "fin_saldo_negativo",
    area: "financeiro",
    prioridade: "alta",
    titulo: "Recompor o caixa",
    recomendacao:
      "Considere priorizar a cobranca de mensalidades em aberto e adiar saidas nao essenciais ate o saldo voltar ao positivo.",
    justificativa: `O saldo atual esta negativo em ${formatCurrency(
      Math.abs(saldoAtual),
    )}.`,
    apoio: true,
  };
};

const gastoConcentrado: Rule = (s) => {
  const tipos = Object.entries(s.financeiro.porTipoSaida);
  if (tipos.length === 0) return null;
  const total = tipos.reduce((sum, [, v]) => sum + v, 0);
  if (total <= 0) return null;
  tipos.sort(([, a], [, b]) => b - a);
  const [tipoTop, valorTop] = tipos[0];
  const participacao = valorTop / total;
  if (participacao <= 0.5) return null;
  return {
    id: "fin_gasto_concentrado",
    area: "financeiro",
    prioridade: participacao >= 0.7 ? "alta" : "media",
    titulo: `Revisar gastos com "${tipoTop}"`,
    recomendacao: `Avalie renegociar ou buscar alternativas para a categoria "${tipoTop}" e distribuir melhor o orcamento entre as demais categorias.`,
    justificativa: `A categoria "${tipoTop}" concentra ${formatPercent(
      participacao,
    )} das saidas (${formatCurrency(valorTop)} de ${formatCurrency(total)}).`,
    apoio: true,
  };
};

const saldoEmQueda: Rule = (s) => {
  const meses = s.financeiro.porMes;
  if (meses.length < 3) return null;
  const ultimos = meses.slice(-3);
  const caindo = ultimos.every(
    (m, i) => i === 0 || m.saldo <= ultimos[i - 1].saldo,
  );
  const variacao = ultimos[ultimos.length - 1].saldo - ultimos[0].saldo;
  if (!caindo || variacao >= 0 || s.financeiro.saldoAtual < 0) return null;
  return {
    id: "fin_saldo_em_queda",
    area: "financeiro",
    prioridade: "media",
    titulo: "Criar uma reserva",
    recomendacao:
      "Considere separar uma reserva mensal enquanto o saldo ainda esta positivo, para absorver meses de maior despesa.",
    justificativa: `O saldo caiu ${formatCurrency(
      Math.abs(variacao),
    )} nos ultimos 3 meses, mesmo ainda positivo.`,
    apoio: true,
  };
};

// ── Mensalidades ─────────────────────────────────────────────────────────────

const inadimplencia: Rule = (s) => {
  const m = s.financeiro.mensalidades;
  if (m.totalAssociadosAtivos === 0) return null;
  const taxa = m.taxaInadimplencia;
  const emAberto = m.valorEsperado - m.valorRecebido;
  if (taxa >= 0.4) {
    return {
      id: "mens_inadimplencia_alta",
      area: "mensalidades",
      prioridade: "alta",
      titulo: "Organizar uma rotina de cobranca",
      recomendacao:
        "Considere definir lembretes periodicos e um responsavel pela cobranca dos associados em atraso, comecando pelos maiores valores.",
      justificativa: `${formatPercent(
        taxa,
      )} das mensalidades estao pendentes (${m.pendentes} associado(s), cerca de ${formatCurrency(
        emAberto,
      )} a receber).`,
      apoio: true,
    };
  }
  if (taxa >= 0.2) {
    return {
      id: "mens_inadimplencia_media",
      area: "mensalidades",
      prioridade: "media",
      titulo: "Acompanhar a inadimplencia",
      recomendacao:
        "Considere enviar um lembrete amigavel aos associados com mensalidade pendente antes que o atraso aumente.",
      justificativa: `${formatPercent(taxa)} das mensalidades estao pendentes (${m.pendentes} associado(s)).`,
      apoio: true,
    };
  }
  return null;
};

// ── Produção ─────────────────────────────────────────────────────────────────

const producaoConcentrada: Rule = (s) => {
  const prod = s.producao;
  if (!prod || prod.quantidadeTotal <= 0 || prod.porCultura.length === 0) {
    return null;
  }
  const ordenado = [...prod.porCultura].sort(
    (a, b) => b.quantidadeTotal - a.quantidadeTotal,
  );
  const top = ordenado[0];
  const participacao = top.quantidadeTotal / prod.quantidadeTotal;
  if (prod.culturasUnicas > 2 && participacao < 0.7) return null;
  return {
    id: "prod_concentrada",
    area: "producao",
    prioridade: "media",
    titulo: "Avaliar diversificar a producao",
    recomendacao:
      "Considere estimular o registro/plantio de outras culturas — a diversificacao amplia as chances de atender editais variados e reduz risco de safra.",
    justificativa: `A cultura "${top.cultura}" representa ${formatPercent(
      participacao,
    )} da producao registrada, em apenas ${prod.culturasUnicas} cultura(s).`,
    apoio: true,
  };
};

const producaoPoucoEngajada: Rule = (s) => {
  const prod = s.producao;
  if (!prod || prod.quantidadeTotal <= 0) return null;
  if (prod.associadosUnicos > 2) return null;
  return {
    id: "prod_pouco_engajada",
    area: "producao",
    prioridade: "media",
    titulo: "Ampliar a participacao na producao",
    recomendacao:
      "Considere mobilizar mais associados a registrar producao — uma base maior da mais previsibilidade para participar de editais.",
    justificativa: `Apenas ${prod.associadosUnicos} associado(s) registraram producao no periodo.`,
    apoio: true,
  };
};

const producaoIntermitente: Rule = (s) => {
  const prod = s.producao;
  if (!prod || prod.porMes.length < 2) return null;
  const mesesSemProducao = prod.porMes.filter(
    (m) => m.quantidadeTotal <= 0,
  ).length;
  if (mesesSemProducao === 0) return null;
  return {
    id: "prod_intermitente",
    area: "producao",
    prioridade: "baixa",
    titulo: "Organizar um calendario de producao",
    recomendacao:
      "Considere registrar um calendario de plantio/colheita para distribuir melhor a producao ao longo dos meses.",
    justificativa: `Ha ${mesesSemProducao} mes(es) sem producao registrada no periodo analisado.`,
    apoio: true,
  };
};

// ── PNAE ─────────────────────────────────────────────────────────────────────

const pnaeSemProducao: Rule = (s) => {
  const abertos = s.editaisAbertos ?? 0;
  if (abertos <= 0) return null;
  const temProducao = (s.producao?.quantidadeTotal ?? 0) > 0;
  if (temProducao) return null;
  return {
    id: "pnae_sem_producao",
    area: "pnae",
    prioridade: "alta",
    titulo: "Registrar producao para os editais abertos",
    recomendacao:
      "Ha edital(is) aberto(s) mas nenhuma producao registrada. Considere registrar a producao dos associados para conseguir montar o projeto de venda a tempo.",
    justificativa: `${abertos} edital(is) PNAE aberto(s) e nenhuma producao registrada no periodo.`,
    apoio: true,
  };
};

// ── Geral ────────────────────────────────────────────────────────────────────

const tudoSobControle: Rule = (s) => {
  const f = s.financeiro;
  return {
    id: "geral_acompanhamento",
    area: "geral",
    prioridade: "baixa",
    titulo: "Manter o acompanhamento",
    recomendacao:
      "Continue registrando entradas, saidas e producao com regularidade — dados atualizados deixam estas sugestoes mais precisas.",
    justificativa: `Resumo atual: saldo ${formatCurrency(
      f.saldoAtual,
    )}, ${formatNumber(f.mensalidades.pagas)} mensalidade(s) paga(s) e ${formatNumber(
      f.mensalidades.pendentes,
    )} pendente(s).`,
    apoio: true,
  };
};

const RULES: Rule[] = [
  saldoNegativo,
  gastoConcentrado,
  saldoEmQueda,
  inadimplencia,
  producaoConcentrada,
  producaoPoucoEngajada,
  producaoIntermitente,
  pnaeSemProducao,
];

const PRIORIDADE_PESO: Record<ActionSuggestion["prioridade"], number> = {
  alta: 0,
  media: 1,
  baixa: 2,
};

export function generateSuggestions(
  snapshot: SuggestionsSnapshot,
): SuggestionsResponse {
  const sugestoes = RULES.map((rule) => rule(snapshot)).filter(
    (s): s is ActionSuggestion => s !== null,
  );

  // Sempre devolve ao menos a sugestão geral de acompanhamento.
  if (sugestoes.length === 0) {
    const geral = tudoSobControle(snapshot);
    if (geral) sugestoes.push(geral);
  }

  sugestoes.sort(
    (a, b) => PRIORIDADE_PESO[a.prioridade] - PRIORIDADE_PESO[b.prioridade],
  );

  return {
    associacaoId: snapshot.associacaoId,
    generatedAt: new Date().toISOString(),
    aviso: AVISO,
    sugestoes,
  };
}
