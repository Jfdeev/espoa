export type SyncTableName =
  | "associado"
  | "mensalidade"
  | "transacao_financeira"
  | "ata"
  | "producao";

export type SyncOperationType = "create" | "update" | "delete";

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
  lastPulledAt: string | null;
  push: PushOperation[];
};

export type PulledRows = Record<SyncTableName, Record<string, unknown>[]>;

export type SyncResponseBody = {
  ackedOperationIds: string[];
  pulled: PulledRows;
  serverTime: string;
  nextPullCursor: string;
};
