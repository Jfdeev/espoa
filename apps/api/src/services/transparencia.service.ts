import {
  db,
  transacaoFinanceira,
  mensalidade,
  usuarioAssociacao,
  associado,
} from "@espoa/database";
import { and, eq, gte, inArray, isNull, lte, or } from "drizzle-orm";
import type { ResolvedPeriod } from "../utils/period";

/**
 * Dados de transparência financeira para um membro da associação.
 *
 * Diferente de `/relatorios/financeiro` (admin), este endpoint:
 *  - Não expõe dados pessoais (nomes de fornecedores, contas, etc.)
 *  - Agrega despesas por `tipo` (categoria visível ao membro)
 *  - Inclui a contribuição pessoal do usuário (mensalidades pagas no período)
 */
export interface TransparenciaResult {
  meta: {
    associacaoId: string;
    periodo: ResolvedPeriod;
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

export async function getTransparencia(params: {
  userId: string;
  associacaoId: string;
  periodo: ResolvedPeriod;
}): Promise<TransparenciaResult> {
  const { userId, associacaoId, periodo } = params;

  const transacoes = await db
    .select({
      tipo: transacaoFinanceira.tipo,
      valor: transacaoFinanceira.valor,
      descricao: transacaoFinanceira.descricao,
      data: transacaoFinanceira.data,
    })
    .from(transacaoFinanceira)
    .where(
      and(
        eq(transacaoFinanceira.associacaoId, associacaoId),
        gte(transacaoFinanceira.data, periodo.inicio),
        lte(transacaoFinanceira.data, periodo.fim),
        isNull(transacaoFinanceira.deletedAt),
      ),
    );

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

  // Contribuição pessoal: cobre tanto o caminho atual (usuarioId direto)
  // quanto registros legados feitos pelo admin via associado vinculado ao usuário.
  const associadosDoUsuario = await db
    .select({ id: associado.id })
    .from(associado)
    .where(
      and(eq(associado.usuarioId, userId), isNull(associado.deletedAt)),
    );
  const associadoIds = associadosDoUsuario.map((a) => a.id);

  const ownershipCondition =
    associadoIds.length > 0
      ? or(
          eq(mensalidade.usuarioId, userId),
          inArray(mensalidade.associadoId, associadoIds),
        )
      : eq(mensalidade.usuarioId, userId);

  const minhasMensalidades = await db
    .select({
      valor: mensalidade.valor,
      dataPagamento: mensalidade.dataPagamento,
    })
    .from(mensalidade)
    .where(
      and(
        ownershipCondition,
        gte(mensalidade.dataPagamento, periodo.inicio),
        lte(mensalidade.dataPagamento, periodo.fim),
        isNull(mensalidade.deletedAt),
      ),
    );

  const suaContribuicao = minhasMensalidades.reduce(
    (acc, m) => acc + (Number(m.valor) || 0),
    0,
  );

  // Soma todas as entradas vindas de mensalidades (qualquer membro) para o cálculo de %
  // Aqui usamos totalArrecadado como denominador para refletir o quanto da arrecadação veio do usuário
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
      descricao: t.descricao,
      valor: Number(t.valor) || 0,
    }));

  return {
    meta: {
      associacaoId,
      periodo,
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

/**
 * Verifica se o usuário é membro ativo (qualquer role) da associação.
 * Necessário para liberar transparência apenas a quem pertence à associação.
 */
export async function isMembroAtivo(
  userId: string,
  associacaoId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: usuarioAssociacao.id })
    .from(usuarioAssociacao)
    .where(
      and(
        eq(usuarioAssociacao.usuarioId, userId),
        eq(usuarioAssociacao.associacaoId, associacaoId),
        eq(usuarioAssociacao.status, "ativo"),
      ),
    )
    .limit(1);
  return Boolean(row);
}

function normalizarCategoria(
  descricao: string | null,
  tipo: string,
): string {
  if (!descricao) return tipo === "despesa" ? "Outros" : tipo;
  const lower = descricao.toLowerCase();
  if (/material|insumo|semente|adubo/.test(lower)) return "Materiais e insumos";
  if (/manutenç|reparo|conserto/.test(lower)) return "Manutenção";
  if (/transport|frete|combust|gasolina/.test(lower)) return "Transporte";
  if (/administrat|cartór|imposto|tax/.test(lower)) return "Administrativo";
  if (/event|reuniã|alimentaç/.test(lower)) return "Eventos e reuniões";
  return "Outros";
}
