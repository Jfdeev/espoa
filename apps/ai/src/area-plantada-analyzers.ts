// Analisadores de área plantada para os insights IA-01.
//
// Recebem o FinancialSnapshot (que inclui `areaPlantada?`) e retornam
// Insights determinísticos — sem LLM, mesma arquitetura dos outros analyzers.

import type { AreaPlantadaSummary, FinancialSnapshot, Insight } from "./types";

function formatHa(ha: number): string {
  return ha.toLocaleString("pt-BR", { maximumFractionDigits: 2 }) + " ha";
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Retorna o sumário de área plantada ou null se não houver dados. */
function getArea(snapshot: FinancialSnapshot): AreaPlantadaSummary | null {
  const a = snapshot.areaPlantada;
  if (!a || a.totalRegistros === 0 || a.totalHa <= 0) return null;
  return a;
}

/**
 * Insight de resumo: quantos hectares, quantas culturas, quantos produtores.
 */
export function analyzeAreaPlantadaResumo(snapshot: FinancialSnapshot): Insight | null {
  const a = getArea(snapshot);
  if (!a) return null;

  const culturas = a.culturasUnicas;
  const produtores = a.associadosUnicos;

  return {
    id: "area_plantada_resumo",
    categoria: "geral",
    severidade: "info",
    titulo: "Resumo da area plantada",
    mensagem: `${formatHa(a.totalHa)} de area plantada registrados em ${culturas} cultura${culturas > 1 ? "s" : ""} por ${produtores} produtor${produtores > 1 ? "es" : ""}.`,
  };
}

/**
 * Concentracao: alerta quando >70% da area esta em uma unica cultura.
 */
export function analyzeAreaPlantadaConcentracao(snapshot: FinancialSnapshot): Insight | null {
  const a = getArea(snapshot);
  if (!a || a.porCultura.length < 2) return null;

  const top = [...a.porCultura].sort((x, y) => y.totalHa - x.totalHa)[0];
  const participacao = top.totalHa / a.totalHa;
  if (participacao < 0.5) return null;

  return {
    id: "area_plantada_concentracao",
    categoria: "geral",
    severidade: participacao > 0.8 ? "alerta" : "info",
    titulo: `Area concentrada em "${capitalize(top.cultura)}"`,
    mensagem: `${(participacao * 100).toFixed(0)}% da area registrada (${formatHa(top.totalHa)}) e de "${capitalize(top.cultura)}". ${participacao > 0.8 ? "Considere diversificar para reduzir riscos climaticos e de mercado." : "Monitore a diversificacao das culturas."}`,
  };
}

/**
 * Cross-analise: area plantada registrada mas sem colheitas correspondentes
 * na mesma cultura — pode indicar producao nao registrada ou perda de safra.
 */
export function analyzeAreaPlantadaVsColheita(snapshot: FinancialSnapshot): Insight | null {
  const a = getArea(snapshot);
  if (!a) return null;

  const p = snapshot.producao;
  if (!p || p.totalColheitas === 0) {
    // Tem area plantada mas nenhuma colheita registrada
    return {
      id: "area_plantada_sem_colheita",
      categoria: "geral",
      severidade: "alerta",
      titulo: "Area plantada sem colheitas registradas",
      mensagem: `Ha ${formatHa(a.totalHa)} de area plantada registrados, mas nenhuma colheita foi lancada. Considere registrar as colheitas para manter os dados de producao atualizados.`,
    };
  }

  // Culturas com area mas sem colheita registrada
  const culturasComColheita = new Set(
    Object.keys(p.porCultura).map((c) => c.trim().toLowerCase()),
  );
  const culturasComArea = a.porCultura.filter(
    (c) => !culturasComColheita.has(c.cultura.trim().toLowerCase()),
  );

  if (culturasComArea.length === 0) return null;

  const nomes = culturasComArea.map((c) => capitalize(c.cultura)).join(", ");
  return {
    id: "area_plantada_cultura_sem_colheita",
    categoria: "geral",
    severidade: "info",
    titulo: `${culturasComArea.length > 1 ? "Culturas com" : "Cultura com"} area mas sem colheita`,
    mensagem: `${nomes} ${culturasComArea.length > 1 ? "teem" : "tem"} area registrada mas nenhuma colheita lancada. Verifique se a producao foi registrada corretamente.`,
  };
}
