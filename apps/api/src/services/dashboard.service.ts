import { db, associado, mensalidade, usuarioAssociacao, usuario } from "@espoa/database";
import { eq, and, isNull, count, sum, desc } from "drizzle-orm";

export async function getDashboardStats(associacaoId: string) {
  const [[membrosResult], [mensalidadesTotal], [mensalidadesPendentes], recentMembros] =
    await Promise.all([
      db
        .select({ total: count() })
        .from(usuarioAssociacao)
        .where(
          and(
            eq(usuarioAssociacao.associacaoId, associacaoId),
            eq(usuarioAssociacao.status, "ativo"),
          ),
        ),
      db
        .select({ total: sum(mensalidade.valor) })
        .from(mensalidade)
        .innerJoin(associado, eq(mensalidade.associadoId, associado.id))
        .where(
          and(
            eq(associado.associacaoId, associacaoId),
            isNull(mensalidade.deletedAt),
            isNull(associado.deletedAt),
          ),
        ),
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
    totalCaixa: Number(mensalidadesTotal.total ?? 0),
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
