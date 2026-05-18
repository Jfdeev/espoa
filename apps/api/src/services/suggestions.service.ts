/**
 * IA-03 — Sugestões de ação (lado API).
 *
 * Consolida o snapshot financeiro (reaproveitando `buildFinancialSnapshot` de
 * IA-01), a produção agregada e a contagem de editais abertos, e delega ao
 * microsserviço de IA (`POST /suggestions`). Toda saída é apoio à decisão —
 * nunca decisão automática (garantido pelo `apps/ai`).
 */
import { buildFinancialSnapshot } from "./insights.service";
import type { FinancialSnapshot } from "./insights.service";
import { getRelatorioProducao } from "./relatorios.service";
import { listEditaisPnae } from "./edital-pnae.service";
import { callAiService } from "./ai-client";
import type { ResolvedPeriod } from "../utils/period";

interface SuggestionsSnapshot {
  associacaoId: string;
  generatedAt: string;
  financeiro: FinancialSnapshot;
  producao: {
    quantidadeTotal: number;
    totalRegistros: number;
    associadosUnicos: number;
    culturasUnicas: number;
    porCultura: { cultura: string; quantidadeTotal: number; registros: number }[];
    porMes: { mes: string; quantidadeTotal: number; registros: number }[];
  };
  editaisAbertos: number;
}

interface SuggestionsResponse {
  associacaoId: string;
  generatedAt: string;
  aviso: string;
  sugestoes: {
    id: string;
    area: string;
    prioridade: string;
    titulo: string;
    recomendacao: string;
    justificativa: string;
    apoio: true;
  }[];
}

export async function getSuggestions({
  associacaoId,
  periodo,
  userId,
}: {
  associacaoId: string;
  periodo: ResolvedPeriod;
  userId: string;
}): Promise<SuggestionsResponse & { snapshot: SuggestionsSnapshot }> {
  const [financeiro, producaoRel, editaisAbertos] = await Promise.all([
    // Snapshot financeiro all-time, igual ao usado por `getInsights` (IA-01).
    buildFinancialSnapshot(associacaoId),
    getRelatorioProducao({ associacaoId, periodo, userId }),
    listEditaisPnae({ associacaoId, status: "aberto" }),
  ]);

  const snapshot: SuggestionsSnapshot = {
    associacaoId,
    generatedAt: new Date().toISOString(),
    financeiro,
    producao: {
      quantidadeTotal: producaoRel.resumo.quantidadeTotal,
      totalRegistros: producaoRel.resumo.totalRegistros,
      associadosUnicos: producaoRel.resumo.associadosUnicos,
      culturasUnicas: producaoRel.resumo.culturasUnicas,
      porCultura: producaoRel.agregacoes.porCultura,
      porMes: producaoRel.agregacoes.porMes,
    },
    editaisAbertos: editaisAbertos.length,
  };

  const result = await callAiService<SuggestionsResponse>(
    "/suggestions",
    snapshot,
  );

  return { ...result, snapshot };
}
