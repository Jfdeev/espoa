import { db } from "@espoa/database";
import { gt } from "drizzle-orm";
import {
  syncTableNames,
  syncTables,
  createEmptyPulledRows,
} from "../sync/sync.tables";
import type { PulledRows, SyncTableName } from "../sync/sync.types";
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
