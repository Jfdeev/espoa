# Roadmap: Espoa

**Created:** 2026-04-18
**Milestone:** v1.0
**Granularity:** Standard (7 phases)
**Requirements:** 31 mapped

## Phases

- [ ] **Phase 1: Schema Migration + Shared Validation** — Fix currency types, add missing fields, unify client/server schemas via Zod
- [ ] **Phase 2: Authentication + Profiles** — Google OAuth with offline session, role-based navigation (admin/agricultor)
- [ ] **Phase 3: Core CRUD** — Offline-first CRUD for Associados, Mensalidades, Finanças, Atas, and Produção
- [ ] **Phase 4: Sync Engine + API REST** — Batched push/pull sync with conflict resolution and full REST API
- [ ] **Phase 5: Dashboard + Analytical Views** — Admin dashboard, financial analysis, production aggregates, member 360° view
- [ ] **Phase 6: PNAE Workflow** — Edital tracking, production↔demand matching, reports, and Projeto de Venda builder
- [ ] **Phase 7: Polish, Transparency + IA** — Farmer transparency portal, simplified mode, notifications, exports, AI insights

## Phase Details

### Phase 1: Schema Migration + Shared Validation
**Goal:** All database schemas are correct, unified, and ready for feature development
**Depends on:** Nothing (first phase)
**Requirements:** FUND-01, FUND-02
**Success Criteria** (what must be TRUE):
  1. Currency fields use integer centavos (no floating-point) on both Dexie and Drizzle
  2. All 7 entities have required domain fields (CPF on associado, mes_referencia on mensalidade, unidade/preco_unitario on producao, etc.)
  3. relatorio_pnae has sync fields (version, updatedAt, deviceId, deletedAt) and structured data fields
  4. Zod schemas generated from Drizzle serve as single source of truth, with snake_case mapping for Dexie
**Plans:** TBD

### Phase 2: Authentication + Profiles
**Goal:** Users can log in, stay authenticated offline, and see role-appropriate navigation
**Depends on:** Phase 1
**Requirements:** FUND-03, FUND-04
**Success Criteria** (what must be TRUE):
  1. User can log in with Google account and access the app
  2. User can open the app offline after initial login and access all local data (30-day grace period)
  3. Admin sees management navigation (side nav with all entity sections)
  4. Farmer sees simplified navigation (bottom nav, personal data + transparency placeholders)
**Plans:** TBD
**UI hint:** yes

### Phase 3: Core CRUD
**Goal:** Admin can manage all 5 core entities entirely offline with data persisted in IndexedDB
**Depends on:** Phase 1
**Requirements:** ASSC-01, ASSC-02, MENS-01, MENS-02, MENS-03, FIN-01, ATA-01, ATA-02, PROD-01
**Success Criteria** (what must be TRUE):
  1. Admin can create, edit, list, and search associados with all required fields (nome, CPF masked, CAF, telefone, endereco, comunidade, status)
  2. Admin can generate mensalidades in batch for all active members and register individual payments with status tracking (pendente/pago/atrasado)
  3. Admin can record financial entries and exits with categories and view transaction details
  4. Admin can create meeting minutes with simple text editor and browse atas chronologically
  5. Admin can register production per member with cultura, quantidade, unidade, preco_unitario, and data/safra
**Plans:** TBD
**UI hint:** yes

### Phase 4: Sync Engine + API REST
**Goal:** Data flows reliably between device and server, even on flaky rural 2G/3G networks
**Depends on:** Phase 1, Phase 3 (needs data to sync)
**Requirements:** FUND-05, FUND-06
**Success Criteria** (what must be TRUE):
  1. Changes made offline sync to the server automatically when connectivity returns
  2. Changes from other devices appear locally after delta pull
  3. Financial conflicts resolve automatically (server-wins) without manual intervention
  4. Sync progresses in small batches (10-20 ops), shows progress, and resumes cleanly after network interruption
  5. All entity CRUD is available via authenticated REST API endpoints
**Plans:** TBD

