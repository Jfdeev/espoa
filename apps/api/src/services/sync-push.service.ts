import { db, syncQueue, usuarioAssociacao, conflictLog } from "@espoa/database";
import { and, eq } from "drizzle-orm";
import { normalizePayload, toCamelObject, toSnakeObject } from "../utils/case-mapper";
import { syncTables } from "../sync/sync.tables";
import type { PushOperation } from "../sync/sync.types";

export function isValidOperation(
  op: Partial<PushOperation>,
): op is PushOperation {
  return Boolean(
    op &&
    op.operationId &&
    op.tableName &&
    op.operation &&
    op.recordId &&
    op.payload &&
    Object.prototype.hasOwnProperty.call(syncTables, op.tableName),
  );
}

export async function applyPushOperations(
  deviceId: string,
  ops: PushOperation[],
) {
  const ackedOperationIds: string[] = [];

  for (const op of ops) {
    if (!isValidOperation(op)) {
      continue;
    }

    const inserted = await db
      .insert(syncQueue)
      .values({
        operationId: op.operationId,
        deviceId,
        tableName: op.tableName,
        recordId: op.recordId,
        operation: op.operation,
        payload: op.payload,
      })
      .onConflictDoNothing()
      .returning({ id: syncQueue.id });

    if (inserted.length === 0) {
      // Already in sync_queue — but applyOperation may have failed previously.
      // Ack it so the client stops retrying, and attempt apply again (idempotent upsert).
      try {
        await applyOperation(db, op, deviceId);
      } catch {
        // Best-effort retry — if it still fails, at least ack so client unblocks
      }
      ackedOperationIds.push(op.operationId);
      continue;
    }

    try {
      await applyOperation(db, op, deviceId);
    } catch (err) {
      console.error(
        `[sync-push] applyOperation failed for op ${op.operationId} (${op.tableName}):`,
        err instanceof Error ? err.message : err,
      );
      // Write conflict log so the client is notified; ack to prevent infinite retries
      try {
        await writeConflictLog(db, deviceId, op, null, `Erro interno: ${err instanceof Error ? err.message : String(err)}`);
      } catch {
        // conflict_log write failed — ack anyway so client unblocks
      }
    }
    ackedOperationIds.push(op.operationId);
  }

  return ackedOperationIds;
}

async function applyOperation(tx: any, op: PushOperation, deviceId: string) {
  // usuario_associacao uses intent-based semantics — server is authoritative
  if (op.tableName === "usuario_associacao") {
    await applyVinculoIntent(tx, op, deviceId);
    return;
  }

  const table = syncTables[op.tableName] as any;
  const payload = normalizePayload(toCamelObject(op.payload));
  const now = new Date();

  if (op.operation === "delete") {
    await tx
      .update(table)
      .set({ deletedAt: now, updatedAt: now })
      .where(eq(table.id, op.recordId));
    return;
  }

  await tx
    .insert(table)
    .values({ ...payload, id: op.recordId, updatedAt: now })
    .onConflictDoUpdate({
      target: table.id,
      set: {
        ...payload,
        updatedAt: now,
      },
    });
}

// ─── Intent handler for usuario_associacao ───────────────────────────────────

type VinculoIntent = "approve_member" | "reject_member" | "change_role" | "remove_member" | "respond_invite";

