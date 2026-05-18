import api from "@/lib/api";

// ── Tipos: Insights Financeiros (IA-01) ───────────────────────────────────────

export type InsightSeverity = "info" | "alerta" | "critico";

export type InsightCategory =
  | "tendencia_saldo"
  | "maior_gasto"
  | "inadimplencia"
  | "fluxo_caixa"
  | "geral";

export interface Insight {
  id: string;
  categoria: InsightCategory;
  severidade: InsightSeverity;
  titulo: string;
  mensagem: string;
}

export interface InsightsResponse {
  associacaoId: string;
  generatedAt: string;
  insights: Insight[];
}

// ── Tipos: Sugestões de Ação (IA-03) ─────────────────────────────────────────

export type SuggestionArea =
  | "financeiro"
  | "mensalidades"
  | "producao"
  | "pnae"
  | "geral";

export type SuggestionPriority = "alta" | "media" | "baixa";

export interface ActionSuggestion {
  id: string;
  area: SuggestionArea;
  prioridade: SuggestionPriority;
  titulo: string;
  recomendacao: string;
  justificativa: string;
  apoio: true;
}

export interface SuggestionsResponse {
  associacaoId: string;
  generatedAt: string;
  aviso: string;
  sugestoes: ActionSuggestion[];
}

// ── Fetchers ──────────────────────────────────────────────────────────────────

export async function fetchInsights(
  associacaoId: string,
): Promise<InsightsResponse> {
  const res = await api.get<InsightsResponse>("/insights", {
    params: { associacao_id: associacaoId },
  });
  return res.data;
}

export async function fetchSuggestions(
  associacaoId: string,
): Promise<SuggestionsResponse> {
  const res = await api.get<SuggestionsResponse>("/suggestions", {
    params: { associacao_id: associacaoId },
  });
  return res.data;
}
