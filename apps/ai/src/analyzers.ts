import type { FinancialSnapshot, Insight } from "./types";
import {
  analyzeProducaoResumo,
  analyzeProducaoConcentracao,
  analyzeProducaoTendencia,
  analyzeProducaoSazonalidade,
} from "./producao-analyzers";

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatMonth(monthIso: string): string {
  const [year, month] = monthIso.split("-");
  const meses = [
    "janeiro",
    "fevereiro",
    "marco",
    "abril",
    "maio",
    "junho",
    "julho",
    "agosto",
    "setembro",
    "outubro",
    "novembro",
    "dezembro",
  ];
  const idx = Number(month) - 1;
  if (idx < 0 || idx > 11) return monthIso;
  return `${meses[idx]} de ${year}`;
}

export function analyzeSaldoTrend(snapshot: FinancialSnapshot): Insight | null {
  const meses = snapshot.porMes;
  if (meses.length < 2) return null;

  const ultimos = meses.slice(-3);
  const saldos = ultimos.map((m) => m.saldo);

  const subindo = saldos.every((s, i) => i === 0 || s >= saldos[i - 1]);
  const caindo = saldos.every((s, i) => i === 0 || s <= saldos[i - 1]);

  const primeiro = saldos[0];
  const ultimo = saldos[saldos.length - 1];
  const variacao = ultimo - primeiro;

  if (subindo && variacao > 0) {
    return {
      id: "tendencia_saldo_positiva",
      categoria: "tendencia_saldo",
      severidade: "info",
      titulo: "Saldo em crescimento",
      mensagem: `Nos ultimos ${ultimos.length} meses o saldo subiu ${formatCurrency(
        variacao,
      )}. Continue acompanhando os recebimentos para manter a tendencia.`,
    };
  }

  if (caindo && variacao < 0) {
    return {
      id: "tendencia_saldo_negativa",
      categoria: "tendencia_saldo",
      severidade: "alerta",
      titulo: "Saldo em queda",
      mensagem: `O saldo caiu ${formatCurrency(
        Math.abs(variacao),
      )} nos ultimos ${ultimos.length} meses. Vale revisar despesas recorrentes.`,
    };
  }

  return {
    id: "tendencia_saldo_estavel",
    categoria: "tendencia_saldo",
    severidade: "info",
    titulo: "Saldo estavel",
    mensagem: `O saldo nao apresentou tendencia clara nos ultimos ${ultimos.length} meses (${formatCurrency(
      ultimo,
    )} no ultimo periodo).`,
  };
}

export function analyzeMaiorGasto(
  snapshot: FinancialSnapshot,
): Insight | null {
  const meses = snapshot.porMes;
  if (meses.length === 0) return null;

  const maior = meses.reduce((acc, cur) => (cur.saidas > acc.saidas ? cur : acc));
  if (maior.saidas <= 0) return null;

  const mediaSaidas =
    meses.reduce((sum, m) => sum + m.saidas, 0) / meses.length;
  const acimaDaMedia = mediaSaidas > 0 ? (maior.saidas / mediaSaidas - 1) * 100 : 0;

  return {
    id: "maior_gasto_mes",
    categoria: "maior_gasto",
    severidade: acimaDaMedia > 50 ? "alerta" : "info",
    titulo: `Maior gasto em ${formatMonth(maior.month)}`,
    mensagem: `O mes de ${formatMonth(maior.month)} concentrou ${formatCurrency(
      maior.saidas,
    )} em saidas${
      acimaDaMedia > 0
        ? `, ${acimaDaMedia.toFixed(0)}% acima da media dos demais meses`
        : ""
    }.`,
  };
}

export function analyzeTipoGastoDominante(
  snapshot: FinancialSnapshot,
): Insight | null {
  const tipos = Object.entries(snapshot.porTipoSaida);
  if (tipos.length === 0) return null;

  const total = tipos.reduce((sum, [, v]) => sum + v, 0);
  if (total <= 0) return null;

  tipos.sort(([, a], [, b]) => b - a);
  const [tipoTop, valorTop] = tipos[0];
  const participacao = (valorTop / total) * 100;

  if (participacao < 40) return null;

  return {
    id: "tipo_gasto_dominante",
    categoria: "fluxo_caixa",
    severidade: participacao > 70 ? "alerta" : "info",
    titulo: `"${tipoTop}" concentra os gastos`,
    mensagem: `${participacao.toFixed(
      0,
    )}% das saidas foram com "${tipoTop}" (${formatCurrency(
      valorTop,
    )}). Considere revisar se esse gasto esta proporcional.`,
  };
}

