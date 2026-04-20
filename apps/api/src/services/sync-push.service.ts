import { db, syncQueue } from "@espoa/database";
import { eq } from "drizzle-orm";
import { normalizePayload, toCamelObject } from "../utils/case-mapper";
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

    const processed = await db.transaction(async (tx) => {
      const inserted = await tx
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
        return false;
      }

      await applyOperation(tx, op);
      return true;
    });

    if (processed) {
      ackedOperationIds.push(op.operationId);
    }
  }

  return ackedOperationIds;
}

async function applyOperation(tx: any, op: PushOperation) {
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
    .values(payload)
    .onConflictDoUpdate({
      target: table.id,
      set: {
        ...payload,
        updatedAt: now,
      },
    });
}
