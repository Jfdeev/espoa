"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// ../../packages/database/dist/schema/associado.js
var require_associado = __commonJS({
  "../../packages/database/dist/schema/associado.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.associado = void 0;
    var pg_core_1 = require("drizzle-orm/pg-core");
    exports2.associado = (0, pg_core_1.pgTable)("associado", {
      id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
      nome: (0, pg_core_1.varchar)("nome", { length: 255 }).notNull(),
      contato: (0, pg_core_1.varchar)("contato", { length: 255 }),
      dataEntrada: (0, pg_core_1.date)("data_entrada").notNull(),
      status: (0, pg_core_1.varchar)("status", { length: 50 }).notNull().default("ativo"),
      version: (0, pg_core_1.integer)("version").notNull().default(1),
      updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => /* @__PURE__ */ new Date()),
      deviceId: (0, pg_core_1.varchar)("device_id", { length: 255 }),
      deletedAt: (0, pg_core_1.timestamp)("deleted_at", { withTimezone: true })
    });
  }
});

// ../../packages/database/dist/schema/mensalidade.js
var require_mensalidade = __commonJS({
  "../../packages/database/dist/schema/mensalidade.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.mensalidade = void 0;
    var pg_core_1 = require("drizzle-orm/pg-core");
    var associado_1 = require_associado();
    exports2.mensalidade = (0, pg_core_1.pgTable)("mensalidade", {
      id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
      associadoId: (0, pg_core_1.uuid)("associado_id").notNull().references(() => associado_1.associado.id),
      valor: (0, pg_core_1.real)("valor").notNull(),
      dataPagamento: (0, pg_core_1.date)("data_pagamento"),
      formaPagamento: (0, pg_core_1.varchar)("forma_pagamento", { length: 100 }),
      version: (0, pg_core_1.integer)("version").notNull().default(1),
      updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => /* @__PURE__ */ new Date()),
      deviceId: (0, pg_core_1.varchar)("device_id", { length: 255 }),
      deletedAt: (0, pg_core_1.timestamp)("deleted_at", { withTimezone: true })
    });
  }
});

// ../../packages/database/dist/schema/transacao-financeira.js
var require_transacao_financeira = __commonJS({
  "../../packages/database/dist/schema/transacao-financeira.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.transacaoFinanceira = void 0;
    var pg_core_1 = require("drizzle-orm/pg-core");
    exports2.transacaoFinanceira = (0, pg_core_1.pgTable)("transacao_financeira", {
      id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
      tipo: (0, pg_core_1.varchar)("tipo", { length: 100 }).notNull(),
      valor: (0, pg_core_1.real)("valor").notNull(),
      descricao: (0, pg_core_1.varchar)("descricao", { length: 500 }),
      data: (0, pg_core_1.date)("data").notNull(),
      version: (0, pg_core_1.integer)("version").notNull().default(1),
      updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => /* @__PURE__ */ new Date()),
      deviceId: (0, pg_core_1.varchar)("device_id", { length: 255 }),
      deletedAt: (0, pg_core_1.timestamp)("deleted_at", { withTimezone: true })
    });
  }
});

// ../../packages/database/dist/schema/ata.js
var require_ata = __commonJS({
  "../../packages/database/dist/schema/ata.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ata = void 0;
    var pg_core_1 = require("drizzle-orm/pg-core");
    exports2.ata = (0, pg_core_1.pgTable)("ata", {
      id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
      titulo: (0, pg_core_1.varchar)("titulo", { length: 255 }).notNull(),
      conteudo: (0, pg_core_1.text)("conteudo").notNull(),
      data: (0, pg_core_1.date)("data").notNull(),
      version: (0, pg_core_1.integer)("version").notNull().default(1),
      updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => /* @__PURE__ */ new Date()),
      deviceId: (0, pg_core_1.varchar)("device_id", { length: 255 }),
      deletedAt: (0, pg_core_1.timestamp)("deleted_at", { withTimezone: true })
    });
  }
});

