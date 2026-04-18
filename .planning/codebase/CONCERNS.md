# Codebase Concerns

**Mapped:** 2026-04-18

## Technical Debt

### HIGH — Schema Drift Between Client and Server

**Location:** `apps/web/src/database/types.ts` vs `packages/database/src/schema/*.ts`

The Dexie client-side types and the Drizzle server-side schemas define the same entities independently. There is no shared type source — changes to one require manual updates to the other.

- **Client types:** snake_case field names (`data_entrada`, `associado_id`)
- **Server schemas:** camelCase field names in TS (`dataEntrada`, `associadoId`)
- **Risk:** Schema drift will cause silent sync failures when the sync layer is built

**Recommendation:** Generate Dexie types from Drizzle schema or use a shared type package.

### HIGH — No Sync Implementation

**Location:** `apps/web/src/database/db.ts` (sync_queue, conflict_log tables defined but unused)

The offline-first architecture is designed (sync queue + conflict log + version fields on all entities) but none of the sync logic is implemented:
- No sync service/worker
- No API endpoints for sync operations
- No conflict resolution logic
- No connection status detection

**Risk:** Core architectural promise (offline-first with sync) has zero implementation.

### MEDIUM — Boilerplate UI

**Location:** `apps/web/src/App.tsx`

The frontend is still the Vite React starter template (counter button, documentation links). No actual application UI exists.

### MEDIUM — Skeleton API

**Location:** `apps/api/src/app.ts`

Only a health check endpoint exists. No routes, no middleware, no controllers, no connection to the database package.

### LOW — `relatorio_pnae` Missing Sync Fields

**Location:** `packages/database/src/schema/relatorio-pnae.ts`

Unlike all other entity tables, `relatorio_pnae` is missing the standard sync fields:
- No `version`
- No `updated_at`
- No `device_id`
- No `deleted_at`

This table will not participate in the offline sync pattern unless these fields are added.

## Security Concerns

### Unsafe Environment Variable Access

**Location:** `packages/database/src/connection.ts`

```typescript
const sql = neon(process.env.DATABASE_URL!);
```

Non-null assertion on `DATABASE_URL` — if missing, will crash with cryptic error instead of clear message.

**Also in:** `packages/database/drizzle.config.ts`

### No Authentication

No auth system exists. The API has open CORS and no auth middleware. Before exposing any data endpoints, authentication must be implemented.

### No Input Validation

Express API has `express.json()` but no validation library (Zod, Joi, etc.) and no validation middleware.

### CORS Wide Open

**Location:** `apps/api/src/app.ts`

```typescript
app.use(cors());
```

Default CORS allows all origins. Must be restricted before production.

## Performance Concerns

### Dexie Indexing

**Location:** `apps/web/src/database/db.ts`

Current indexes are minimal. As data grows, queries on non-indexed fields will slow down. The indexed fields are:
- `associado`: id, nome, status, deleted_at
- `mensalidade`: id, associado_id, data_pagamento, deleted_at
- `transacao_financeira`: id, tipo, data, deleted_at
- `ata`: id, data, deleted_at
- `producao`: id, associado_id, cultura, data, deleted_at

Missing indexes that may be needed: date ranges, valor ranges, combined filters.

### Real Type for Currency

**Location:** `packages/database/src/schema/mensalidade.ts`, `transacao-financeira.ts`, `producao.ts`

Using `real` (floating point) for monetary values (`valor`). Floating point arithmetic introduces rounding errors with currency.

**Recommendation:** Use `numeric`/`decimal` for financial amounts to avoid precision loss.

## Fragile Areas

### Migration State

Only one migration exists (`0000_many_prism.sql`). The migration creates all 7 tables and foreign keys. Any schema changes will require careful migration planning since the base migration assumes a clean database.

### Dual Database Pattern

The app has two database layers (Dexie local + Neon remote) that must stay in sync by design. Any entity change requires updates in three places:
1. `packages/database/src/schema/*.ts` (Drizzle)
2. `apps/web/src/database/types.ts` (TypeScript interfaces)
3. `apps/web/src/database/db.ts` (Dexie store definition)

This triple-update pattern is error-prone without automation.
