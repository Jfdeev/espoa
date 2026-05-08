import Dexie, { type EntityTable } from "dexie";
import type {
  Associacao,
  Associado,
  Mensalidade,
  TransacaoFinanceira,
  Ata,
  Producao,
  EditalPnae,
  UsuarioAssociacao,
  SyncQueue,
  ConflictLog,
} from "./types";

const db = new Dexie("espoa_db") as Dexie & {
  associacao: EntityTable<Associacao, "id">;
  associado: EntityTable<Associado, "id">;
  mensalidade: EntityTable<Mensalidade, "id">;
  transacao_financeira: EntityTable<TransacaoFinanceira, "id">;
  ata: EntityTable<Ata, "id">;
  producao: EntityTable<Producao, "id">;
  edital_pnae: EntityTable<EditalPnae, "id">;
  usuario_associacao: EntityTable<UsuarioAssociacao, "id">;
  sync_queue: EntityTable<SyncQueue, "id">;
  conflict_log: EntityTable<ConflictLog, "id">;
};

// v1 — schema original (preservado para upgrade)
db.version(1).stores({
  associado: "id, nome, status, deleted_at",
  mensalidade: "id, associado_id, data_pagamento, deleted_at",
  transacao_financeira: "id, tipo, data, deleted_at",
  ata: "id, data, deleted_at",
  producao: "id, associado_id, cultura, data, deleted_at",
  sync_queue: "++id, table_name, record_id, synced, created_at",
  conflict_log: "++id, table_name, record_id, resolved",
});

// v2 — adiciona tabela associacao
db.version(2)
  .stores({
    associacao: "id, nome, municipio, status, deleted_at",
    associado: "id, nome, status, deleted_at",
    mensalidade: "id, associado_id, data_pagamento, deleted_at",
    transacao_financeira: "id, tipo, data, deleted_at",
    ata: "id, data, deleted_at",
    producao: "id, associado_id, cultura, data, deleted_at",
    sync_queue: "++id, table_name, record_id, synced, created_at",
    conflict_log: "++id, table_name, record_id, resolved",
  })
  .upgrade(() => {
    // Sem alterações em tabelas existentes — upgrade sem-op é suficiente
  });

// v3 — adiciona tabela usuario_associacao (Phase 5: intent-based sync)
db.version(3)
  .stores({
    associacao: "id, nome, municipio, status, deleted_at",
    associado: "id, nome, status, deleted_at",
    mensalidade: "id, associado_id, data_pagamento, deleted_at",
    transacao_financeira: "id, tipo, data, deleted_at",
    ata: "id, data, deleted_at",
    producao: "id, associado_id, cultura, data, deleted_at",
    usuario_associacao: "id, usuario_id, associacao_id, status, updated_at",
    sync_queue: "++id, table_name, record_id, synced, created_at",
    conflict_log: "++id, table_name, record_id, resolved",
  })
  .upgrade(() => {
    // usuario_associacao is a new table — no data migration needed
  });

// v4 — adiciona tabela edital_pnae
db.version(4)
  .stores({
    associacao: "id, nome, municipio, status, deleted_at",
    associado: "id, nome, status, deleted_at",
    mensalidade: "id, associado_id, data_pagamento, deleted_at",
    transacao_financeira: "id, tipo, data, deleted_at",
    ata: "id, data, deleted_at",
    producao: "id, associado_id, cultura, data, deleted_at",
    usuario_associacao: "id, usuario_id, associacao_id, status, updated_at",
    edital_pnae: "id, associacao_id, status, data_limite, deleted_at",
    sync_queue: "++id, table_name, record_id, synced, created_at",
    conflict_log: "++id, table_name, record_id, resolved",
  })
  .upgrade(() => {
    // edital_pnae is a new table — no data migration needed
  });

// v5 — adiciona index created_at em conflict_log
db.version(5)
  .stores({
    associacao: "id, nome, municipio, status, deleted_at",
    associado: "id, nome, status, deleted_at",
    mensalidade: "id, associado_id, data_pagamento, deleted_at",
    transacao_financeira: "id, tipo, data, deleted_at",
    ata: "id, data, deleted_at",
    producao: "id, associado_id, cultura, data, deleted_at",
    usuario_associacao: "id, usuario_id, associacao_id, status, updated_at",
    edital_pnae: "id, associacao_id, status, data_limite, deleted_at",
    sync_queue: "++id, table_name, record_id, synced, created_at",
    conflict_log: "++id, table_name, record_id, resolved, created_at",
  })
  .upgrade(() => {
    // Index-only change — no data migration needed
  });

export { db };
