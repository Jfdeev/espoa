export const SYNC_TABLE_NAMES = [
  "associado",
  "mensalidade",
  "transacao_financeira",
  "ata",
  "producao",
] as const;

export type SyncTableName = (typeof SYNC_TABLE_NAMES)[number];

export const SYNC_OPERATIONS = ["create", "update", "delete"] as const;

export type SyncOperationType = (typeof SYNC_OPERATIONS)[number];

export type PushOperation = {
  operationId: string;
  tableName: SyncTableName;
  operation: SyncOperationType;
  recordId: string;
  payload: Record<string, unknown>;
  clientUpdatedAt?: string;
};

export type SyncRequestBody = {
  deviceId: string;
  lastPulledAt?: string | null;
  push?: PushOperation[];
};

export type PulledRows = Record<SyncTableName, Record<string, unknown>[]>;

export type SyncResult = {
  ackedOperationIds: string[];
  pulled: PulledRows;
  serverTime: string;
  nextPullCursor: string;
};
