# Feature Landscape

**Domain:** Gestão de associações rurais brasileiras com participação no PNAE
**Researched:** 2026-04-18
**Confidence:** HIGH (combination of official FNDE sources, domain schema analysis, and Brazilian rural cooperative management patterns)

## Table Stakes

Features users expect. Missing = product feels incomplete.

### 1. Cadastro de Associados (Member Registration)

| Aspect | Detail |
|--------|--------|
| **Why Expected** | Core entity — the association exists to manage members. Without a member registry, there's no association management |
| **Complexity** | Low |
| **What it includes** | CRUD: nome, CPF, contato (telefone), endereço, data de entrada, status (ativo/inativo/suspenso), foto (optional). Search by name. Filter by status |
| **Schema gap** | Current `associado` schema lacks CPF, endereço, foto. These are essential — CPF is required for CAF/PNAE documentation |
| **Offline requirement** | Must work 100% offline |

### 2. Controle de Mensalidades (Monthly Dues Management)

| Aspect | Detail |
|--------|--------|
| **Why Expected** | Membership dues are the primary revenue source for associations. Tracking who paid/didn't is daily admin work |
| **Complexity** | Medium |
| **What it includes** | Generate monthly dues per member, record payments (valor, data, forma de pagamento), view payment status by member and by month, bulk generation of mensalidades for all active members, mark as paid/unpaid, overdue indicators |
| **Schema gap** | Current `mensalidade` lacks `mes_referencia` (reference month) and `status` (pendente/pago/atrasado). Without a reference month, you can't track "April 2026 dues for member X" |
| **Offline requirement** | Must work 100% offline |

### 3. Gestão Financeira (Financial Management)

| Aspect | Detail |
|--------|--------|
| **Why Expected** | Associations must track all income and expenses for accountability and legal compliance. Prestação de contas is a regulatory obligation |
| **Complexity** | Medium |
| **What it includes** | Record entradas (income) and saídas (expenses), categorize transactions (mensalidade, venda PNAE, doação, compra material, etc.), view balance (saldo), monthly/annual summary, basic cash flow report |
| **Schema gap** | Current `transacao_financeira` lacks `categoria` (category). Categories are critical for PNAE reporting (need to separate AF income from other income) |
| **Offline requirement** | Must work 100% offline |

### 4. Registro de Atas (Meeting Minutes)

| Aspect | Detail |
|--------|--------|
| **Why Expected** | Legally required by Brazilian association law (Código Civil Art. 59). Assembleia geral minutes must be recorded and kept. This is audited |
| **Complexity** | Low |
| **What it includes** | Create meeting record (titulo, data, conteúdo/pauta), view historical atas list, detail view, simple text editor for content |
| **Schema gap** | Current `ata` is minimal but functional for v1 |
| **Offline requirement** | Must work 100% offline |

### 5. Registro de Produção (Production Tracking)

| Aspect | Detail |
|--------|--------|
| **Why Expected** | Knowing what members produce is fundamental — it determines what the association can offer in PNAE chamadas públicas and other markets |
| **Complexity** | Low-Medium |
| **What it includes** | Record production per member (cultura, quantidade, data), view aggregate production by crop, view production by member, seasonal overview |
| **Schema gap** | Current `producao` lacks `unidade` (unit: kg, caixa, litro) and `preco_unitario`. Without units, "100 tomates" vs "100kg tomates" is ambiguous |
| **Offline requirement** | Must work 100% offline |

### 6. Dashboard Administrativo (Admin Dashboard)

| Aspect | Detail |
|--------|--------|
| **Why Expected** | Admins need an at-a-glance view of the association's status. Without it, they must navigate multiple screens to understand the current situation |
| **Complexity** | Medium |
| **What it includes** | Total members (active/inactive), financial balance (month/year), overdue mensalidades count, recent atas, active PNAE editais, production summary |
| **Offline requirement** | Must work 100% offline (computed from local data) |

### 7. Transparência para Membros (Member Transparency Portal)

| Aspect | Detail |
|--------|--------|
| **Why Expected** | Trust is the foundation of associativeism. Brazilian associations are legally obligated to provide transparency to members (Código Civil). Members who can't see finances leave or create conflict |
| **Complexity** | Low |
| **What it includes** | Read-only view of financial summary for farmer profile, read-only view of atas, view of own mensalidade status (paid/pending), personal production history |
| **Offline requirement** | Must work offline with locally synced data |

