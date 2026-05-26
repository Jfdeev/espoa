export const SYNC_TABLE_NAMES = [
  "associacao",
  "associado",
  "mensalidade",
  "transacao_financeira",
  "ata",
  "producao",
  "area_plantada",
  "usuario_associacao",
  "edital_pnae",
  "aviso",
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
  lastPulledAt: string | null;
  push: PushOperation[];
};

export type ConflictLogClientRow = {
  id: number;
  device_id: string;
  operation_id: string;
  table_name: string;
  record_id: string;
  local_data: Record<string, unknown> | null;
  remote_data: Record<string, unknown> | null;
  reason: string | null;
  resolved: boolean;
  created_at: string;
};

export type PulledRows = Record<SyncTableName, Record<string, unknown>[]> & {
  // associacao is pulled from server but not in SYNC_TABLE_NAMES (read-only pull)
  associacao?: Record<string, unknown>[];
};

export type SyncResponseBody = {
  ackedOperationIds: string[];
  pulled: PulledRows;
  conflictLogs: ConflictLogClientRow[];
  serverTime: string;
  nextPullCursor: string;
};
