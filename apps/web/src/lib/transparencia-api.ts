import { db } from "@/database/db";
import { resolvePeriod } from "@/lib/period";
import { syncManager } from "@/sync/manager";
import { getDeviceId } from "@/lib/device-id";
import { isOnline } from "@/lib/network";
import { useAuthStore } from "@/store/auth.store";

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

/**
 * Porta da função do servidor (apps/api/src/services/transparencia.service.ts).
 * Mantém a mesma normalização para que o agrupamento seja consistente
 * com o que o admin enxerga em /relatorios.
 */
function normalizarCategoria(descricao: string | null | undefined, tipo: string): string {
  if (!descricao) return tipo === "despesa" ? "Outros" : tipo;
  const lower = descricao.toLowerCase();
  if (/material|insumo|semente|adubo/.test(lower)) return "Materiais e insumos";
  if (/manutenç|reparo|conserto/.test(lower)) return "Manutenção";
  if (/transport|frete|combust|gasolina/.test(lower)) return "Transporte";
  if (/administrat|cartór|imposto|tax/.test(lower)) return "Administrativo";
  if (/event|reuniã|alimentaç/.test(lower)) return "Eventos e reuniões";
  return "Outros";
}

/**
 * Calcula a transparência localmente a partir do Dexie. Funciona offline.
 *
 * Mantém o nome `fetchTransparencia` para compatibilidade com TransparenciaPage
 * (que originalmente chamava o endpoint /me/transparencia). Quando online,
 * dispara um sync em background para garantir dados frescos — a página re-renderiza
 * via re-fetch ao mudar periodo, mas o sync também atualiza o Dexie reativamente.
 */
export async function fetchTransparencia(params: {
  associacaoId: string;
  periodo?: TransparenciaPeriodo;
  inicio?: string;
  fim?: string;
}): Promise<TransparenciaResult> {
  // Refresh oportunista: dispara sync sem bloquear quando online.
  if (isOnline()) {
    syncManager.run(getDeviceId()).catch(() => {/* offline ou erro — Dexie tem o que tem */});
  }

  const periodo = resolvePeriod({
    periodo: params.periodo,
    inicio: params.inicio,
    fim: params.fim,
  });

  const userId = useAuthStore.getState().perfil?.id;

  // Best-effort UX guard: se o vínculo do usuário não está ativo localmente,
  // ainda retornamos o que está no Dexie (dados já estão no dispositivo de qualquer forma).
  // Segurança real fica no servidor — aqui é só consistência visual.

  // 1) Movimentações financeiras da associação no período
  const transacoes = await db.transacao_financeira
    .where("associacao_id")
    .equals(params.associacaoId)
    .filter(
      (t) =>
        !t.deleted_at &&
        t.data >= periodo.inicio &&
        t.data <= periodo.fim,
    )
    .toArray();

  let totalArrecadado = 0;
  let totalGasto = 0;
  const gastosPorCategoria = new Map<string, number>();
  const saidasOrdenadas: typeof transacoes = [];

  for (const t of transacoes) {
    const valor = Number(t.valor) || 0;
    if (t.tipo === "despesa") {
      totalGasto += valor;
      const categoria = normalizarCategoria(t.descricao, t.tipo);
      gastosPorCategoria.set(
        categoria,
        (gastosPorCategoria.get(categoria) ?? 0) + valor,
      );
      saidasOrdenadas.push(t);
    } else {
      totalArrecadado += valor;
    }
  }

  // 2) Contribuição pessoal do usuário (mensalidades pagas no período)
  let suaContribuicao = 0;
  if (userId) {
    const meusAssociados = await db.associado
      .filter((a) => !a.deleted_at && a.usuario_id === userId)
      .toArray();
    const associadoIds = new Set(meusAssociados.map((a) => a.id).filter(Boolean) as string[]);

    const minhasMensalidades = await db.mensalidade
      .filter((m) => {
        if (m.deleted_at) return false;
        if (!m.data_pagamento) return false;
        if (m.data_pagamento < periodo.inicio || m.data_pagamento > periodo.fim) return false;
        if (m.usuario_id === userId) return true;
        if (m.associado_id && associadoIds.has(m.associado_id)) return true;
        return false;
      })
      .toArray();

    suaContribuicao = minhasMensalidades.reduce(
      (acc, m) => acc + (Number(m.valor) || 0),
      0,
    );
  }

  const percentualContribuicao =
    totalArrecadado > 0
      ? Math.round((suaContribuicao / totalArrecadado) * 10000) / 100
      : 0;

  const distribuicaoGastos = [...gastosPorCategoria.entries()]
    .map(([categoria, total]) => ({
      categoria,
      total,
      percentual:
        totalGasto > 0
          ? Math.round((total / totalGasto) * 10000) / 100
          : 0,
    }))
    .sort((a, b) => b.total - a.total);

  const ultimasSaidas = saidasOrdenadas
    .sort((a, b) => (a.data < b.data ? 1 : -1))
    .slice(0, 10)
    .map((t) => ({
      data: t.data,
      categoria: normalizarCategoria(t.descricao, t.tipo),
      descricao: t.descricao ?? null,
      valor: Number(t.valor) || 0,
    }));

  return {
    meta: {
      associacaoId: params.associacaoId,
      periodo: {
        tipo: periodo.tipo,
        inicio: periodo.inicio,
        fim: periodo.fim,
      },
      geradoEm: new Date().toISOString(),
    },
    resumo: {
      totalArrecadado,
      totalGasto,
      saldoPeriodo: totalArrecadado - totalGasto,
      suaContribuicao,
      percentualContribuicao,
    },
    distribuicaoGastos,
    ultimasSaidas,
  };
}
