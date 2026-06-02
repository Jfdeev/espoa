import { db, associado, mensalidade, transacaoFinanceira, usuarioAssociacao, usuario } from "@espoa/database";
import { eq, and, isNull, count, sum, desc, sql } from "drizzle-orm";

/**
 * Retorna o primeiro dia útil (seg–sex) do mês informado.
 * Espelha `apps/web/src/lib/mensalidade-utils.ts#primeiroUtilDoMes`.
 */
function primeiroUtilDoMes(ref: Date = new Date()): Date {
  const dia1 = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const dow = dia1.getDay();
  if (dow === 0) return new Date(ref.getFullYear(), ref.getMonth(), 2);
  if (dow === 6) return new Date(ref.getFullYear(), ref.getMonth(), 3);
  return dia1;
}

export async function getDashboardStats(associacaoId: string) {
  const [[membrosResult], [caixaResult], membrosAtivos, recentMembros] =
    await Promise.all([
      // Total de membros ativos
      db
        .select({ total: count() })
        .from(usuarioAssociacao)
        .where(
          and(
            eq(usuarioAssociacao.associacaoId, associacaoId),
            eq(usuarioAssociacao.status, "ativo"),
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
      // IDs de usuários ativos da associação (para computar mensalidades vencidas)
      db
        .select({ usuarioId: usuarioAssociacao.usuarioId })
        .from(usuarioAssociacao)
        .where(
          and(
            eq(usuarioAssociacao.associacaoId, associacaoId),
            eq(usuarioAssociacao.status, "ativo"),
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

  // Mensalidades vencidas: membros ativos que não pagaram o mês corrente
  // após o vencimento (1º dia útil do mês). Antes do vencimento, ninguém está vencido.
  let mensalidadesVencidas = 0;
  const hoje = new Date();
  const vencimento = primeiroUtilDoMes(hoje);
  if (hoje >= vencimento && membrosAtivos.length > 0) {
    const ano = vencimento.getFullYear();
    const mes = String(vencimento.getMonth() + 1).padStart(2, "0");
    const anoMes = `${ano}-${mes}`;

    // Usuários que pagaram no mês corrente
    const pagantes = await db
      .select({ usuarioId: mensalidade.usuarioId })
      .from(mensalidade)
      .where(
        and(
          isNull(mensalidade.deletedAt),
          sql`${mensalidade.dataPagamento} IS NOT NULL`,
          sql`to_char(${mensalidade.dataPagamento}, 'YYYY-MM') = ${anoMes}`,
        ),
      );

    const pagantesSet = new Set(pagantes.map((p) => p.usuarioId).filter(Boolean) as string[]);
    mensalidadesVencidas = membrosAtivos.filter((m) => !pagantesSet.has(m.usuarioId)).length;
  }

  return {
    totalAssociados: membrosResult.total,
    totalCaixa: Number(caixaResult.total ?? 0),
    mensalidadesVencidas,
    /** @deprecated alias mantido por compatibilidade com clientes antigos */
    mensalidadesPendentes: mensalidadesVencidas,
    atividadesRecentes: recentMembros.map((m) => ({
      id: m.id,
      tipo: "novo_membro",
      descricao: m.nome,
      role: m.role,
      data: (m.joinedAt ?? m.requestedAt).toISOString(),
    })),
  };
}
