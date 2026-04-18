# Research Synthesis

**Project:** Espoa — Rural Association Management PWA
**Synthesized:** 2026-04-18
**Sources:** STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md

---

## Executive Summary

Espoa is an offline-first PWA for Brazilian rural associations that manage members, finances, production, and PNAE (school meal program) participation. The existing codebase already provides the monorepo skeleton (React 19 + Vite + Dexie + Express 5 + Drizzle + Neon), a landing page, and schema definitions for 7 domain entities. What's missing is everything that makes it functional: UI screens, authentication, sync, API endpoints, and validation.

The recommended approach is to build on the existing stack with targeted additions — custom sync (not Dexie Cloud, which caps at 3 free users), Arctic + jose for auth (not Passport.js, which is stale), Zod for shared validation, and React Hook Form + React Router for the UI layer. The architecture follows a strict local-first pattern: all writes go to Dexie first, enqueue to sync_queue in the same transaction, and push to the server when online. No server call ever blocks a user operation.

The critical risk is the schema: floating-point currency fields will silently corrupt financial data, `relatorio_pnae` lacks sync fields, and client/server schemas diverge in naming convention with no shared type source. These must be fixed before any feature work begins. Secondary risks are offline auth (expired JWT must not lock users out of local data) and sync resilience on rural 2G/3G networks (small batches, idempotent operations, queue compaction).

---

## Key Findings

### Stack — What to Add (from STACK.md)

| Addition | Purpose | Confidence |
|----------|---------|------------|
| `dexie-react-hooks` | Reactive IndexedDB reads via `useLiveQuery` | HIGH |
| `arctic` + `jose` | Google OAuth + JWT (replaces stale Passport.js) | HIGH |
| `zod` v4 + `drizzle-zod` | Shared validation, single type source of truth | HIGH |
| `react-hook-form` + `@hookform/resolvers` | Forms with Zod integration, minimal re-renders | HIGH |
| `react-router` v7 | Client-side routing | HIGH |
| `recharts` + `@tanstack/react-table` | Dashboard charts and data tables | HIGH |
| Custom sync layer | Push sync_queue → Express API → Neon (NOT Dexie Cloud) | HIGH |

**Key rejection:** Dexie Cloud (3-user free tier, €0.12/user/month — unfit for non-profit rural associations). MUI (still MD2, Emotion runtime conflicts with Tailwind). Passport.js (core 2 years stale, Google strategy 7 years stale).

### Features — Categorized (from FEATURES.md)

| Category | Count | Highlights |
|----------|-------|------------|
| **Table Stakes** | 11 | Associado CRUD, Mensalidades, Financeiro, Atas, Produção, Dashboard, Transparência, Auth, Edital PNAE, Relatórios PNAE, Busca/Filtros |
| **Differentiators** | 5 | Matching Produção↔Edital, Projeto de Venda (killer feature), Alertas, Histórico 360°, Modo Agricultor Simplificado |
| **Anti-Features** | 8 | Chat, Marketplace, Multi-tenancy, Accounting, OCR, Offline AI, Approval workflows, Gov system integration |

**Critical path:** Associado → Mensalidade + Produção → Edital → Projeto de Venda

**Killer feature:** Projeto de Venda builder (auto-populate PNAE sales project from member + production + edital data). Highest value, highest complexity — depends on all data being correct first.

### Architecture — Core Decisions (from ARCHITECTURE.md)

1. **Local-first writes:** Dexie write + sync_queue enqueue in single transaction. UI updates instantly via `useLiveQuery`.
2. **Sync pattern:** Operation-based sync queue → batched push (10-20 ops) → delta pull with `since` timestamp → version-based conflict detection.
3. **Auth for offline:** 30-day JWT. Expired token blocks sync, NOT local access. Separate `device_id` (per install) from `user_id` (from OAuth).
4. **Two-profile UX:** Farmer = bottom nav, large targets, read-focused. Admin = side nav, tables, full CRUD.
5. **Build order:** 5 waves — (1) Schema fixes + shared types, (2) Data layer + auth, (3) Sync engine, (4) UI screens, (5) Dashboard + polish.
6. **Conflict resolution:** Auto last-write-wins for most entities, server-wins for financial data, manual admin review for edge cases.

