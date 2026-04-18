# Codebase Stack

**Mapped:** 2026-04-18

## Languages & Runtime

| Language | Version | Usage |
|----------|---------|-------|
| TypeScript | ~6.0.2 | All source code (apps + packages) |
| SQL | PostgreSQL | Database migrations (Drizzle) |

**Runtime:** Node.js (implied by package.json ecosystem)

## Package Manager & Build

| Tool | Version | Purpose |
|------|---------|---------|
| pnpm | 10.33.0 | Workspace package manager |
| Turborepo | ^2.9.5 | Monorepo build orchestration |
| Vite | ^8.0.4 (web), ^7.3.2 (root) | Frontend dev server & bundler |
| tsc | TypeScript ~6.0.2 | Type checking |

**Monorepo structure:** pnpm workspaces with `apps/*` and `packages/*`

## Frontend (`apps/web`)

| Dependency | Version | Purpose |
|------------|---------|---------|
| React | ^19.2.4 | UI framework |
| React DOM | ^19.2.4 | DOM rendering |
| Vite | ^8.0.4 | Dev server & bundler |
| @vitejs/plugin-react | ^6.0.1 | React Fast Refresh for Vite |
| Dexie | ^4.4.2 | IndexedDB wrapper (offline-first local DB) |
| Zustand | ^5.0.12 | Client state management |
| Axios | ^1.14.0 | HTTP client |
| vite-plugin-pwa | ^1.2.0 | PWA support (service workers) |
| workbox-build | ^7.4.0 | Service worker build tooling |

**Dev tooling:**
- ESLint ^9.39.4 with typescript-eslint ^8.58.0
- eslint-plugin-react-hooks ^7.0.1
- eslint-plugin-react-refresh ^0.5.2

## Backend (`apps/api`)

| Dependency | Version | Purpose |
|------------|---------|---------|
| Express | ^5.2.1 | HTTP server framework |
| CORS | ^2.8.6 | Cross-origin request handling |
| ts-node-dev | ^2.0.0 | Dev server with hot reload |

**Note:** API is very minimal — only a `/health` endpoint exists.

## Database (`packages/database`)

| Dependency | Version | Purpose |
|------------|---------|---------|
| Drizzle ORM | ^0.44.0 | TypeScript ORM / query builder |
| Drizzle Kit | ^0.31.0 | Schema migrations & tooling |
| @neondatabase/serverless | ^1.0.0 | Neon Postgres serverless driver |
| dotenv | ^16.5.0 | Environment variable loading |

**Database:** PostgreSQL via Neon (serverless)
**Connection:** HTTP-based via `@neondatabase/serverless` neon driver

## Configuration Files

| File | Location | Purpose |
|------|----------|---------|
| `turbo.json` | Root | Turborepo task definitions (dev, build) |
| `pnpm-workspace.yaml` | Root | Workspace package resolution |
| `drizzle.config.ts` | `packages/database/` | Drizzle migration config |
| `vite.config.ts` | `apps/web/` | Vite build configuration |
| `eslint.config.js` | `apps/web/` | ESLint flat config |
| `tsconfig.json` | Multiple | TypeScript settings per package |
| `.env.example` | Root | Environment template (`DATABASE_URL`) |

## Key Observations

- **Offline-first architecture:** Dexie (IndexedDB) on frontend with sync queue + conflict log tables — designed for offline usage with eventual sync
- **PWA-ready:** vite-plugin-pwa + workbox configured for service worker generation
- **Serverless DB:** Neon PostgreSQL with HTTP driver (no persistent connections)
- **Modern stack:** React 19, TypeScript 6, Vite 8, Express 5 — all cutting-edge versions
- **Minimal API:** Backend is essentially a skeleton — only health check endpoint