// ../../packages/database/dist/schema/producao.js
var require_producao = __commonJS({
  "../../packages/database/dist/schema/producao.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.producao = void 0;
    var pg_core_1 = require("drizzle-orm/pg-core");
    var associado_1 = require_associado();
    exports2.producao = (0, pg_core_1.pgTable)("producao", {
      id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
      associadoId: (0, pg_core_1.uuid)("associado_id").notNull().references(() => associado_1.associado.id),
      cultura: (0, pg_core_1.varchar)("cultura", { length: 255 }).notNull(),
      quantidade: (0, pg_core_1.real)("quantidade").notNull(),
      data: (0, pg_core_1.date)("data").notNull(),
      version: (0, pg_core_1.integer)("version").notNull().default(1),
      updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => /* @__PURE__ */ new Date()),
      deviceId: (0, pg_core_1.varchar)("device_id", { length: 255 }),
      deletedAt: (0, pg_core_1.timestamp)("deleted_at", { withTimezone: true })
    });
  }
});

// ../../packages/database/dist/schema/edital-pnae.js
var require_edital_pnae = __commonJS({
  "../../packages/database/dist/schema/edital-pnae.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.editalPnae = void 0;
    var pg_core_1 = require("drizzle-orm/pg-core");
    exports2.editalPnae = (0, pg_core_1.pgTable)("edital_pnae", {
      id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
      titulo: (0, pg_core_1.varchar)("titulo", { length: 255 }).notNull(),
      descricao: (0, pg_core_1.text)("descricao"),
      dataInicio: (0, pg_core_1.date)("data_inicio").notNull(),
      dataFim: (0, pg_core_1.date)("data_fim").notNull(),
      status: (0, pg_core_1.varchar)("status", { length: 50 }).notNull().default("aberto"),
      version: (0, pg_core_1.integer)("version").notNull().default(1),
      updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => /* @__PURE__ */ new Date()),
      deviceId: (0, pg_core_1.varchar)("device_id", { length: 255 }),
      deletedAt: (0, pg_core_1.timestamp)("deleted_at", { withTimezone: true })
    });
  }
});

// ../../packages/database/dist/schema/relatorio-pnae.js
var require_relatorio_pnae = __commonJS({
  "../../packages/database/dist/schema/relatorio-pnae.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.relatorioPnae = void 0;
    var pg_core_1 = require("drizzle-orm/pg-core");
    var edital_pnae_1 = require_edital_pnae();
    exports2.relatorioPnae = (0, pg_core_1.pgTable)("relatorio_pnae", {
      id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
      editalId: (0, pg_core_1.uuid)("edital_id").notNull().references(() => edital_pnae_1.editalPnae.id),
      conteudo: (0, pg_core_1.text)("conteudo").notNull(),
      dataGeracao: (0, pg_core_1.date)("data_geracao").notNull()
    });
  }
});

// ../../packages/database/dist/schema/sync-queue.js
var require_sync_queue = __commonJS({
  "../../packages/database/dist/schema/sync-queue.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.syncQueue = void 0;
    var pg_core_1 = require("drizzle-orm/pg-core");
    exports2.syncQueue = (0, pg_core_1.pgTable)("sync_queue", {
      id: (0, pg_core_1.serial)("id").primaryKey(),
      operationId: (0, pg_core_1.varchar)("operation_id", { length: 255 }).notNull(),
      deviceId: (0, pg_core_1.varchar)("device_id", { length: 255 }).notNull(),
      tableName: (0, pg_core_1.varchar)("table_name", { length: 100 }).notNull(),
      recordId: (0, pg_core_1.varchar)("record_id", { length: 255 }).notNull(),
      operation: (0, pg_core_1.varchar)("operation", { length: 20 }).notNull(),
      payload: (0, pg_core_1.jsonb)("payload").notNull(),
      processed: (0, pg_core_1.integer)("processed").notNull().default(1),
      createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).notNull().defaultNow()
    }, (table) => ({
      deviceOperationUnique: (0, pg_core_1.unique)("sync_queue_device_id_operation_id_unique").on(table.deviceId, table.operationId)
    }));
  }
});

