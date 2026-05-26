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

export interface ProducaoSummary {
  totalColheitas: number;
  totalKg: number;
  porCultura: Record<string, number>;
  porMes: Array<{ month: string; quantidade: number; colheitas: number }>;
}

export interface AreaPlantadaSummary {
  totalRegistros: number;
  totalHa: number;
  associadosUnicos: number;
  culturasUnicas: number;
  porCultura: Array<{ cultura: string; totalHa: number; registros: number }>;
  porAssociado: Array<{ associadoId: string; totalHa: number; registros: number }>;
}

export interface FinancialSnapshot {
  associacaoId: string;
  generatedAt: string;
  saldoAtual: number;
  totalEntradas: number;
  totalSaidas: number;
  porMes: MonthlyAggregate[];
  porTipoSaida: Record<string, number>;
  porTipoEntrada: Record<string, number>;
  mensalidades: MensalidadeSummary;
  producao?: ProducaoSummary;
  areaPlantada?: AreaPlantadaSummary;
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

// ── IA-02: Apoio na geração de relatórios PNAE ───────────────────────────────
// Recebe dados de produção já agregados pelo backend + a demanda do edital e
// devolve o material organizado em linguagem compreensível para o relatório.

/** Um produto solicitado no edital PNAE (demanda). */
export interface PnaeProdutoDemanda {
  produto: string;
  quantidade: number;
  unidade?: string;
  precoReferencia?: number;
}

/** Produção agregada por cultura (espelha relatorios.service.ts → porCultura). */
export interface PnaeProducaoItem {
  cultura: string;
  quantidadeTotal: number;
  registros: number;
  associados?: number;
}

export interface PnaeReportSnapshot {
  associacaoId: string;
  generatedAt: string;
  edital: {
    id: string;
    titulo: string;
    numeroEdital?: string | null;
    orgaoResponsavel?: string | null;
    municipio?: string | null;
    estado?: string | null;
    dataLimite: string;
    valorTotalEstimado?: number | null;
    status?: string;
    produtos?: PnaeProdutoDemanda[];
  };
  periodo: { inicio: string; fim: string };
  producao: {
    quantidadeTotal: number;
    totalRegistros: number;
    associadosUnicos: number;
    culturasUnicas: number;
    porCultura: PnaeProducaoItem[];
  };
}

export type PnaeMatchStatus = "atende" | "parcial" | "sem_producao";

export interface PnaeMatchItem {
  produto: string;
  unidade: string;
  demanda: number;
  disponivel: number;
  cobertura: number;
  status: PnaeMatchStatus;
  gap: number;
  surplus: number;
  valorEstimado: number | null;
  mensagem: string;
}

export interface PnaeReportSection {
  id: string;
  titulo: string;
  conteudo: string;
}

export type PnaeProntidaoNivel = "alta" | "media" | "baixa";

export interface PnaeReportResponse {
  associacaoId: string;
  generatedAt: string;
  edital: { id: string; titulo: string };
  resumoExecutivo: string;
  prontidao: {
    nivel: PnaeProntidaoNivel;
    coberturaMedia: number;
    produtosAtendidos: number;
    produtosTotal: number;
  };
  matching: PnaeMatchItem[];
  secoes: PnaeReportSection[];
  alertas: string[];
  textoRelatorio: string;
}

// ── IA-03: Sugestões de ação (sempre como apoio, nunca decisão automática) ────

export interface ProducaoSnapshot {
  quantidadeTotal: number;
  totalRegistros: number;
  associadosUnicos: number;
  culturasUnicas: number;
  porCultura: { cultura: string; quantidadeTotal: number; registros: number }[];
  porMes: { mes: string; quantidadeTotal: number; registros: number }[];
}

export interface SuggestionsSnapshot {
  associacaoId: string;
  generatedAt: string;
  financeiro: FinancialSnapshot;
  producao?: ProducaoSnapshot;
  areaPlantada?: AreaPlantadaSummary;
  editaisAbertos?: number;
}

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
  /** Sempre `true`: a sugestão é apoio à decisão, nunca decisão automática. */
  apoio: true;
}

export interface SuggestionsResponse {
  associacaoId: string;
  generatedAt: string;
  /** Aviso explícito de que a decisão final é sempre da associação. */
  aviso: string;
  sugestoes: ActionSuggestion[];
}