### Phase 5: Dashboard + Analytical Views
**Goal:** Admin has a comprehensive at-a-glance overview with aggregated data across all entities
**Depends on:** Phase 3, Phase 4
**Requirements:** DASH-01, FIN-02, FIN-03, PROD-02, ASSC-03
**Success Criteria** (what must be TRUE):
  1. Dashboard shows active member count, current balance, overdue dues count, open editais, and production summary
  2. Financial view shows current balance and monthly/annual summary
  3. Cash flow view supports filters by period and category
  4. Production has aggregated view by cultura and by safra/período
  5. Member 360° view shows complete history (mensalidades, produção, PNAE participation) in one screen
**Plans:** TBD
**UI hint:** yes

### Phase 6: PNAE Workflow
**Goal:** Association can track editais, match production to demand, generate compliance reports, and build Projetos de Venda
**Depends on:** Phase 3, Phase 5
**Requirements:** PNAE-01, PNAE-02, PNAE-03, PNAE-04
**Success Criteria** (what must be TRUE):
  1. Admin can register and track PNAE editais with entidade executora, produtos solicitados, quantidades, preços de referência, and status
  2. System shows which members can supply which products for an open edital, highlighting gaps and surplus
  3. Structured report per edital shows produtos entregues, valores, and membros participantes — exportable
  4. Projeto de Venda builder auto-populates member data (CPF, CAF) and production, with preview before export
**Plans:** TBD
**UI hint:** yes

### Phase 7: Polish, Transparency + IA
**Goal:** Both user profiles have a complete, accessible experience with smart insights and data exports
**Depends on:** Phase 5, Phase 6
**Requirements:** DASH-02, DASH-03, DASH-04, DASH-05, IA-01, IA-02, IA-03
**Success Criteria** (what must be TRUE):
  1. Farmer sees read-only transparency portal with financial summary, atas, personal mensalidade status, and personal production
  2. Farmer mode uses large touch targets, icon-heavy navigation, simple language — usable for low digital literacy
  3. Push notifications alert for edital deadlines, overdue mensalidades, and upcoming reuniões
  4. Reports exportable as PDF/CSV for contador, governo, and assembleias
  5. AI provides financial insights, PNAE report assistance, and management suggestions (online-only, clear simple language)
**Plans:** TBD
**UI hint:** yes

## Progress

| Phase | Plans | Status | Completed |
|-------|-------|--------|-----------|
| 1. Schema Migration + Shared Validation | 0/? | Not started | — |
| 2. Authentication + Profiles | 0/? | Not started | — |
| 3. Core CRUD | 0/? | Not started | — |
| 4. Sync Engine + API REST | 0/? | Not started | — |
| 5. Dashboard + Analytical Views | 0/? | Not started | — |
| 6. PNAE Workflow | 0/? | Not started | — |
| 7. Polish, Transparency + IA | 0/? | Not started | — |

## Coverage

| Requirement | Phase |
|-------------|-------|
| FUND-01 | 1 |
| FUND-02 | 1 |
| FUND-03 | 2 |
| FUND-04 | 2 |
| FUND-05 | 4 |
| FUND-06 | 4 |
| ASSC-01 | 3 |
| ASSC-02 | 3 |
| ASSC-03 | 5 |
| MENS-01 | 3 |
| MENS-02 | 3 |
| MENS-03 | 3 |
| FIN-01 | 3 |
| FIN-02 | 5 |
| FIN-03 | 5 |
| ATA-01 | 3 |
| ATA-02 | 3 |
| PROD-01 | 3 |
| PROD-02 | 5 |
| PNAE-01 | 6 |
| PNAE-02 | 6 |
| PNAE-03 | 6 |
| PNAE-04 | 6 |
| DASH-01 | 5 |
| DASH-02 | 7 |
| DASH-03 | 7 |
| DASH-04 | 7 |
| DASH-05 | 7 |
| IA-01 | 7 |
| IA-02 | 7 |
| IA-03 | 7 |

**31/31 requirements mapped ✓ — No orphans**

---
*Created: 2026-04-18*
