import { db } from "../database";
import { syncRequest } from "./client";
import type { ConflictLogClientRow, PulledRows, PushOperation, SyncTableName } from "./types";

const LAST_PULL_CURSOR_KEY = "espoa.sync.lastPullCursor";

/** Entries older than this that have been synced are eligible for pruning. */
const RETENTION_DAYS = 30;

type WritableSyncTable = {
  put: (row: unknown) => Promise<unknown>;
};

const tableMap = {
  associacao: db.associacao,
  associado: db.associado,
  mensalidade: db.mensalidade,
  transacao_financeira: db.transacao_financeira,
  ata: db.ata,
  producao: db.producao,
  usuario_associacao: db.usuario_associacao,
  edital_pnae: db.edital_pnae,
} as const;

const tableNames = Object.keys(tableMap) as SyncTableName[];

export type SyncResult = {
  status: "success" | "already_running";
  pushed: number;
  pulled: number;
  pruned: number;
};

export class SyncManager {
  private isSyncing = false;

  async run(deviceId: string): Promise<SyncResult> {
    if (this.isSyncing) {
      return { status: "already_running", pushed: 0, pulled: 0, pruned: 0 };
    }

    // Web Locks API — prevents two tabs from syncing simultaneously and
    // corrupting the pull cursor. Falls back to the intra-tab isSyncing guard
    // in environments where the API is unavailable (e.g., some WebViews).
    if (typeof navigator !== "undefined" && navigator.locks) {
      let result: SyncResult = { status: "already_running", pushed: 0, pulled: 0, pruned: 0 };
      await navigator.locks.request(
        "espoa-sync",
        { ifAvailable: true },
        async (lock) => {
          if (lock === null) {
            // Another tab holds the lock — skip this cycle.
            return;
          }
          result = await this._runLocked(deviceId);
        },
      );
      return result;
    }

    // Fallback path (no Web Locks support)
    return this._runLocked(deviceId);
  }

  private async _runLocked(deviceId: string): Promise<SyncResult> {
    if (this.isSyncing) {
      return { status: "already_running", pushed: 0, pulled: 0, pruned: 0 };
    }

    this.isSyncing = true;

    try {
      // Prune stale synced entries before pushing to keep the queue lean
      const pruned = await pruneOldSyncedEntries();

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

      console.log("[sync] pushing ops:", push.length, push.map(p => `${p.tableName}/${p.operation}/${p.recordId}`));

      const response = await syncRequest({
        deviceId,
        lastPulledAt: getLastPullCursor(),
        push,
      });

      console.log("[sync] server acked:", response.ackedOperationIds, "pulled tables:", Object.entries(response.pulled).filter(([,v]) => (v as unknown[]).length > 0).map(([k,v]) => `${k}:${(v as unknown[]).length}`));

      if (response.ackedOperationIds.length > 0) {
        await markQueueAsSynced(response.ackedOperationIds);
      }

      const pulledCount = await applyPulledRows(response.pulled);
      setLastPullCursor(response.nextPullCursor);

      // Persist any conflict_log rows the server sent back
      if (response.conflictLogs && response.conflictLogs.length > 0) {
        await applyConflictLogs(response.conflictLogs);
      }

      const result: SyncResult = {
        status: "success",
        pushed: response.ackedOperationIds.length,
        pulled: pulledCount,
        pruned,
      };

      // TODO(telemetry): emit the following metrics once a telemetry pipeline is wired up.
      // Suggested implementation: call a lightweight `emitSyncMetrics(result)` helper that
      // posts to a `/api/telemetry` endpoint (fire-and-forget, never throws).
      //
      // Metrics to track per the offline-first plan:
      //   1. sync_success_rate   — result.pushed / (pendingQueue.length || 1)
      //   2. time_to_sync_ms     — Date.now() - syncStartMs (capture before _runLocked body)
      //   3. outbox_depth        — pendingQueue.length (snapshot before push)
      //   4. conflict_rate       — response.conflictLogs?.length / (result.pushed || 1)
      //   5. pulled_count        — result.pulled
      //   6. pruned_count        — result.pruned
      //   7. device_id           — deviceId (for per-device outbox depth alerting)
      //
      // Alert thresholds (ops runbook):
      //   - outbox_depth P95 > 50 across devices → investigate stuck queue
      //   - conflict_rate > 0.005 (0.5%) → investigate LWW collisions
      //   - cursor_drift: nextPullCursor unchanged across N cycles → server-side issue

      return result;
    } finally {
      this.isSyncing = false;
    }
  }
}

/**
 * Delete sync_queue entries that have already been acknowledged by the server
 * and are older than RETENTION_DAYS. Runs at the start of each sync cycle so
 * the outbox stays lean over time. Returns the number of pruned rows.
 */
async function pruneOldSyncedEntries(): Promise<number> {
  const cutoffMs = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const cutoff = new Date(cutoffMs).toISOString();

  const keysToDelete = await db.sync_queue
    .where("synced")
    .equals(1)
    .filter((item) => item.created_at < cutoff)
    .primaryKeys();

  if (keysToDelete.length > 0) {
    await db.sync_queue.bulkDelete(keysToDelete as number[]);
  }

  return keysToDelete.length;
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
    const rows = (pulled as Record<string, unknown[]>)[tableName] ?? [];
    total += rows.length;

    if (rows.length === 0) {
      continue;
    }

    const table = tableMap[tableName as keyof typeof tableMap] as unknown as WritableSyncTable;
    for (const row of rows) {
      await table.put(row);
    }
  }

  return total;
}

async function applyConflictLogs(logs: ConflictLogClientRow[]) {
  await db.transaction("rw", db.conflict_log, async () => {
    for (const log of logs) {
      // Using the server's numeric id explicitly — this overrides Dexie's ++id
      // autoincrement and makes the local row stable across syncs. Safe here
      // because conflict_log is only ever written by the pull path (never locally),
      // so there is no risk of id collision with client-generated rows.
      await db.conflict_log.put({
        id: log.id,
        device_id: log.device_id,
        operation_id: log.operation_id,
        table_name: log.table_name,
        record_id: log.record_id,
        local_data: JSON.stringify(log.local_data),
        remote_data: JSON.stringify(log.remote_data),
        reason: log.reason ?? undefined,
        resolved: 0,
        created_at: log.created_at,
      });
    }
  });
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
