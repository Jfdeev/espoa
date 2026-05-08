import { db, conflictLog } from "@espoa/database";
import { and, eq, gt } from "drizzle-orm";
import {
  syncTableNames,
  syncTables,
  createEmptyPulledRows,
} from "../sync/sync.tables";
import type { ConflictLogRow, PulledRows, SyncTableName } from "../sync/sync.types";
import { toSnakeObject } from "../utils/case-mapper";

export async function pullRowsByTable(
  lastPulledAt: Date | null,
): Promise<PulledRows> {
  const pulled = createEmptyPulledRows();

  for (const tableName of syncTableNames) {
    pulled[tableName] = await getPulledRows(tableName, lastPulledAt);
  }

  return pulled;
}

async function getPulledRows(
  tableName: SyncTableName,
  lastPulledAt: Date | null,
) {
  const table = syncTables[tableName] as any;
  const rows = lastPulledAt
    ? await db.select().from(table).where(gt(table.updatedAt, lastPulledAt))
    : await db.select().from(table);

  return rows.map((row: Record<string, unknown>) => toSnakeObject(row));
}

export async function pullConflictLogs(
  deviceId: string,
  lastPulledAt: Date | null,
): Promise<ConflictLogRow[]> {
  const rows = lastPulledAt
    ? await db
        .select()
        .from(conflictLog)
        .where(
          and(
            eq(conflictLog.deviceId, deviceId),
            gt(conflictLog.createdAt, lastPulledAt),
          ),
        )
    : await db
        .select()
        .from(conflictLog)
        .where(eq(conflictLog.deviceId, deviceId));

  return rows.map((row) => ({
    id: row.id,
    device_id: row.deviceId,
    operation_id: row.operationId,
    table_name: row.tableName,
    record_id: row.recordId,
    local_data: row.localData as Record<string, unknown> | null,
    remote_data: row.remoteData as Record<string, unknown> | null,
    reason: row.reason,
    resolved: row.resolved,
    created_at: row.createdAt.toISOString(),
  }));
}
