import { db } from "../database";
import { syncRequest } from "./client";
import type { PulledRows, PushOperation, SyncTableName } from "./types";

const LAST_PULL_CURSOR_KEY = "espoa.sync.lastPullCursor";

type WritableSyncTable = {
  put: (row: unknown) => Promise<unknown>;
};

const tableMap = {
  associado: db.associado,
  mensalidade: db.mensalidade,
  transacao_financeira: db.transacao_financeira,
  ata: db.ata,
  producao: db.producao,
} as const;

const tableNames = Object.keys(tableMap) as SyncTableName[];

export type SyncResult = {
  status: "success" | "already_running";
  pushed: number;
  pulled: number;
};

export class SyncManager {
  private isSyncing = false;

  async run(deviceId: string): Promise<SyncResult> {
    if (this.isSyncing) {
      return { status: "already_running", pushed: 0, pulled: 0 };
    }

    this.isSyncing = true;

    try {
      const pendingQueue = await db.sync_queue
        .where("synced")
        .equals(0)
        .sortBy("created_at");

      const push = pendingQueue.map<PushOperation>((item) => ({
        operationId: String(item.id),
        tableName: item.table_name as SyncTableName,
        operation: item.operation,
        recordId: item.record_id,
        payload: safeParsePayload(item.payload),
        clientUpdatedAt: item.created_at,
      }));

      const response = await syncRequest({
        deviceId,
        lastPulledAt: getLastPullCursor(),
        push,
      });

      if (response.ackedOperationIds.length > 0) {
        await markQueueAsSynced(response.ackedOperationIds);
      }

      const pulledCount = await applyPulledRows(response.pulled);
      setLastPullCursor(response.nextPullCursor);

      return {
        status: "success",
        pushed: response.ackedOperationIds.length,
        pulled: pulledCount,
      };
    } finally {
      this.isSyncing = false;
    }
  }
}

async function markQueueAsSynced(operationIds: string[]) {
  const ids = operationIds
    .map((id) => Number(id))
    .filter((id) => Number.isInteger(id));

  if (ids.length === 0) {
    return;
  }

  await db.transaction("rw", db.sync_queue, async () => {
    for (const id of ids) {
      await db.sync_queue.update(id, { synced: 1 });
    }
  });
}

async function applyPulledRows(pulled: PulledRows) {
  let total = 0;

  for (const tableName of tableNames) {
    const rows = pulled[tableName] ?? [];
    total += rows.length;

    if (rows.length === 0) {
      continue;
    }

    const table = tableMap[tableName] as unknown as WritableSyncTable;
    for (const row of rows) {
      await table.put(row);
    }
  }

  return total;
}

function getLastPullCursor() {
  return localStorage.getItem(LAST_PULL_CURSOR_KEY);
}

function setLastPullCursor(value: string) {
  localStorage.setItem(LAST_PULL_CURSOR_KEY, value);
}

function safeParsePayload(payload: string) {
  try {
    return JSON.parse(payload) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export const syncManager = new SyncManager();
