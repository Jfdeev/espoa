import Dexie, { type EntityTable } from "dexie";
import type {
  Associacao,
  Associado,
  AreaPlantada,
  Mensalidade,
  TransacaoFinanceira,
  Ata,
  Aviso,
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
  aviso: EntityTable<Aviso, "id">;
  producao: EntityTable<Producao, "id">;
  area_plantada: EntityTable<AreaPlantada, "id">;
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

// v4 — adiciona usuario_id como índice na tabela mensalidade
db.version(4).stores({
  associacao: "id, nome, municipio, status, deleted_at",
  associado: "id, nome, status, deleted_at",
  mensalidade: "id, associado_id, usuario_id, data_pagamento, deleted_at",
  transacao_financeira: "id, tipo, data, deleted_at",
  ata: "id, data, deleted_at",
  producao: "id, associado_id, cultura, data, deleted_at",
  usuario_associacao: "id, usuario_id, associacao_id, status, updated_at",
  sync_queue: "++id, table_name, record_id, synced, created_at",
  conflict_log: "++id, table_name, record_id, resolved",
});

// v5 — adiciona usuario_id como índice na tabela associado
db.version(5).stores({
  associacao: "id, nome, municipio, status, deleted_at",
  associado: "id, nome, usuario_id, status, deleted_at",
  mensalidade: "id, associado_id, usuario_id, data_pagamento, deleted_at",
  transacao_financeira: "id, tipo, data, deleted_at",
  ata: "id, data, deleted_at",
  producao: "id, associado_id, cultura, data, deleted_at",
  usuario_associacao: "id, usuario_id, associacao_id, status, updated_at",
  sync_queue: "++id, table_name, record_id, synced, created_at",
  conflict_log: "++id, table_name, record_id, resolved",
});

// v6 — adiciona tabela edital_pnae e índice created_at em conflict_log
db.version(6)
  .stores({
    associacao: "id, nome, municipio, status, deleted_at",
    associado: "id, nome, usuario_id, status, deleted_at",
    mensalidade: "id, associado_id, usuario_id, data_pagamento, deleted_at",
    transacao_financeira: "id, tipo, data, deleted_at",
    ata: "id, data, deleted_at",
    producao: "id, associado_id, cultura, data, deleted_at",
    usuario_associacao: "id, usuario_id, associacao_id, status, updated_at",
    edital_pnae: "id, associacao_id, status, data_limite, deleted_at",
    sync_queue: "++id, table_name, record_id, synced, created_at",
    conflict_log: "++id, table_name, record_id, resolved, created_at",
  })
  .upgrade(() => {
    // New table + index-only changes — no data migration needed
  });

// v7 — adiciona associacao_id como índice em transacao_financeira
db.version(7).stores({
  associacao: "id, nome, municipio, status, deleted_at",
  associado: "id, nome, usuario_id, status, deleted_at",
  mensalidade: "id, associado_id, usuario_id, data_pagamento, deleted_at",
  transacao_financeira: "id, associacao_id, tipo, data, deleted_at",
  ata: "id, data, deleted_at",
  producao: "id, associado_id, cultura, data, deleted_at",
  usuario_associacao: "id, usuario_id, associacao_id, status, updated_at",
  edital_pnae: "id, associacao_id, status, data_limite, deleted_at",
  sync_queue: "++id, table_name, record_id, synced, created_at",
  conflict_log: "++id, table_name, record_id, resolved, created_at",
});

// v8 — adiciona associacao_id como índice na tabela ata
db.version(8).stores({
  associacao: "id, nome, municipio, status, deleted_at",
  associado: "id, nome, usuario_id, status, deleted_at",
  mensalidade: "id, associado_id, usuario_id, data_pagamento, deleted_at",
  transacao_financeira: "id, associacao_id, tipo, data, deleted_at",
  ata: "id, associacao_id, data, deleted_at",
  producao: "id, associado_id, cultura, data, deleted_at",
  usuario_associacao: "id, usuario_id, associacao_id, status, updated_at",
  edital_pnae: "id, associacao_id, status, data_limite, deleted_at",
  sync_queue: "++id, table_name, record_id, synced, created_at",
  conflict_log: "++id, table_name, record_id, resolved, created_at",
});

// v9 — adiciona associacao_id como índice em associado para filtrar por associação ativa
db.version(9).stores({
  associacao: "id, nome, municipio, status, deleted_at",
  associado: "id, nome, usuario_id, associacao_id, status, deleted_at",
  mensalidade: "id, associado_id, usuario_id, data_pagamento, deleted_at",
  transacao_financeira: "id, associacao_id, tipo, data, deleted_at",
  ata: "id, associacao_id, data, deleted_at",
  producao: "id, associado_id, cultura, data, deleted_at",
  usuario_associacao: "id, usuario_id, associacao_id, status, updated_at",
  edital_pnae: "id, associacao_id, status, data_limite, deleted_at",
  sync_queue: "++id, table_name, record_id, synced, created_at",
  conflict_log: "++id, table_name, record_id, resolved, created_at",
});

// v10 — adiciona tabela aviso (quadro de avisos da associação)
db.version(10)
  .stores({
    associacao: "id, nome, municipio, status, deleted_at",
    associado: "id, nome, usuario_id, associacao_id, status, deleted_at",
    mensalidade: "id, associado_id, usuario_id, data_pagamento, deleted_at",
    transacao_financeira: "id, associacao_id, tipo, data, deleted_at",
    ata: "id, associacao_id, data, deleted_at",
    producao: "id, associado_id, cultura, data, deleted_at",
    usuario_associacao: "id, usuario_id, associacao_id, status, updated_at",
    edital_pnae: "id, associacao_id, status, data_limite, deleted_at",
    aviso: "id, associacao_id, expira_em, deleted_at, updated_at",
    sync_queue: "++id, table_name, record_id, synced, created_at",
    conflict_log: "++id, table_name, record_id, resolved, created_at",
  })
  .upgrade(() => {
    // Nova tabela — sem migração de dados
  });

// v11 — adiciona tabela area_plantada (registro de área plantada por cultura)
db.version(11)
  .stores({
    associacao: "id, nome, municipio, status, deleted_at",
    associado: "id, nome, usuario_id, associacao_id, status, deleted_at",
    mensalidade: "id, associado_id, usuario_id, data_pagamento, deleted_at",
    transacao_financeira: "id, associacao_id, tipo, data, deleted_at",
    ata: "id, associacao_id, data, deleted_at",
    producao: "id, associado_id, cultura, data, deleted_at",
    area_plantada: "id, associado_id, cultura, data_referencia, deleted_at",
    usuario_associacao: "id, usuario_id, associacao_id, status, updated_at",
    edital_pnae: "id, associacao_id, status, data_limite, deleted_at",
    aviso: "id, associacao_id, expira_em, deleted_at, updated_at",
    sync_queue: "++id, table_name, record_id, synced, created_at",
    conflict_log: "++id, table_name, record_id, resolved, created_at",
  })
  .upgrade(() => {
    // Nova tabela — sem migração de dados
  });

export { db };