// ../../packages/database/dist/schema/index.js
var require_schema = __commonJS({
  "../../packages/database/dist/schema/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.syncQueue = exports2.relatorioPnae = exports2.editalPnae = exports2.producao = exports2.ata = exports2.transacaoFinanceira = exports2.mensalidade = exports2.associado = void 0;
    var associado_1 = require_associado();
    Object.defineProperty(exports2, "associado", { enumerable: true, get: function() {
      return associado_1.associado;
    } });
    var mensalidade_1 = require_mensalidade();
    Object.defineProperty(exports2, "mensalidade", { enumerable: true, get: function() {
      return mensalidade_1.mensalidade;
    } });
    var transacao_financeira_1 = require_transacao_financeira();
    Object.defineProperty(exports2, "transacaoFinanceira", { enumerable: true, get: function() {
      return transacao_financeira_1.transacaoFinanceira;
    } });
    var ata_1 = require_ata();
    Object.defineProperty(exports2, "ata", { enumerable: true, get: function() {
      return ata_1.ata;
    } });
    var producao_1 = require_producao();
    Object.defineProperty(exports2, "producao", { enumerable: true, get: function() {
      return producao_1.producao;
    } });
    var edital_pnae_1 = require_edital_pnae();
    Object.defineProperty(exports2, "editalPnae", { enumerable: true, get: function() {
      return edital_pnae_1.editalPnae;
    } });
    var relatorio_pnae_1 = require_relatorio_pnae();
    Object.defineProperty(exports2, "relatorioPnae", { enumerable: true, get: function() {
      return relatorio_pnae_1.relatorioPnae;
    } });
    var sync_queue_1 = require_sync_queue();
    Object.defineProperty(exports2, "syncQueue", { enumerable: true, get: function() {
      return sync_queue_1.syncQueue;
    } });
  }
});

// ../../packages/database/dist/connection.js
var require_connection = __commonJS({
  "../../packages/database/dist/connection.js"(exports2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __setModuleDefault = exports2 && exports2.__setModuleDefault || (Object.create ? (function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    }) : function(o, v) {
      o["default"] = v;
    });
    var __importStar = exports2 && exports2.__importStar || /* @__PURE__ */ (function() {
      var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function(o2) {
          var ar = [];
          for (var k in o2) if (Object.prototype.hasOwnProperty.call(o2, k)) ar[ar.length] = k;
          return ar;
        };
        return ownKeys(o);
      };
      return function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
          for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        }
        __setModuleDefault(result, mod);
        return result;
      };
    })();
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.db = void 0;
    var serverless_1 = require("@neondatabase/serverless");
    var dotenv_1 = require("dotenv");
    var neon_http_1 = require("drizzle-orm/neon-http");
    var node_fs_1 = require("node:fs");
    var node_path_1 = require("node:path");
    var schema = __importStar(require_schema());
    var envCandidates = [
      (0, node_path_1.resolve)(process.cwd(), ".env"),
      (0, node_path_1.resolve)(process.cwd(), "../../.env"),
      (0, node_path_1.resolve)(process.cwd(), "../../../.env")
    ];
    var envPath = envCandidates.find((filePath) => (0, node_fs_1.existsSync)(filePath));
    if (envPath) {
      (0, dotenv_1.config)({ path: envPath });
    }
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is required. Set it in the project root .env file.");
    }
    var sql = (0, serverless_1.neon)(process.env.DATABASE_URL);
    exports2.db = (0, neon_http_1.drizzle)({ client: sql, schema });
  }
});

// ../../packages/database/dist/index.js
var require_dist = __commonJS({
  "../../packages/database/dist/index.js"(exports2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __exportStar = exports2 && exports2.__exportStar || function(m, exports3) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports3, p)) __createBinding(exports3, m, p);
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.db = void 0;
    var connection_1 = require_connection();
    Object.defineProperty(exports2, "db", { enumerable: true, get: function() {
      return connection_1.db;
    } });
    __exportStar(require_schema(), exports2);
  }
});

// src/app.ts
var import_config = require("dotenv/config");
var import_cors = __toESM(require("cors"));
var import_express3 = __toESM(require("express"));

// src/routes/health.routes.ts
var import_express = require("express");
var healthRouter = (0, import_express.Router)();
healthRouter.get("/health", (_req, res) => {
  res.send({ status: "ok" });
});

// src/routes/sync.routes.ts
var import_express2 = require("express");

// src/services/sync-push.service.ts
var import_database2 = __toESM(require_dist());
var import_drizzle_orm = require("drizzle-orm");

// src/utils/case-mapper.ts
function toCamelObject(obj) {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(
      /_([a-z])/g,
      (_, letter) => letter.toUpperCase()
    );
    result[camelKey] = value;
  }
  return result;
}
function toSnakeObject(obj) {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(
      /[A-Z]/g,
      (letter) => `_${letter.toLowerCase()}`
    );
    result[snakeKey] = value;
  }
  return result;
}
function normalizePayload(payload) {
  const normalized = { ...payload };
  if (typeof normalized.updatedAt === "string") {
    normalized.updatedAt = new Date(normalized.updatedAt);
  }
  if (typeof normalized.deletedAt === "string") {
    normalized.deletedAt = new Date(normalized.deletedAt);
  }
  return normalized;
}

