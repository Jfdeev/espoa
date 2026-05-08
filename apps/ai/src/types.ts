export interface MonthlyAggregate {
  month: string;
  entradas: number;
  saidas: number;
  saldo: number;
}

export interface MensalidadeSummary {
  totalAssociadosAtivos: number;
  pagas: number;
  pendentes: number;
  valorRecebido: number;
  valorEsperado: number;
  taxaInadimplencia: number;
}

export interface FinancialSnapshot {
  associacaoId: string;
  generatedAt: string;
  saldoAtual: number;
  totalEntradas: number;
  totalSaidas: number;
  porMes: MonthlyAggregate[];
  porTipoSaida: Record<string, number>;
  mensalidades: MensalidadeSummary;
}

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
