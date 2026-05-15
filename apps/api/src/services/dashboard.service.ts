import { db, associado, mensalidade, transacaoFinanceira, usuarioAssociacao, usuario } from "@espoa/database";
import { eq, and, isNull, count, sum, desc, sql } from "drizzle-orm";

export async function getDashboardStats(associacaoId: string) {
  const [[membrosResult], [caixaResult], [mensalidadesPendentes], recentMembros] =
    await Promise.all([
      // Total de membros ativos (excluindo admins)
      db
        .select({ total: count() })
        .from(usuarioAssociacao)
        .where(
          and(
            eq(usuarioAssociacao.associacaoId, associacaoId),
            eq(usuarioAssociacao.status, "ativo"),
            eq(usuarioAssociacao.role, "associado"),
          ),
        ),
      // Total em caixa: entradas - saídas de transacao_financeira
      db
        .select({
          total: sql<number>`
            COALESCE(SUM(CASE WHEN ${transacaoFinanceira.tipo} = 'despesa' THEN -${transacaoFinanceira.valor} ELSE ${transacaoFinanceira.valor} END), 0)
          `,
        })
        .from(transacaoFinanceira)
        .where(
          and(
            eq(transacaoFinanceira.associacaoId, associacaoId),
            isNull(transacaoFinanceira.deletedAt),
          ),
        ),
      // Mensalidades pendentes (sem data_pagamento)
      db
        .select({ total: count() })
        .from(mensalidade)
        .innerJoin(associado, eq(mensalidade.associadoId, associado.id))
        .where(
          and(
            eq(associado.associacaoId, associacaoId),
            isNull(mensalidade.dataPagamento),
            isNull(mensalidade.deletedAt),
            isNull(associado.deletedAt),
          ),
        ),
      // Membros recentes
      db
        .select({
          id: usuarioAssociacao.id,
          nome: usuario.nome,
          joinedAt: usuarioAssociacao.joinedAt,
          requestedAt: usuarioAssociacao.requestedAt,
          role: usuarioAssociacao.role,
        })
        .from(usuarioAssociacao)
        .innerJoin(usuario, eq(usuarioAssociacao.usuarioId, usuario.id))
        .where(
          and(
            eq(usuarioAssociacao.associacaoId, associacaoId),
            eq(usuarioAssociacao.status, "ativo"),
          ),
        )
        .orderBy(desc(usuarioAssociacao.joinedAt))
        .limit(5),
    ]);

  return {
    totalAssociados: membrosResult.total,
    totalCaixa: Number(caixaResult.total ?? 0),
    mensalidadesPendentes: mensalidadesPendentes.total,
    atividadesRecentes: recentMembros.map((m) => ({
      id: m.id,
      tipo: "novo_membro",
      descricao: m.nome,
      role: m.role,
      data: (m.joinedAt ?? m.requestedAt).toISOString(),
    })),
  };
}