// src/sync/sync.tables.ts
var import_database = __toESM(require_dist());
var syncTables = {
  associado: import_database.associado,
  mensalidade: import_database.mensalidade,
  transacao_financeira: import_database.transacaoFinanceira,
  ata: import_database.ata,
  producao: import_database.producao
};
var syncTableNames = Object.keys(syncTables);
function createEmptyPulledRows() {
  return {
    associado: [],
    mensalidade: [],
    transacao_financeira: [],
    ata: [],
    producao: []
  };
}

// src/services/sync-push.service.ts
function isValidOperation(op) {
  return Boolean(
    op && op.operationId && op.tableName && op.operation && op.recordId && op.payload && Object.prototype.hasOwnProperty.call(syncTables, op.tableName)
  );
}
async function applyPushOperations(deviceId, ops) {
  const ackedOperationIds = [];
  for (const op of ops) {
    if (!isValidOperation(op)) {
      continue;
    }
    const processed = await import_database2.db.transaction(async (tx) => {
      const inserted = await tx.insert(import_database2.syncQueue).values({
        operationId: op.operationId,
        deviceId,
        tableName: op.tableName,
        recordId: op.recordId,
        operation: op.operation,
        payload: op.payload
      }).onConflictDoNothing().returning({ id: import_database2.syncQueue.id });
      if (inserted.length === 0) {
        return false;
      }
      await applyOperation(tx, op);
      return true;
    });
    if (processed) {
      ackedOperationIds.push(op.operationId);
    }
  }
  return ackedOperationIds;
}
async function applyOperation(tx, op) {
  const table = syncTables[op.tableName];
  const payload = normalizePayload(toCamelObject(op.payload));
  const now = /* @__PURE__ */ new Date();
  if (op.operation === "delete") {
    await tx.update(table).set({ deletedAt: now, updatedAt: now }).where((0, import_drizzle_orm.eq)(table.id, op.recordId));
    return;
  }
  await tx.insert(table).values({ ...payload, id: op.recordId, updatedAt: now }).onConflictDoUpdate({
    target: table.id,
    set: {
      ...payload,
      updatedAt: now
    }
  });
}

// src/services/sync-pull.service.ts
var import_database3 = __toESM(require_dist());
var import_drizzle_orm2 = require("drizzle-orm");
async function pullRowsByTable(lastPulledAt) {
  const pulled = createEmptyPulledRows();
  for (const tableName of syncTableNames) {
    pulled[tableName] = await getPulledRows(tableName, lastPulledAt);
  }
  return pulled;
}
async function getPulledRows(tableName, lastPulledAt) {
  const table = syncTables[tableName];
  const rows = lastPulledAt ? await import_database3.db.select().from(table).where((0, import_drizzle_orm2.gt)(table.updatedAt, lastPulledAt)) : await import_database3.db.select().from(table);
  return rows.map((row) => toSnakeObject(row));
}

// src/services/sync.service.ts
async function runSync(params) {
  const ackedOperationIds = await applyPushOperations(
    params.deviceId,
    params.push
  );
  const pulled = await pullRowsByTable(params.lastPulledAt);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  return {
    ackedOperationIds,
    pulled,
    serverTime: now,
    nextPullCursor: now
  };
}

// src/controllers/sync.controller.ts
async function postSync(req, res) {
  try {
    const body = req.body;
    const deviceId = body?.deviceId;
    if (!deviceId) {
      return res.status(400).json({ error: "deviceId is required" });
    }
    const push = Array.isArray(body?.push) ? body.push : [];
    const parsedDate = body?.lastPulledAt ? new Date(body.lastPulledAt) : null;
    const lastPulledAt = parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : null;
    const result = await runSync({
      deviceId,
      push,
      lastPulledAt
    });
    return res.json(result);
  } catch (error) {
    console.error("/sync error", error);
    return res.status(500).json({ error: "sync_failed" });
  }
}

// src/routes/sync.routes.ts
var syncRouter = (0, import_express2.Router)();
syncRouter.post("/sync", postSync);

// src/app.ts
var app = (0, import_express3.default)();
app.use((0, import_cors.default)());
app.use(import_express3.default.json());
app.use(healthRouter);
app.use(syncRouter);
app.listen(process.env.PORT || 8080, () => {
  console.log(`API rodando na porta ${process.env.PORT || 8080}`);
});
