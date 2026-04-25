# Quick Task: CRUD Backend Associados e Associações

**Date:** 2026-04-21
**Status:** complete

## What was done

### Schema
- **Associação** (new entity): nome, CNPJ (unique), endereço, telefone, email, status + sync fields
- **Associado** (updated): added cpf (unique), caf, telefone, endereço, comunidade, associacaoId (FK → associação)
- Migration `0002_confused_blizzard.sql` generated

### API Routes
| Entity | Route | Methods |
|---|---|---|
| Associado | `/associados` | POST, GET (list), GET /:id, PUT /:id, DELETE /:id |
| Associação | `/associacoes` | POST, GET (list), GET /:id, PUT /:id, DELETE /:id |

### Validation
- Associado: CPF unique check (409 on duplicate)
- Associação: CNPJ unique check (409 on duplicate)
- Required fields: nome + data_entrada (associado), nome (associação)

### Sync Integration
- Both entities registered in sync tables/types for offline-first compatibility
- Wire format: snake_case (frontend ↔ API)

### Tests
- 23 new tests (12 associado + 11 associação controller tests)
- All 58 tests passing

## Files Changed
- `packages/database/src/schema/associado.ts` — added associação table + updated associado fields
- `packages/database/src/schema/index.ts` — export associacao
- `packages/database/drizzle/0002_confused_blizzard.sql` — migration
- `apps/api/src/services/associado.service.ts` — new
- `apps/api/src/services/associacao.service.ts` — new
- `apps/api/src/controllers/associado.controller.ts` — new
- `apps/api/src/controllers/associacao.controller.ts` — new
- `apps/api/src/routes/associado.routes.ts` — new
- `apps/api/src/routes/associacao.routes.ts` — new
- `apps/api/src/create-app.ts` — registered new routers
- `apps/api/src/sync/sync.tables.ts` — added associacao
- `apps/api/src/sync/sync.types.ts` — added associacao
- `apps/api/src/__tests__/controllers/associado.controller.test.ts` — new
- `apps/api/src/__tests__/controllers/associacao.controller.test.ts` — new
- `apps/api/src/__tests__/controllers/sync.controller.test.ts` — fixed mocks
- `apps/api/src/__tests__/services/sync-push.service.test.ts` — fixed mocks

## Pending for Phase 2
- Role guards (adm-only for associação CRUD)
- Authentication middleware