### Top Pitfalls (from PITFALLS.md)

| # | Pitfall | Severity | When to Fix |
|---|---------|----------|-------------|
| 1 | `real` (float) for currency → silent rounding drift | CRITICAL | Schema migration (before any financial data) |
| 2 | Schema drift: Dexie snake_case ≠ Drizzle camelCase, no shared types | CRITICAL | Schema unification phase |
| 3 | `relatorio_pnae` missing 4 sync fields → excluded from sync | CRITICAL | Schema migration |
| 4 | Sync queue grows unbounded on flaky rural networks | CRITICAL | Sync engine design (batching, idempotency, compaction) |
| 5 | IndexedDB eviction without `navigator.storage.persist()` | CRITICAL | PWA hardening |
| 6 | Expired JWT locks users out of local data | CRITICAL | Auth architecture |
| 7 | `navigator.onLine` lies (WiFi without internet) | HIGH | Heartbeat endpoint in sync engine |
| 8 | Conflict resolution UX unusable for farmers | HIGH | Sync UI phase |
| 10 | CPF stored in plain text violates LGPD | HIGH | Schema + auth phases |
| 11 | Dexie migration breaks existing local data | HIGH | Every schema change |
| 17 | Performance cliff on target hardware (Moto E, 2GB RAM) | HIGH | Every UI phase |

Total: 6 critical, 5 high, 6 moderate, 4 minor pitfalls cataloged.

---

## Schema Changes Required Before Feature Work

These are blocking — features built on the broken schema will need rework.

| Entity | Change | Why |
|--------|--------|-----|
| `transacao_financeira` | `real("valor")` → `numeric("valor", { precision: 12, scale: 2 })` | Floating-point corruption (Pitfall 1) |
| `mensalidade` | Same currency fix + add `mes_referencia`, `status` | Can't track which month a payment covers |
| `producao` | Same currency fix + add `unidade`, `preco_unitario` | "100 tomates" vs "100kg tomates" is ambiguous |
| `associado` | Add `cpf`, `endereco`, `numero_caf`, `telefone`, `comunidade` | CPF required for PNAE. CAF number for eligibility |
| `edital_pnae` | Add `entidade_executora`, `produtos_solicitados`, `valor_total` | Core data for matching and proposal generation |
| `relatorio_pnae` | Add `version`, `updatedAt`, `deviceId`, `deletedAt` + structured fields | Only entity without sync support (Pitfall 3) |
| `transacao_financeira` | Add `categoria` | Needed for PNAE reporting (separate AF revenue) |
| **Dexie side** | Store `valor` as integer centavos | Eliminate floating-point math entirely in IndexedDB |

---

## Implications for Roadmap

### Suggested Build Order (7 phases)

**Phase 1: Schema Migration + Shared Validation**
Fix currency types, add missing fields, add sync fields to `relatorio_pnae`. Set up `drizzle-zod` for shared schemas. Create field-name mapping layer (snake_case ↔ camelCase). Must complete before anything else.
- Addresses: Pitfalls 1, 2, 3, 11
- Delivers: Clean schema, shared Zod types, Dexie migration tested

**Phase 2: Authentication + PWA Hardening**
Arctic + jose auth flow, 30-day JWT, offline session that never blocks local access, `navigator.storage.persist()`, service worker update prompt.
- Addresses: Pitfalls 5, 6, 9, 10, 20
- Delivers: Login flow, route guards, persistent storage, install experience