export function analyzeFonteReceitaDominante(
  snapshot: FinancialSnapshot,
): Insight | null {
  const tipos = Object.entries(snapshot.porTipoEntrada ?? {});
  if (tipos.length === 0) return null;

  const total = tipos.reduce((sum, [, v]) => sum + v, 0);
  if (total <= 0) return null;

  tipos.sort(([, a], [, b]) => b - a);
  const [tipoTop, valorTop] = tipos[0];
  const participacao = (valorTop / total) * 100;

  if (participacao < 50) return null;

  return {
    id: "fonte_receita_dominante",
    categoria: "fluxo_caixa",
    severidade: participacao > 80 ? "alerta" : "info",
    titulo: `Receita concentrada em "${tipoTop}"`,
    mensagem: `${participacao.toFixed(
      0,
    )}% das entradas vieram de "${tipoTop}" (${formatCurrency(
      valorTop,
    )}). Alta dependencia de uma unica fonte de receita.`,
  };
}

export function analyzeInadimplencia(
  snapshot: FinancialSnapshot,
): Insight | null {
  const m = snapshot.mensalidades;
  if (m.totalAssociadosAtivos === 0) return null;

  const taxa = m.taxaInadimplencia;
  const valorEmAberto = m.valorEsperado - m.valorRecebido;

  if (taxa >= 0.4) {
    return {
      id: "risco_inadimplencia_alto",
      categoria: "inadimplencia",
      severidade: "critico",
      titulo: "Risco alto de inadimplencia",
      mensagem: `${m.pendentes} mensalidades estao em aberto (${(taxa * 100).toFixed(
        0,
      )}% do total). Valor estimado a receber: ${formatCurrency(valorEmAberto)}.`,
    };
  }

  if (taxa >= 0.2) {
    return {
      id: "risco_inadimplencia_medio",
      categoria: "inadimplencia",
      severidade: "alerta",
      titulo: "Inadimplencia em atencao",
      mensagem: `${(taxa * 100).toFixed(
        0,
      )}% das mensalidades estao pendentes. Acompanhe os ${m.pendentes} associados em atraso.`,
    };
  }

  if (m.pagas > 0) {
    return {
      id: "inadimplencia_sob_controle",
      categoria: "inadimplencia",
      severidade: "info",
      titulo: "Inadimplencia sob controle",
      mensagem: `${(taxa * 100).toFixed(
        0,
      )}% de mensalidades pendentes. ${m.pagas} pagamentos confirmados ate agora.`,
    };
  }

  return null;
}

export function analyzeSaldoNegativo(
  snapshot: FinancialSnapshot,
): Insight | null {
  if (snapshot.saldoAtual >= 0) return null;
  return {
    id: "saldo_negativo",
    categoria: "fluxo_caixa",
    severidade: "critico",
    titulo: "Saldo no negativo",
    mensagem: `O saldo atual da associacao esta em ${formatCurrency(
      snapshot.saldoAtual,
    )}. Priorize cobranca de mensalidades pendentes e reveja saidas.`,
  };
}

export function analyzeResumo(snapshot: FinancialSnapshot): Insight {
  return {
    id: "resumo_geral",
    categoria: "geral",
    severidade: "info",
    titulo: "Resumo financeiro",
    mensagem: `Entradas totais: ${formatCurrency(
      snapshot.totalEntradas,
    )}. Saidas totais: ${formatCurrency(
      snapshot.totalSaidas,
    )}. Saldo atual: ${formatCurrency(snapshot.saldoAtual)}.`,
  };
}

export function generateInsights(snapshot: FinancialSnapshot): Insight[] {
  const candidatos = [
    analyzeResumo(snapshot),
    analyzeSaldoNegativo(snapshot),
    analyzeSaldoTrend(snapshot),
    analyzeMaiorGasto(snapshot),
    analyzeTipoGastoDominante(snapshot),
    analyzeFonteReceitaDominante(snapshot),
    analyzeInadimplencia(snapshot),
    analyzeProducaoResumo(snapshot),
    analyzeProducaoConcentracao(snapshot),
    analyzeProducaoTendencia(snapshot),
    analyzeProducaoSazonalidade(snapshot),
  ];
  return candidatos.filter((c): c is Insight => c !== null);
}
