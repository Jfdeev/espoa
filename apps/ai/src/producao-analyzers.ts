import type { FinancialSnapshot, Insight, ProducaoSummary } from "./types";

export function analyzeProducaoResumo(snapshot: FinancialSnapshot): Insight | null {
  const p = snapshot.producao;
  if (!p || p.totalColheitas === 0) return null;

  const culturas = Object.keys(p.porCultura).length;

  return {
    id: "producao_resumo",
    categoria: "geral",
    severidade: "info",
    titulo: "Resumo da producao",
    mensagem: `${p.totalColheitas} colheitas registradas totalizando ${formatKg(p.totalKg)} em ${culturas} cultura${culturas > 1 ? "s" : ""} diferente${culturas > 1 ? "s" : ""}.`,
  };
}

export function analyzeProducaoConcentracao(snapshot: FinancialSnapshot): Insight | null {
  const p = snapshot.producao;
  if (!p || Object.keys(p.porCultura).length < 2) return null;

  const culturas = Object.entries(p.porCultura).sort(([, a], [, b]) => b - a);
  const [topCultura, topKg] = culturas[0];
  const participacao = (topKg / p.totalKg) * 100;

  if (participacao < 50) return null;

  return {
    id: "producao_concentracao",
    categoria: "geral",
    severidade: participacao > 80 ? "alerta" : "info",
    titulo: `Producao concentrada em "${capitalize(topCultura)}"`,
    mensagem: `${participacao.toFixed(0)}% da producao total (${formatKg(topKg)}) vem de "${capitalize(topCultura)}". ${participacao > 80 ? "Considere diversificar para reduzir riscos." : "Monitore a diversificacao."}`,
  };
}

export function analyzeProducaoTendencia(snapshot: FinancialSnapshot): Insight | null {
  const p = snapshot.producao;
  if (!p || p.porMes.length < 2) return null;

  const meses = p.porMes.slice(-3);
  if (meses.length < 2) return null;

  const quantidades = meses.map((m) => m.quantidade);
  const subindo = quantidades.every((q, i) => i === 0 || q >= quantidades[i - 1]);
  const caindo = quantidades.every((q, i) => i === 0 || q <= quantidades[i - 1]);

  const primeiro = quantidades[0];
  const ultimo = quantidades[quantidades.length - 1];

  if (subindo && ultimo > primeiro) {
    const variacao = ((ultimo - primeiro) / primeiro) * 100;
    return {
      id: "producao_tendencia_positiva",
      categoria: "geral",
      severidade: "info",
      titulo: "Producao em crescimento",
      mensagem: `Nos ultimos ${meses.length} meses a producao cresceu ${variacao.toFixed(0)}%, de ${formatKg(primeiro)} para ${formatKg(ultimo)}.`,
    };
  }

  if (caindo && ultimo < primeiro && primeiro > 0) {
    const variacao = ((primeiro - ultimo) / primeiro) * 100;
    return {
      id: "producao_tendencia_negativa",
      categoria: "geral",
      severidade: "alerta",
      titulo: "Producao em queda",
      mensagem: `A producao caiu ${variacao.toFixed(0)}% nos ultimos ${meses.length} meses (de ${formatKg(primeiro)} para ${formatKg(ultimo)}). Verifique possiveis causas.`,
    };
  }

  return null;
}

export function analyzeProducaoSazonalidade(snapshot: FinancialSnapshot): Insight | null {
  const p = snapshot.producao;
  if (!p || p.porMes.length < 3) return null;

  const media = p.totalKg / p.porMes.length;
  const melhorMes = p.porMes.reduce((acc, m) => m.quantidade > acc.quantidade ? m : acc);

  if (melhorMes.quantidade <= media * 1.5) return null;

  return {
    id: "producao_sazonalidade",
    categoria: "geral",
    severidade: "info",
    titulo: `Pico de producao em ${formatMonth(melhorMes.month)}`,
    mensagem: `O mes de ${formatMonth(melhorMes.month)} teve ${formatKg(melhorMes.quantidade)}, ${((melhorMes.quantidade / media - 1) * 100).toFixed(0)}% acima da media mensal. Planeje logistica e escoamento para esses periodos.`,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatKg(value: number): string {
  return value.toLocaleString("pt-BR") + " kg";
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatMonth(monthIso: string): string {
  const [year, month] = monthIso.split("-");
  const meses = [
    "janeiro", "fevereiro", "marco", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
  ];
  const idx = Number(month) - 1;
  if (idx < 0 || idx > 11) return monthIso;
  return `${meses[idx]}/${year}`;
}
