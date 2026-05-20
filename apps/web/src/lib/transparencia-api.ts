import api from "@/lib/api";

export type TransparenciaPeriodo =
  | "semanal"
  | "mensal"
  | "anual"
  | "personalizado";

export interface TransparenciaResult {
  meta: {
    associacaoId: string;
    periodo: { tipo: string; inicio: string; fim: string };
    geradoEm: string;
  };
  resumo: {
    totalArrecadado: number;
    totalGasto: number;
    saldoPeriodo: number;
    suaContribuicao: number;
    percentualContribuicao: number;
  };
  distribuicaoGastos: Array<{
    categoria: string;
    total: number;
    percentual: number;
  }>;
  ultimasSaidas: Array<{
    data: string;
    categoria: string;
    descricao: string | null;
    valor: number;
  }>;
}

export async function fetchTransparencia(params: {
  associacaoId: string;
  periodo?: TransparenciaPeriodo;
  inicio?: string;
  fim?: string;
}): Promise<TransparenciaResult> {
  const { data } = await api.get<TransparenciaResult>("/me/transparencia", {
    params: {
      associacao_id: params.associacaoId,
      periodo: params.periodo,
      inicio: params.inicio,
      fim: params.fim,
    },
  });
  return data;
}
