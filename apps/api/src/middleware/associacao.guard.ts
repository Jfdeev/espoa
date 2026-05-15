import { db, usuarioAssociacao } from "@espoa/database";
import { and, eq } from "drizzle-orm";

/**
 * Verifica se o usuário autenticado é membro ativo da associação informada.
 *
 * Consulta a tabela `usuario_associacao` exigindo `status = "ativo"`.
 * Retorna `false` para usuários não vinculados, com vínculo pendente ou inativo.
 *
 * Compatibilidade offline-first: este guard roda apenas no servidor durante
 * chamadas HTTP autenticadas — não interfere no fluxo POST /sync nem no
 * IndexedDB do client.
 */
export async function ensureUserIsMember(
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
