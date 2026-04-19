import { applyPushOperations } from "./sync-push.service";
import { pullRowsByTable } from "./sync-pull.service";
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
  const pulled = await pullRowsByTable(params.lastPulledAt);
  const now = new Date().toISOString();

  return {
    ackedOperationIds,
    pulled,
    serverTime: now,
    nextPullCursor: now,
  };
}
