# Codebase Architecture

**Mapped:** 2026-04-18

## Architectural Pattern

**Offline-first PWA with eventual sync to serverless PostgreSQL.**

The system is designed as a Progressive Web App that works entirely offline using IndexedDB (Dexie), with a planned synchronization layer to push/pull data to a Neon PostgreSQL backend.

## System Layers

```
┌────────────────────────────────────────────┐
│  Browser (PWA)                              │
│  ┌──────────────────────────────────────┐  │
│  │  React 19 + Zustand (UI + State)     │  │
│  │  ┌──────────────────────────────┐    │  │
│  │  │  Dexie / IndexedDB           │    │  │
│  │  │  (local-first data store)    │    │  │
│  │  └──────────────────────────────┘    │  │
│  │  ┌──────────────────────────────┐    │  │
│  │  │  Sync Queue + Conflict Log   │    │  │
│  │  │  (planned, not implemented)  │    │  │
│  │  └──────────────────────────────┘    │  │
│  └──────────────────────────────────────┘  │
│                     │ Axios                 │
│                     ▼                       │
│  ┌──────────────────────────────────────┐  │
│  │  Express API (apps/api)              │  │
│  │  (skeleton — health check only)      │  │
│  └──────────────────────────────────────┘  │
│                     │ Drizzle ORM / Neon    │
│                     ▼                       │
│  ┌──────────────────────────────────────┐  │
│  │  Neon PostgreSQL (serverless)        │  │
│  │  (schema defined, not populated)     │  │
│  └──────────────────────────────────────┘  │
└────────────────────────────────────────────┘
```

## Data Flow

1. **User interacts** with React UI
2. **Data persists locally** to IndexedDB via Dexie
3. **Sync queue records** operations (create/update/delete) — planned but not wired
4. **Sync process** (not implemented) would push queue to Express API
5. **API** (not implemented) would write to Neon PostgreSQL via Drizzle ORM
6. **Conflict resolution** (not implemented) would use version + updated_at fields

## Component Boundaries

### `apps/web` — Frontend PWA
- **Responsibility:** UI rendering, local data storage, offline experience
- **Talks to:** IndexedDB (directly), Express API (planned via Axios)
- **Technology:** React 19, Dexie, Zustand, Vite
- **State:** Boilerplate UI (Vite starter template) + database schema defined

### `apps/api` — Backend API
- **Responsibility:** HTTP API for data sync (planned)
- **Talks to:** Neon PostgreSQL (planned via `@espoa/database` package)
- **Technology:** Express 5, CORS
- **State:** Skeleton — only `/health` endpoint

### `packages/database` — Shared Database Package
- **Responsibility:** Schema definitions, database connection, migrations
- **Talks to:** Neon PostgreSQL via drizzle-orm + @neondatabase/serverless
- **Technology:** Drizzle ORM, Drizzle Kit
- **Exported:** `db` connection instance, all schema tables
- **State:** Fully defined schemas, migration generated

### `apps/ai` — AI Module (Placeholder)
- **Responsibility:** Unknown — contains only placeholder text
- **State:** Empty

### `docs/` and `infra/` — Empty Directories
- Reserved for documentation and infrastructure-as-code

## Domain Model

The database schema reveals a **cooperative/association management** domain:

```
associado (member)
  ├── mensalidade (monthly dues/payment)
  └── producao (agricultural production)

transacao_financeira (financial transaction — standalone)

ata (meeting minutes — standalone)

edital_pnae (PNAE public notice/bid)
  └── relatorio_pnae (PNAE report)
```

**PNAE** = Programa Nacional de Alimentação Escolar (Brazilian National School Feeding Program)

### Entity Relationships
- `mensalidade.associado_id` → `associado.id` (FK)
- `producao.associado_id` → `associado.id` (FK)
- `relatorio_pnae.edital_id` → `edital_pnae.id` (FK)
- `transacao_financeira` — no foreign keys (standalone)
- `ata` — no foreign keys (standalone)

## Entry Points

| Entry Point | File | Purpose |
|-------------|------|---------|
| Web app | `apps/web/src/main.tsx` | React root render |
| API server | `apps/api/src/app.ts` | Express server start |
| DB package | `packages/database/src/index.ts` | Re-exports db + schema |

## Build Order (Dependencies)

1. `packages/database` — no internal dependencies, builds first
2. `apps/api` — depends on `@espoa/database` (planned)
3. `apps/web` — standalone (Dexie mirrors database schema locally)
