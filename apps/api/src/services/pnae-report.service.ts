/**
 * IA-02 — Apoio na geração de relatórios PNAE (lado API).
 *
 * Monta o snapshot a partir do edital + produção já agregada e delega a
 * organização/transformação ao microsserviço de IA (`POST /pnae-report`).
 * Espelha o fluxo de `getInsights` (IA-01): a API consolida os dados, o
 * `apps/ai` devolve o material compreensível.
 */
import { getEditalPnae } from "./edital-pnae.service";
import { getRelatorioProducao } from "./relatorios.service";
import { callAiService } from "./ai-client";
import type { ResolvedPeriod } from "../utils/period";

interface PnaeReportSnapshot {
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
    produtos: never[];
  };
  periodo: { inicio: string; fim: string };
  producao: {
    quantidadeTotal: number;
    totalRegistros: number;
    associadosUnicos: number;
    culturasUnicas: number;
    porCultura: { cultura: string; quantidadeTotal: number; registros: number }[];
  };
}

interface PnaeReportResponse {
  associacaoId: string;
  generatedAt: string;
  edital: { id: string; titulo: string };
  resumoExecutivo: string;
  prontidao: {
    nivel: "alta" | "media" | "baixa";
    coberturaMedia: number;
    produtosAtendidos: number;
    produtosTotal: number;
  };
  matching: unknown[];
  secoes: { id: string; titulo: string; conteudo: string }[];
  alertas: string[];
  textoRelatorio: string;
}

export async function getPnaeReport({
  associacaoId,
  editalId,
  periodo,
  userId,
}: {
  associacaoId: string;
  editalId: string;
  periodo: ResolvedPeriod;
  userId: string;
}): Promise<
  | { data: PnaeReportResponse & { snapshot: PnaeReportSnapshot } }
  | { error: "edital_nao_encontrado" }
> {
  const edital = await getEditalPnae(editalId);
  if (!edital || edital.associacaoId !== associacaoId) {
    return { error: "edital_nao_encontrado" };
  }

  const producaoRel = await getRelatorioProducao({
    associacaoId,
    periodo,
    userId,
  });

  const snapshot: PnaeReportSnapshot = {
    associacaoId,
    generatedAt: new Date().toISOString(),
    edital: {
      id: edital.id,
      titulo: edital.titulo,
      numeroEdital: edital.numeroEdital,
      orgaoResponsavel: edital.orgaoResponsavel,
      municipio: edital.municipio,
      estado: edital.estado,
      dataLimite: edital.dataLimite,
      valorTotalEstimado: edital.valorTotalEstimado,
      status: edital.status,
      // O schema atual de `edital_pnae` não tem produtos/quantidades.
      // O serviço de IA degrada graciosamente com a lista vazia.
      produtos: [],
    },
    periodo: { inicio: periodo.inicio, fim: periodo.fim },
    producao: {
      quantidadeTotal: producaoRel.resumo.quantidadeTotal,
      totalRegistros: producaoRel.resumo.totalRegistros,
      associadosUnicos: producaoRel.resumo.associadosUnicos,
      culturasUnicas: producaoRel.resumo.culturasUnicas,
      porCultura: producaoRel.agregacoes.porCultura,
    },
  };

  const report = await callAiService<PnaeReportResponse>(
    "/pnae-report",
    snapshot,
  );

  return { data: { ...report, snapshot } };
}
