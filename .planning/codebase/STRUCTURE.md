# Codebase Structure

**Mapped:** 2026-04-18

## Directory Layout

```
espoa/                              # Root — pnpm monorepo
├── package.json                    # Root workspace config (pnpm 10.33, turborepo)
├── pnpm-workspace.yaml             # Workspace: apps/* + packages/*
├── pnpm-lock.yaml                  # Lockfile
├── turbo.json                      # Turborepo task config (dev, build)
├── .env.example                    # DATABASE_URL template
│
├── apps/
│   ├── web/                        # React PWA frontend
│   │   ├── package.json            # React 19, Dexie, Zustand, Vite
│   │   ├── index.html              # SPA entry point
│   │   ├── vite.config.ts          # Vite config (react plugin)
│   │   ├── eslint.config.js        # ESLint flat config
│   │   ├── tsconfig.json           # References app + node configs
│   │   ├── tsconfig.app.json       # App TypeScript settings
│   │   ├── tsconfig.node.json      # Node TypeScript settings
│   │   ├── public/                 # Static assets
│   │   └── src/
│   │       ├── main.tsx            # React root (StrictMode)
│   │       ├── App.tsx             # Main component (Vite starter template)
│   │       ├── App.css             # Component styles
│   │       ├── index.css           # Global styles + CSS variables
│   │       ├── assets/             # Images (hero.png, logos)
│   │       └── database/
│   │           ├── db.ts           # Dexie database setup (7 tables)
│   │           ├── types.ts        # TypeScript interfaces for all entities
│   │           └── index.ts        # Re-exports db + types
│   │
│   ├── api/                        # Express backend (skeleton)
│   │   ├── package.json            # Express 5, CORS
│   │   ├── tsconfig.json           # CommonJS target
│   │   └── src/
│   │       └── app.ts              # Health check endpoint only
│   │
│   └── ai/                         # AI module (placeholder)
│       └── ai.txt                  # Placeholder content
│
├── packages/
│   └── database/                   # Shared database package (@espoa/database)
│       ├── package.json            # Drizzle ORM, Neon driver
│       ├── drizzle.config.ts       # PostgreSQL dialect, schema path
│       ├── tsconfig.json           # ESNext module, bundler resolution
│       ├── drizzle/
│       │   ├── 0000_many_prism.sql # Initial migration (7 tables)
│       │   └── meta/               # Drizzle migration metadata
│       └── src/
│           ├── index.ts            # Package entry (re-exports)
│           ├── connection.ts       # Neon HTTP connection + Drizzle setup
│           └── schema/
│               ├── index.ts        # Schema barrel export
│               ├── associado.ts    # Member table
│               ├── mensalidade.ts  # Monthly dues table
│               ├── transacao-financeira.ts  # Financial transaction table
│               ├── ata.ts          # Meeting minutes table
│               ├── producao.ts     # Production table
│               ├── edital-pnae.ts  # PNAE public notice table
│               └── relatorio-pnae.ts # PNAE report table
│
├── docs/                           # Empty — reserved for documentation
└── infra/                          # Empty — reserved for infrastructure
```

## Key Locations

| What | Where |
|------|-------|
| Workspace root | `package.json` + `pnpm-workspace.yaml` |
| Frontend source | `apps/web/src/` |
| Frontend DB (Dexie) | `apps/web/src/database/` |
| API source | `apps/api/src/` |
| Database schemas (Drizzle) | `packages/database/src/schema/` |
| Database connection | `packages/database/src/connection.ts` |
| Migrations | `packages/database/drizzle/` |
| Environment config | `.env.example` (root) |

## Naming Conventions

### Files
- **Schema files:** kebab-case matching table name (`edital-pnae.ts`, `transacao-financeira.ts`)
- **Component files:** PascalCase (`App.tsx`)
- **Config files:** lowercase with dots (`vite.config.ts`, `drizzle.config.ts`)
- **Barrel exports:** `index.ts` per module

### Code
- **Database columns:** snake_case in SQL (`associado_id`, `data_pagamento`)
- **TypeScript fields (Drizzle):** camelCase (`associadoId`, `dataPagamento`)
- **TypeScript interfaces (Dexie):** snake_case to match DB (`associado_id`, `data_pagamento`)
- **Table names:** snake_case in Portuguese (`transacao_financeira`, `edital_pnae`)
- **Exported symbols:** camelCase for tables (`transacaoFinanceira`), PascalCase for types (`TransacaoFinanceira`)

### Language
- **Domain terms:** Portuguese (associado, mensalidade, ata, produção, edital)
- **Technical terms:** English (config, connection, schema, version, status)
- **Package names:** English (`@espoa/database`, `web`, `api`)
