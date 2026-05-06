import { db } from "@/database/db";

/**
 * Vinculo repository — writes intents to the sync_queue.
 *
 * Unlike regular CRUD repositories, usuario_associacao uses intent-based
 * semantics: the server is the authority and validates each intent before
 * applying it. Conflicts (e.g., two admins approving the same member) are
 * written to conflict_log and pulled back to the originating device.
 *
 * Operations enqueue offline and are processed when sync runs.
 *
 * record_id = usuarioId (the member's user UUID).
 * associacaoId is encoded in the intent payload so the backend can find the
 * correct usuario_associacao row via the composite (usuarioId, associacaoId).
 */

function now() {
  return new Date().toISOString();
}

async function enqueue(
  usuarioId: string,
  associacaoId: string,
  intent: "approve_member" | "reject_member" | "change_role" | "remove_member" | "respond_invite",
  extra?: Record<string, unknown>,
) {
  await db.sync_queue.add({
    table_name: "usuario_associacao",
    record_id: usuarioId,
    operation: "update",
    payload: JSON.stringify({ intent, associacao_id: associacaoId, ...extra }),
    created_at: now(),
    synced: 0,
  });
}

export const vinculoRepository = {
  /** Approve a pending member (enqueues intent; server validates status). */
  async aprovar(usuarioId: string, associacaoId: string): Promise<void> {
    await enqueue(usuarioId, associacaoId, "approve_member");
  },

  /** Reject a pending member (enqueues intent; server validates status). */
  async rejeitar(usuarioId: string, associacaoId: string): Promise<void> {
    await enqueue(usuarioId, associacaoId, "reject_member");
  },

  /** Change an active member's role (enqueues intent). */
  async alterarRole(usuarioId: string, associacaoId: string, role: string): Promise<void> {
    await enqueue(usuarioId, associacaoId, "change_role", { role });
  },

  /** Remove a member from the association (enqueues intent). */
  async remover(usuarioId: string, associacaoId: string): Promise<void> {
    await enqueue(usuarioId, associacaoId, "remove_member");
  },

  /** Respond to an invite (accept or reject). The current user responds to their own invite. */
  async responderConvite(usuarioId: string, associacaoId: string, acao: "aceitar" | "recusar"): Promise<void> {
    await enqueue(usuarioId, associacaoId, "respond_invite", { acao });
  },
};