**Phase 3: Core CRUD UI (Associado → Mensalidade → Financeiro → Ata → Produção)**
Repository pattern + React Hook Form + Zod. Establish the CRUD pattern with Associado first, replicate for remaining entities. All reads from Dexie, all writes to Dexie + sync_queue.
- Addresses: Pitfalls 13, 14, 17
- Delivers: Full offline CRUD for all 5 core entities on real data

**Phase 4: Sync Engine**
Push (batched, idempotent), pull (delta with `since`), conflict detection + auto-resolution, heartbeat connectivity check, WiFi-preferring mode, queue compaction.
- Addresses: Pitfalls 4, 7, 8, 15, 16, 18, 19
- Delivers: Reliable offline-to-online data sync

**Phase 5: API CRUD + Dashboard**
Express endpoints for all entities (needed for sync + direct admin queries). Admin dashboard with Recharts + TanStack Table.
- Delivers: Server-side data access, financial summary charts, member stats

**Phase 6: PNAE Features**
Edital viewing + tracking, production↔edital matching, relatórios PNAE, PNAE config table for regulatory values.
- Addresses: Pitfalls 12, 21
- Delivers: PNAE workflow from edital tracking to report generation

**Phase 7: Polish + Differentiation**
Transparência portal, simplified farmer mode, member 360° view, alerts/notifications, data export (PDF/CSV).
- Delivers: Role-specific UX, notifications, exportable reports

### Parallelization Opportunities

- Phase 3 (UI) can start as soon as Phase 1 completes — doesn't need Phase 2 (auth).
- Phase 4 (sync) can run in parallel with Phase 3 (UI) once the repository pattern is established.
- Phase 5 API routes can start alongside Phase 4.

### Research Flags

| Phase | Needs `/gsd-research-phase`? | Reason |
|-------|------------------------------|--------|
| 1. Schema Migration | No | Well-documented: Drizzle migrations + Dexie versioning. Research done. |
| 2. Auth + PWA | No | Arctic + jose flow fully mapped in ARCHITECTURE.md. |
| 3. Core CRUD UI | No | Standard React Hook Form + Dexie pattern. Established in research. |
| 4. Sync Engine | **Yes** | Edge cases (queue compaction, idempotency keys, partial batch failures) need deeper design. |
| 5. API + Dashboard | No | Standard Express + Drizzle CRUD. Recharts docs are comprehensive. |
| 6. PNAE Features | **Yes** | Projeto de Venda document format, CAF/DAP limits, and matching algorithm need domain research. |
| 7. Polish | No | UX refinement based on what's built. |

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All packages verified on npm 2026-04-18. Download counts, publish dates confirmed. |
| Features | HIGH | Grounded in FNDE/PNAE official sources + Brazilian civil code requirements. Schema gaps identified from direct code review. |
| Architecture | HIGH | Sync pattern, auth flow, component boundaries, and build order are well-specified. Anti-patterns documented. |
| Pitfalls | HIGH | 21 pitfalls identified from codebase analysis, domain knowledge, and offline-first literature. Phase assignments are concrete. |

**Gaps to address during planning:**
- 30-day JWT expiry is pragmatic, not validated — test with real users for offline duration
- `drizzle-zod` v0.7.0 version unverified on npm — confirm before installing
- Projeto de Venda exact document template needs FNDE source verification per current resolution
- Performance budget (FCP < 2s, TTI < 4s on Moto E) needs baseline measurement on real device

---

## Sources

Aggregated from all 4 research documents:
- **npm registry** (all package versions verified 2026-04-18)
- **dexie.org** — pricing, documentation, cloud features
- **arcticjs.dev** — Arctic v3 OAuth library
- **FNDE/PNAE official** — gov.br/fnde (program rules, legislation, AF requirements)
- **Brazilian legislation** — Lei 11.947/2009, Resolução CD/FNDE nº 4/2026, Lei 13.709/2018 (LGPD), Código Civil Art. 59
- **Codebase analysis** — Drizzle schemas, Dexie schema, existing types, CONCERNS.md
- **web.dev** — PWA installation, storage, offline cookbook, Workbox strategies