### 8. Autenticação e Perfis (Authentication & Roles)

| Aspect | Detail |
|--------|--------|
| **Why Expected** | Two user profiles (agricultor/admin) with different access levels. Financial data modification must be restricted |
| **Complexity** | Medium |
| **What it includes** | Google OAuth login, role assignment (admin/membro), role-based navigation (admin sees management tools, membro sees personal data + transparency views) |
| **Offline requirement** | Initial login requires internet. After that, cached credentials allow offline access |

---

## PNAE Workflow Features

The PNAE (Programa Nacional de Alimentação Escolar) workflow is a **core pillar** of this product. It's what turns a generic association management tool into something valuable for rural agriculture associations specifically.

### Background: How PNAE Works for Associations

Per Lei nº 11.947/2009 and Resolução CD/FNDE nº 4/2026:

1. **Municipalities/states publish chamadas públicas** (public calls) to purchase food from agriculture familiar — minimum **45%** of PNAE federal resources must go to AF purchases
2. **Associations prepare a "projeto de venda"** (sales project) listing what they can deliver, quantities, prices, and delivery schedule
3. **Selection criteria prioritize**: local suppliers → regional → state, with further priority for assentamentos da reforma agrária, indigenous communities, quilombolas, women's groups, and young farmers
4. **Agricultores must be registered in CAF** (Cadastro Nacional da Agricultura Familiar — replaced DAP)
5. **Delivery and reporting**: association delivers products per contract, produces reports for SigPC (Sistema de Gestão de Prestação de Contas)

### PNAE Feature Breakdown

#### 9. Visualização de Editais (Edital Viewing & Tracking)

| Aspect | Detail |
|--------|--------|
| **Category** | Table Stakes (for PNAE participation) |
| **Why Expected** | Associations need to know which chamadas públicas are open, what products are needed, and deadlines. Missing an edital means missing income |
| **Complexity** | Low-Medium |
| **What it includes** | CRUD of editais (titulo, descrição, produtos solicitados, quantidades, preços de referência, data_inicio, data_fim, status), list with filters (aberto/encerrado/em_execução), deadline alerts |
| **Schema gap** | Current `edital_pnae` lacks fields for: `entidade_executora` (municipality), `produtos` (list of products/quantities requested), `valor_total`. These are critical for matching production to demand |

#### 10. Preparação de Projeto de Venda (Sales Project Builder)

| Aspect | Detail |
|--------|--------|
| **Category** | Differentiator |
| **Why Expected** | This is the document the association submits to respond to a chamada pública. FNDE provides Word templates, but filling them out is painful for rural admins |
| **Complexity** | High |
| **What it includes** | Match available production (from `producao` records) against edital requirements, auto-populate member data (nome, CPF, CAF number), calculate per-member delivery limits (DAP/CAF limit), generate projeto de venda document with all required fields, preview before submission |
| **Dependencies** | Requires: Associado (with CPF/CAF), Produção data, Edital data |
| **Notes** | This is THE killer feature. The manual process involves Excel spreadsheets, paper CAFs, and lots of back-and-forth. Automating this is the #1 value proposition for PNAE participation |

#### 11. Relatórios PNAE (PNAE Reports)

| Aspect | Detail |
|--------|--------|
| **Category** | Table Stakes (for PNAE compliance) |
| **Why Expected** | Associations participating in PNAE must report purchases, deliveries, and financial data to SigPC. This reporting is where most associations struggle — data is scattered across notebooks, WhatsApp, and memory |
| **Complexity** | Medium |
| **What it includes** | Consolidated report per edital: products delivered, quantities, values, participating members. Financial summary separating PNAE income from other income. Exportable format (PDF or printable) |
| **Schema gap** | Current `relatorio_pnae` is barebones (just `conteudo` text + `data_geracao`). Needs structured fields: produtos_entregues, valor_total, membros_participantes. Also lacks sync fields (version, updatedAt, deviceId, deletedAt) |

---

## Differentiators

Features that set product apart. Not expected, but valued.

### 12. Matching Produção ↔ Edital (Production-Demand Matching)

| Aspect | Detail |
|--------|--------|
| **Value Proposition** | Automatically shows which members can supply which products for an open edital, highlighting gaps (products needed but not produced) and surplus (production available but not requested) |
| **Complexity** | Medium |
| **Dependencies** | Requires: Produção records with standardized crop names, Edital with product list |
| **Notes** | This is a "wow" feature for admins who currently do this matching with paper lists |

