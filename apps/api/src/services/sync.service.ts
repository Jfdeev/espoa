import { applyPushOperations } from "./sync-push.service";
import { pullRowsByTable, pullConflictLogs } from "./sync-pull.service";
import type { PushOperation, SyncResult } from "../sync/sync.types";

export async function runSync(params: {
  deviceId: string;
  push: PushOperation[];
  lastPulledAt: Date | null;
}): Promise<SyncResult> {
  const ackedOperationIds = await applyPushOperations(
    params.deviceId,
    params.push,
  );

  const [pulled, conflictLogs] = await Promise.all([
    pullRowsByTable(params.lastPulledAt),
    pullConflictLogs(params.deviceId, params.lastPulledAt),
  ]);

  const now = new Date().toISOString();

  return {
    ackedOperationIds,
    pulled,
    conflictLogs,
    serverTime: now,
    nextPullCursor: now,
  };
}
