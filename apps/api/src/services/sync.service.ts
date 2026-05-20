import { applyPushOperations } from "./sync-push.service";
import { pullRowsByTable, pullConflictLogs } from "./sync-pull.service";
import type { PushOperation, SyncResult } from "../sync/sync.types";

export async function runSync(params: {
  deviceId: string;
  userId?: string;
  push: PushOperation[];
  lastPulledAt: Date | null;
}): Promise<SyncResult> {
  const ackedOperationIds = await applyPushOperations(
    params.deviceId,
    params.push,
    params.userId,
  );

  const [pulled, conflictLogs] = await Promise.all([
    pullRowsByTable(params.lastPulledAt, params.userId),
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
