import Dexie, { type EntityTable } from "dexie";
import type {
  Associado,
  Mensalidade,
  TransacaoFinanceira,
  Ata,
  Producao,
  SyncQueue,
  ConflictLog,
} from "./types";

const db = new Dexie("espoa_db") as Dexie & {
  associado: EntityTable<Associado, "id">;
  mensalidade: EntityTable<Mensalidade, "id">;
  transacao_financeira: EntityTable<TransacaoFinanceira, "id">;
  ata: EntityTable<Ata, "id">;
  producao: EntityTable<Producao, "id">;
  sync_queue: EntityTable<SyncQueue, "id">;
  conflict_log: EntityTable<ConflictLog, "id">;
};

db.version(1).stores({
  associado: "id, nome, status, deleted_at",
  mensalidade: "id, associado_id, data_pagamento, deleted_at",
  transacao_financeira: "id, tipo, data, deleted_at",
  ata: "id, data, deleted_at",
  producao: "id, associado_id, cultura, data, deleted_at",
  sync_queue: "++id, table_name, record_id, synced, created_at",
  conflict_log: "++id, table_name, record_id, resolved",
});

export { db };