### 13. Alertas e Notificações (Smart Alerts)

| Aspect | Detail |
|--------|--------|
| **Value Proposition** | Push notifications for: edital deadlines approaching, mensalidades atrasadas (overdue), upcoming meetings. Reduces the "I forgot" factor that causes missed PNAE opportunities |
| **Complexity** | Medium |
| **Dependencies** | Requires: PWA push notifications (service worker), edital dates, mensalidade status |
| **Notes** | Especially valuable in rural context where admin checking the app daily isn't guaranteed |

### 14. Histórico por Associado (Member 360° View)

| Aspect | Detail |
|--------|--------|
| **Value Proposition** | Single screen showing everything about a member: personal data, mensalidade history, production history, PNAE participation, meeting attendance. Currently this information exists in different notebooks |
| **Complexity** | Low (UI aggregation of existing data) |
| **Dependencies** | All entity screens must be built first |

### 15. Exportação de Dados (Data Export)

| Aspect | Detail |
|--------|--------|
| **Value Proposition** | Export financial summaries, member lists, production reports as PDF or CSV. Needed for: accountant, municipal government, audits, assembleia reports |
| **Complexity** | Medium |
| **Notes** | PDF generation that works offline is technically challenging — consider using the print-to-PDF browser capability as a lightweight approach |

### 16. Busca e Filtros Avançados (Search & Filters)

| Aspect | Detail |
|--------|--------|
| **Value Proposition** | Filter members by status, search transactions by date range / category, filter production by crop and period. Makes the app usable at scale (50+ members) |
| **Complexity** | Low-Medium |
| **Notes** | IndexedDB (Dexie) supports compound indexes for efficient filtering |

### 17. Modo Agricultor Simplificado (Simplified Farmer Mode)

| Aspect | Detail |
|--------|--------|
| **Value Proposition** | Ultra-simplified UI for farmer users: big buttons, minimal text, icon-heavy navigation, voice-ready labels. Farmers shouldn't see admin complexity |
| **Complexity** | Medium (UX research, not technical complexity) |
| **Dependencies** | Authentication & role system |
| **Notes** | This IS a defined requirement but as a differentiator because most association tools don't bother with farmer-friendly UX — they assume literate admin users only |

---

## Anti-Features

Features to deliberately NOT build.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Chat / Messaging** | Complex real-time infra (WebSocket, message history, delivery guarantees). WhatsApp already fills this role perfectly. Farmers won't switch messaging apps | Link to WhatsApp group from within the app |
| **Marketplace / E-commerce** | Selling products online is a completely different product (logistics, payment processing, buyer UI). Out of scope for association management | Focus on PNAE as the sales channel. Consider marketplace as a future product |
| **Multi-tenancy (multiple associations)** | Adds auth complexity, data isolation, billing. V1 targets one association per instance | Each association deploys their own instance. Consider multi-tenancy in v2 |
| **Accounting / Contabilidade** | Full double-entry accounting is a regulated domain requiring CRC compliance. Associations use external accountants | Export financial data in a format the accountant can import. Keep our financial tracking simple (entradas/saídas) |
| **Document OCR / Scanning** | Scanning CAF documents, receipts etc. is technically fragile on low-end phones with bad cameras | Manual data entry with large, clear form fields |
| **Offline AI features** | Running ML models on-device requires large downloads and processing power. Target audience has low-end phones | All AI features (if any) are online-only, as already decided |
| **Complex approval workflows** | Multi-step approval chains (request → review → approve) add UX friction. For a small association, the presidente just decides | Simple status fields (pendente/aprovado) without formal workflow engine |
| **Integration with government systems** | APIs for SigPC, CAF registry etc. are unstable, poorly documented or non-existent. Building against them creates brittle dependencies | Generate reports in the format government expects, let admin upload manually |

---

## Feature Dependencies