async function applyVinculoIntent(tx: any, op: PushOperation, deviceId: string) {
  const payload = toCamelObject(op.payload) as Record<string, unknown>;
  const intent = payload["intent"] as VinculoIntent | undefined;
  // record_id = usuarioId; associacaoId is in the payload
  const associacaoId = payload["associacaoId"] as string | undefined;

  if (!intent || !associacaoId) {
    // Malformed operation — ignore silently
    return;
  }

  // Primary lookup: by PK (record_id = usuario_associacao.id — natural for update ops)
  let [current] = await tx
    .select()
    .from(usuarioAssociacao)
    .where(eq(usuarioAssociacao.id, op.recordId));

  // Fallback: by composite key (record_id = usuarioId) for legacy clients
  if (!current) {
    [current] = await tx
      .select()
      .from(usuarioAssociacao)
      .where(
        and(
          eq(usuarioAssociacao.usuarioId, op.recordId),
          eq(usuarioAssociacao.associacaoId, associacaoId),
        ),
      );
  }

  if (!current) {
    // Record doesn't exist yet — write conflict so client knows
    await writeConflictLog(tx, deviceId, op, null, "Record not found");
    return;
  }

  const now = new Date();

  if (intent === "approve_member") {
    if (current.status !== "pendente") {
      await writeConflictLog(
        tx,
        deviceId,
        op,
        current,
        `Membro já está com status "${current.status}" — aprovação ignorada`,
      );
      return;
    }
    await tx
      .update(usuarioAssociacao)
      .set({
        status: "ativo",
        joinedAt: now,
        version: current.version + 1,
        updatedAt: now,
        deviceId,
      })
      .where(eq(usuarioAssociacao.id, current.id));
    return;
  }

  if (intent === "reject_member") {
    if (current.status !== "pendente") {
      await writeConflictLog(
        tx,
        deviceId,
        op,
        current,
        `Membro já está com status "${current.status}" — rejeição ignorada`,
      );
      return;
    }
    await tx
      .update(usuarioAssociacao)
      .set({
        status: "rejeitado",
        version: current.version + 1,
        updatedAt: now,
        deviceId,
      })
      .where(eq(usuarioAssociacao.id, current.id));
    return;
  }

  if (intent === "change_role") {
    const newRole = payload["role"] as string | undefined;
    if (!newRole) {
      await writeConflictLog(tx, deviceId, op, current, "Campo role ausente");
      return;
    }
    await tx
      .update(usuarioAssociacao)
      .set({
        role: newRole,
        version: current.version + 1,
        updatedAt: now,
        deviceId,
      })
      .where(eq(usuarioAssociacao.id, current.id));
    return;
  }

  if (intent === "remove_member") {
    if (current.status === "inativo") {
      await writeConflictLog(
        tx,
        deviceId,
        op,
        current,
        `Membro já está inativo — remoção ignorada`,
      );
      return;
    }
    await tx
      .update(usuarioAssociacao)
      .set({
        status: "inativo",
        version: current.version + 1,
        updatedAt: now,
        deviceId,
      })
      .where(eq(usuarioAssociacao.id, current.id));
    return;
  }

  if (intent === "respond_invite") {
    if (current.status !== "convidado") {
      await writeConflictLog(
        tx,
        deviceId,
        op,
        current,
        `Membro não está com status "convidado" (atual: "${current.status}") — resposta ignorada`,
      );
      return;
    }
    const acao = payload["acao"] as string | undefined;
    if (acao === "aceitar") {
      await tx
        .update(usuarioAssociacao)
        .set({
          status: "ativo",
          joinedAt: now,
          version: current.version + 1,
          updatedAt: now,
          deviceId,
        })
        .where(eq(usuarioAssociacao.id, current.id));
    } else {
      await tx
        .update(usuarioAssociacao)
        .set({
          status: "rejeitado",
          version: current.version + 1,
          updatedAt: now,
          deviceId,
        })
        .where(eq(usuarioAssociacao.id, current.id));
    }
    return;
  }

  // Unknown intent — write conflict so client is notified
  await writeConflictLog(tx, deviceId, op, current, `Intent desconhecida: ${String(intent)}`);
}

async function writeConflictLog(
  tx: any,
  deviceId: string,
  op: PushOperation,
  remoteData: Record<string, unknown> | null,
  reason: string,
) {
  await tx.insert(conflictLog).values({
    deviceId,
    operationId: op.operationId,
    tableName: op.tableName,
    recordId: op.recordId,
    localData: op.payload,
    remoteData: remoteData ? toSnakeObject(remoteData) : null,
    reason,
    resolved: false,
  });
}
