import { db, associado, usuarioAssociacao } from "@espoa/database";
import { and, eq, isNull } from "drizzle-orm";
import { toCamelObject } from "../utils/case-mapper";
import { ensureUserIsAdmin } from "../middleware/admin.guard";
import type { PushOperation } from "../sync/sync.types";

/**
 * Autoriza uma operação de sync push baseada no role do usuário e na tabela alvo.
 *
 * Espelha as regras dos middlewares REST (admin.guard) — necessário porque
 * o caminho real de mutações dos clientes é a sync queue, não o REST direto.
 *
 * Regras:
 *  - Tabelas admin-only (associado, ata, transacao_financeira, edital_pnae):
 *    exige role=adm ativo na associacao_id do payload
 *  - mensalidade: self-service permitido se usuario_id === userId; senão admin
 *  - producao: self-service permitido se associado pertence ao usuário; senão admin
 *  - associacao: update/delete só admin; create aceito (admin é criado em paralelo)
 *  - usuario_associacao: validado pela própria intent (approve/reject/change_role
 *    requerem admin; respond_invite é self-service do convidado)
 */
export async function authorizePushOperation(
  userId: string | undefined,
  op: PushOperation,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!userId) {
    return { ok: false, reason: "usuario_nao_autenticado" };
  }

  const payload = toCamelObject(op.payload) as Record<string, unknown>;

  if (op.tableName === "usuario_associacao") {
    return authorizeVinculoIntent(userId, payload);
  }

  if (op.tableName === "mensalidade") {
    return authorizeMensalidade(userId, payload);
  }

  if (op.tableName === "producao") {
    return authorizeProducao(userId, payload);
  }

  if (op.tableName === "associacao") {
    return authorizeAssociacao(userId, op, payload);
  }

  const adminOnlyTables = new Set([
    "associado",
    "ata",
    "transacao_financeira",
    "edital_pnae",
    "aviso",
  ]);
  if (adminOnlyTables.has(op.tableName)) {
    const assocId = payload.associacaoId as string | undefined;
    if (!assocId) {
      return { ok: false, reason: "associacao_id_obrigatorio" };
    }
    const isAdmin = await ensureUserIsAdmin(userId, assocId);
    if (!isAdmin) return { ok: false, reason: "acesso_negado_admin" };
    return { ok: true };
  }

  // Tabela desconhecida — `isValidOperation` já barra antes
  return { ok: true };
}

async function authorizeVinculoIntent(
  userId: string,
  payload: Record<string, unknown>,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const intent = payload.intent as string | undefined;
  const associacaoId = payload.associacaoId as string | undefined;

  if (!intent) return { ok: false, reason: "intent_obrigatoria" };
  if (!associacaoId) return { ok: false, reason: "associacao_id_obrigatorio" };

  // respond_invite: o próprio convidado responde — sem checar admin
  if (intent === "respond_invite") return { ok: true };

  // Operações administrativas: aprovar/rejeitar/promover/remover
  const isAdmin = await ensureUserIsAdmin(userId, associacaoId);
  if (!isAdmin) return { ok: false, reason: "acesso_negado_admin" };
  return { ok: true };
}

async function authorizeMensalidade(
  userId: string,
  payload: Record<string, unknown>,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const targetUsuarioId = payload.usuarioId as string | undefined;
  if (targetUsuarioId && targetUsuarioId === userId) return { ok: true };

  const associadoId = payload.associadoId as string | undefined;
  let assocId: string | null = null;

  if (associadoId) {
    const [row] = await db
      .select({ associacaoId: associado.associacaoId })
      .from(associado)
      .where(and(eq(associado.id, associadoId), isNull(associado.deletedAt)))
      .limit(1);
    assocId = row?.associacaoId ?? null;
  } else if (targetUsuarioId) {
    const [row] = await db
      .select({ associacaoId: usuarioAssociacao.associacaoId })
      .from(usuarioAssociacao)
      .where(
        and(
          eq(usuarioAssociacao.usuarioId, targetUsuarioId),
          eq(usuarioAssociacao.status, "ativo"),
        ),
      )
      .limit(1);
    assocId = row?.associacaoId ?? null;
  }

  if (!assocId) return { ok: false, reason: "associacao_id_nao_resolvida" };
  const isAdmin = await ensureUserIsAdmin(userId, assocId);
  if (!isAdmin) return { ok: false, reason: "acesso_negado_admin" };
  return { ok: true };
}

async function authorizeProducao(
  userId: string,
  payload: Record<string, unknown>,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const associadoId = payload.associadoId as string | undefined;
  if (!associadoId) return { ok: false, reason: "associado_id_obrigatorio" };

  const [assocRow] = await db
    .select({
      associacaoId: associado.associacaoId,
      usuarioId: associado.usuarioId,
    })
    .from(associado)
    .where(and(eq(associado.id, associadoId), isNull(associado.deletedAt)))
    .limit(1);

  if (!assocRow) return { ok: false, reason: "associado_inexistente" };

  // Self-service: associado registrando própria produção
  if (assocRow.usuarioId && assocRow.usuarioId === userId) {
    return { ok: true };
  }

  if (!assocRow.associacaoId) {
    return { ok: false, reason: "associacao_id_nao_resolvida" };
  }
  const isAdmin = await ensureUserIsAdmin(userId, assocRow.associacaoId);
  if (!isAdmin) return { ok: false, reason: "acesso_negado_admin" };
  return { ok: true };
}

async function authorizeAssociacao(
  userId: string,
  op: PushOperation,
  payload: Record<string, unknown>,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  // create: aceitar — o vínculo admin é criado em paralelo via usuario_associacao
  if (op.operation === "create") return { ok: true };

  // update/delete: exigir admin desta associação
  const assocId = op.recordId ?? (payload.id as string | undefined);
  if (!assocId) return { ok: false, reason: "associacao_id_obrigatorio" };
  const isAdmin = await ensureUserIsAdmin(userId, assocId);
  if (!isAdmin) return { ok: false, reason: "acesso_negado_admin" };
  return { ok: true };
}