```
Associado (1) ──────────────────────────┐
  │                                      │
  ├── Mensalidade (2)                    │
  │     └── Dashboard (6)               │
  │                                      │
  ├── Produção (5)                       │
  │     └── Matching Produção↔Edital (12)│
  │                                      │
  └── Histórico por Associado (14)       │
                                         │
Transação Financeira (3) ───── Dashboard (6)
  │                              │
  └── Transparência (7) ────────┘
                                 │
Ata (4) ────── Transparência (7)─┘

Edital PNAE (9)
  ├── Matching Produção↔Edital (12) ◄── Produção (5)
  ├── Projeto de Venda (10)         ◄── Associado (1) + Produção (5)
  └── Relatório PNAE (11)          ◄── Transação Financeira (3)

Autenticação (8) ──── Transparência (7)
                 ──── Modo Agricultor (17)
```

**Critical path:** Associado → Mensalidade + Produção → Edital → Projeto de Venda

---

## MVP Recommendation

### Phase 1: Core CRUD (build order)
1. **Associado** — foundation entity, everything depends on it
2. **Mensalidade** — most frequent admin operation
3. **Transação Financeira** — daily financial tracking
4. **Ata** — simple standalone CRUD
5. **Produção** — needed before PNAE features

### Phase 2: PNAE Foundation
6. **Edital PNAE** — track open chamadas públicas
7. **Dashboard** — aggregates all Phase 1 data
8. **Autenticação + Perfis** — unlocks role-based access

### Phase 3: PNAE Power Features
9. **Relatório PNAE** — structured reports per edital
10. **Matching Produção ↔ Edital** — the "wow" moment
11. **Projeto de Venda** — the killer feature (highest complexity, highest value)

### Phase 4: Polish & Differentiation
12. **Transparência** — member-facing views
13. **Modo Agricultor Simplificado** — farmer UX
14. **Alertas** — notifications
15. **Exportação** — PDF/CSV

**Defer:** Projeto de Venda auto-generation is the highest-value feature but also the most complex. Don't rush it — build the data foundation (associados with CPF/CAF, production with units, editais with product lists) first, then the builder becomes straightforward.

---

## Schema Evolution Needed

Based on feature analysis, the current schema needs these additions before building features:

| Entity | Missing Fields | Reason |
|--------|---------------|--------|
| `associado` | `cpf`, `endereco`, `numero_caf`, `telefone` (separate from contato), `comunidade` | CPF required for PNAE docs. CAF number needed for chamada pública eligibility |
| `mensalidade` | `mes_referencia` (year-month), `status` (pendente/pago/atrasado) | Can't track "which month is this payment for" without reference month |
| `transacao_financeira` | `categoria` (enum: mensalidade, pnae, doacao, despesa_administrativa, etc.) | Category needed for PNAE reporting (separate AF revenue) |
| `producao` | `unidade` (kg, litro, caixa, unidade, etc.), `preco_unitario` | Quantities without units are ambiguous. Price needed for projeto de venda |
| `edital_pnae` | `entidade_executora`, `produtos_solicitados` (JSON or separate table), `valor_total` | Core edital data needed for matching and proposal generation |
| `relatorio_pnae` | `version`, `updatedAt`, `deviceId`, `deletedAt` (sync fields) | Currently the only entity without sync support — will fail in offline-first sync |

---

## Sources

- **FNDE PNAE oficial**: https://www.gov.br/fnde/pt-br/acesso-a-informacao/acoes-e-programas/programas/pnae — program description, legislation references, per capita values (updated Feb 2026)
- **Agricultura Familiar no PNAE**: https://www.gov.br/fnde/pt-br/acesso-a-informacao/acoes-e-programas/programas/pnae/agricultura-familiar-pnae — chamada pública process, 45% minimum, CAF requirement, priority groups, template documents
- **Resolução CD/FNDE nº 4/2026**: New regulation replacing nº 6/2020 for AF acquisition in PNAE
- **Lei nº 11.947/2009**: Foundation law establishing PNAE and the AF purchase minimum
- **Lei nº 14.660/2023**: Added 50% women's name requirement for individual AF purchases
- **Perguntas Frequentes AF/PNAE**: https://www.gov.br/fnde/pt-br/acesso-a-informacao/acoes-e-programas/programas/pnae/agricultura-familiar-no-pnae — workflow questions (pricing, documentation, selection criteria, contracts)
- **Existing codebase schema**: Drizzle ORM schemas in `packages/database/src/schema/` and Dexie schema in `apps/web/src/database/db.ts`
- **Confidence basis**: PNAE workflow from official government sources (HIGH). Association management features from Código Civil requirements + domain analysis (HIGH). Schema gap analysis from direct code review (HIGH)
