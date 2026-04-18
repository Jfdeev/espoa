# Codebase Integrations

**Mapped:** 2026-04-18

## External Services

### Neon PostgreSQL (Database)

- **Type:** Serverless PostgreSQL
- **Connection:** HTTP via `@neondatabase/serverless` neon driver
- **Config:** `DATABASE_URL` environment variable (from `.env` at project root)
- **Driver code:** `packages/database/src/connection.ts`
- **Usage:** Drizzle ORM wraps the neon HTTP client

```typescript
// packages/database/src/connection.ts
const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle({ client: sql, schema });
```

### IndexedDB (Client-side via Dexie)

- **Type:** Browser-local database (offline-first)
- **Library:** Dexie ^4.4.2
- **Database name:** `espoa_db`
- **Config:** `apps/web/src/database/db.ts`
- **Tables:** associado, mensalidade, transacao_financeira, ata, producao, sync_queue, conflict_log

## APIs

### Express API (`apps/api`)

- **Port:** 3001
- **Endpoints:**
  - `GET /health` → `{ status: "ok" }`
- **Middleware:** CORS (open), JSON body parser
- **Status:** Skeleton — no business logic implemented

## Data Sync Architecture (Designed, Not Implemented)

The client-side schema in `apps/web/src/database/types.ts` reveals a planned sync architecture:

### Sync Queue (`sync_queue` table)
- Tracks pending operations: `create`, `update`, `delete`
- Fields: `table_name`, `record_id`, `operation`, `payload`, `synced`
- Purpose: Queue local changes for eventual sync to server

### Conflict Log (`conflict_log` table)
- Tracks sync conflicts: `local_data` vs `remote_data`
- Fields: `table_name`, `record_id`, `resolved`
- Purpose: Record conflicts for manual or automatic resolution

### Sync-Ready Fields (all entity tables)
- `version` (integer) — Optimistic concurrency control
- `updated_at` (timestamp) — Last modification time
- `device_id` (string) — Origin device identifier
- `deleted_at` (timestamp) — Soft delete support

## Authentication

- **None implemented.** No auth middleware, no user model, no session management.

## Third-Party APIs

- **None configured.** No external API integrations beyond database.

## Webhooks

- **None configured.**
