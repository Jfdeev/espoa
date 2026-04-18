# Technology Stack — Additions for Milestone 2

**Project:** Espoa — Rural Association Management PWA
**Researched:** 2026-04-18
**Overall confidence:** HIGH

> This document covers only what to **ADD** to the existing stack. See `.planning/codebase/STACK.md` for what's already installed.

## Existing Stack (do not re-install)

| Technology | Version | Layer |
|------------|---------|-------|
| React | ^19.2.4 | Frontend |
| Vite | ^8.0.4 | Build |
| Dexie | ^4.4.2 | Local DB (IndexedDB) |
| Zustand | ^5.0.12 | Client state |
| Axios | ^1.14.0 | HTTP client |
| Express | ^5.2.1 | Backend HTTP |
| Drizzle ORM | ^0.44.0 | Server ORM |
| @neondatabase/serverless | ^1.0.0 | PostgreSQL driver |
| vite-plugin-pwa | ^1.2.0 | PWA/service worker |
| workbox-build | ^7.4.0 | Service worker build |
| Tailwind CSS | ^4.2.2 | Styling |
| TypeScript | ~6.0.2 | Type system |
| pnpm | 10.33.0 | Package manager |
| Turborepo | ^2.9.5 | Monorepo orchestration |

---

## Recommended Additions

### 1. Offline-First Sync — Custom Layer (NOT Dexie Cloud)

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| dexie-react-hooks | ^4.4.0 | `useLiveQuery` for reactive IndexedDB reads in React components | HIGH |
| Custom sync service | — | Push sync_queue to Express API, pull server changes | HIGH |

**Why custom sync instead of Dexie Cloud:**

- **Cost:** Dexie Cloud free tier allows only **3 production users** — insufficient for even a small association (20-200 members). Pro tier costs €0.12/user/month — recurring cost that doesn't fit non-profit rural associations with tight budgets.
- **Architecture fit:** The project already has `sync_queue` and `conflict_log` tables designed in the Dexie schema, plus Express 5 + Drizzle + Neon PostgreSQL ready for the backend. The sync infrastructure is designed and waiting to be wired.
- **Control:** Custom sync allows tailoring conflict resolution to domain rules (e.g., "last financial transaction wins" vs "merge meeting minutes").
- **Offline resilience:** Sync queue pattern with exponential backoff is well-understood and doesn't depend on a third-party service's availability.

**Why NOT Dexie Cloud:**
Dexie Cloud (v4.4.10) is excellent for SaaS products with per-seat billing, but its pricing model doesn't align with a tool for Brazilian rural associations. The free tier's 3-user limit makes it unusable for production. Building on the existing Express backend avoids vendor lock-in and recurring costs entirely.

**Sync pattern:** Operation-based sync queue → Express API endpoints → Drizzle writes to Neon. Server returns changes since last sync timestamp. Conflict resolution via `version` + `updated_at` fields already in schema.

**Source:** npm (dexie-react-hooks 4.4.0 verified 2026-04-18), dexie.org/cloud/pricing (pricing verified 2026-04-18)

---

### 2. Authentication — Arctic + jose

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| arctic | ^3.7.0 | Google OAuth 2.0 authorization code flow | HIGH |
| jose | ^6.2.2 | JWT signing, verification, and token management | HIGH |

**Why Arctic:**
- **Modern:** TypeScript-first, built on Fetch API, runtime-agnostic. Supports 60+ providers including Google.
- **Lightweight:** No middleware chain, no session serialization boilerplate. Just `createAuthorizationURL()` → `validateAuthorizationCode()`.
- **Active:** 1.8M weekly downloads, maintained by pilcrowonpaper (creator of Lucia Auth).
- **Fits Express 5:** Works with any HTTP framework — no Express-specific middleware coupling.

**Why jose:**
- **Zero dependencies.** Tree-shakeable ESM.
- **Universal runtime:** Works in Node.js (server), browsers (token decode on client), and edge.
- **Complete:** JWT sign/verify, JWK management, JWKS support. Everything needed for stateless auth.
- **64M weekly downloads** — the most popular JWT library in the ecosystem.

**Why NOT Passport.js:**
- `passport` core: last published **2 years ago** (v0.7.0).
- `passport-google-oauth20`: last published **7 years ago** (v2.0.0). No TypeScript types in package.
- Session-based by default — poor fit for offline-first PWA where the client needs tokens that work without server contact.
- Heavy middleware chain with `serializeUser`/`deserializeUser` ceremony.
- Arctic does everything Passport's Google strategy does in fewer lines with better types.

**Auth architecture:**
1. Frontend redirects to Google via Arctic's `createAuthorizationURL()`
2. Google callback hits Express API → Arctic validates → jose signs JWT
3. JWT stored in httpOnly secure cookie + Zustand client state
4. API endpoints verify JWT via jose middleware
5. Offline: cached JWT allows local-only operations; sync requires valid token

**Source:** npm (arctic 3.7.0, jose 6.2.2 verified 2026-04-18), arcticjs.dev

---

### 3. Shared Validation — Zod

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| zod | ^4.3.6 | Schema validation shared between client and server | HIGH |

**Why Zod:**
- **TypeScript-first:** `z.infer<>` extracts static types from schemas — single source of truth for both validation and types.
- **Zero dependencies.** 2KB gzipped core.
- **Shared schemas:** Define once in `packages/database` (or a new `packages/shared`), use in both `apps/web` (form validation) and `apps/api` (request validation).
- **Drizzle integration:** `drizzle-zod` can generate Zod schemas from Drizzle table definitions (already have Drizzle schemas in `packages/database`).
- **158M weekly downloads** — the ecosystem standard for TypeScript validation.

Use `zod` v4 (not v3). The `@hookform/resolvers` already supports `import { z } from 'zod'` or `'zod/v4'`.

**Source:** npm (zod 4.3.6 verified 2026-04-18)

---

### 4. Forms — React Hook Form

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| react-hook-form | ^7.72.1 | Form state management, validation integration | HIGH |
| @hookform/resolvers | ^5.2.2 | Zod resolver for react-hook-form | HIGH |

**Why React Hook Form:**
- **Performance:** Uncontrolled inputs by default — minimal re-renders. Critical for low-end phones used by rural workers.
- **Zod integration:** `zodResolver(schema)` connects Zod schemas to forms seamlessly.
- **Lightweight:** Zero dependencies, ~9KB gzipped.
- **49M weekly downloads** — battle-tested, well-documented.
- **React 19 compatible:** Latest version works with React 19.

**Source:** npm (react-hook-form 7.72.1, @hookform/resolvers 5.2.2 verified 2026-04-18)

---

### 5. Routing — React Router

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| react-router | ^7.14.1 | Client-side routing | HIGH |

**Why React Router v7:**
- **De facto standard:** 53M weekly downloads. React Router v7 is the merger of React Router v6 + Remix — the most complete routing solution for React.
- **React 19 compatible.**
- **Note:** `react-router-dom` v7 simply re-exports from `react-router`. Install `react-router` directly — `react-router-dom` is no longer needed.

**Source:** npm (react-router 7.14.1 verified 2026-04-18)

---

### 6. Dashboard — Recharts + TanStack Table

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| recharts | ^3.8.1 | Declarative SVG charts (bar, line, pie, area) | HIGH |
| @tanstack/react-table | ^8.21.3 | Headless data table (sorting, filtering, pagination) | HIGH |

**Why Recharts:**
- **Declarative React components:** `<BarChart>`, `<LineChart>`, `<PieChart>` — compose charts from React elements.
- **Lightweight:** SVG-based, D3 internals, no canvas.
- **45M weekly downloads** — most popular React chart library.
- **Dashboard use cases:** Financial summary charts, production trends, membership stats.

**Why TanStack Table:**
- **Headless:** Renders with any UI (Tailwind in our case). No pre-built styles to fight.
- **Full-featured:** Sorting, filtering, pagination, column visibility, row selection.
- **11M weekly downloads.**
- **Dashboard use cases:** Member lists, financial transaction tables, payment status grids.

**Why NOT @tremor/react:**
Last published over 1 year ago (v3.18.7). Unclear React 19 compatibility. Built on Tailwind v3 — would conflict with our Tailwind v4 setup.

**Source:** npm (recharts 3.8.1, @tanstack/react-table 8.21.3 verified 2026-04-18)

---

### 7. UI Components — Tailwind CSS v4 (extend existing)

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| Tailwind CSS | ^4.2.2 | **Already installed.** Styling and component design. | HIGH |
| @tailwindcss/vite | ^4.2.2 | **Already installed.** Vite integration. | HIGH |

**No additional UI component library recommended. Build custom components with Tailwind.**

**Why NOT MUI (@mui/material v9.0.0):**
- MUI v9 just released but still implements **Material Design 2**, not MD3. The project landing page already implements MD3 design patterns with Tailwind — adding MUI would create visual inconsistency.
- MUI requires Emotion (`@emotion/react`, `@emotion/styled`) — a CSS-in-JS runtime that adds bundle weight and conflicts philosophically with Tailwind's utility-first approach.
- The app targets low-end phones with limited memory and CPU — Emotion's runtime overhead matters.
- MUI's component API is opinionated about styling — fighting it to match existing Tailwind/MD3 tokens wastes effort.

**Approach:** Build a small set of reusable components (Button, Card, Input, Select, Dialog, BottomNav, FAB) using Tailwind CSS v4 utilities following MD3 design tokens. The project needs ~15-20 components, not a full design system. This keeps the bundle lean and the design consistent.

**Source:** npm (@mui/material 9.0.0 verified 2026-04-18), mui.com (still MD2 confirmed)

---

### 8. Drizzle-Zod Integration

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| drizzle-zod | ^0.7.0 | Generate Zod schemas from Drizzle table definitions | MEDIUM |

**Why:**
- Avoids manually duplicating schema definitions between Drizzle (server) and Zod (validation).
- `createInsertSchema(associados)` → Zod schema ready for API request validation and form validation.
- Keeps the Drizzle schema in `packages/database` as the single source of truth.

**Confidence note:** Version is from training data. Verify actual latest from npm before installing.

**Source:** Training data (verify with npm before use)

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Sync | Custom sync layer | Dexie Cloud (v4.4.10) | Free tier: 3 users. Pro: €0.12/user/mo. Cost doesn't fit non-profit rural associations. |
| Auth (OAuth) | Arctic (v3.7.0) | Passport.js (v0.7.0) | Core 2 years stale, Google strategy 7 years stale. Session-based, heavy. |
| Auth (JWT) | jose (v6.2.2) | jsonwebtoken | Legacy, not ESM-first, depends on Node.js crypto (not universal). |
| UI Components | Tailwind CSS v4 custom | MUI v9 | MD2 not MD3, Emotion runtime overhead, inconsistent with existing Tailwind setup. |
| UI Components | Tailwind CSS v4 custom | @tremor/react v3 | 1yr stale, Tailwind v3 dependency, unclear React 19 compat. |
| Charts | Recharts v3 | Chart.js / react-chartjs-2 | Canvas-based (less accessible), imperative API, Recharts is more React-idiomatic. |
| Charts | Recharts v3 | Nivo | Heavier bundle, more complex API for the simple charts needed. |
| Validation | Zod v4 | Yup | Zod has better TypeScript inference, smaller bundle, more active development. |
| Forms | React Hook Form v7 | Formik | Heavier, more re-renders, slower. React Hook Form is the modern standard. |
| Routing | React Router v7 | TanStack Router | React Router is more mature, larger ecosystem, simpler migration. |

---

## Installation Commands

### Frontend (`apps/web`)

```bash
# Core additions
pnpm add react-router recharts @tanstack/react-table react-hook-form zod @hookform/resolvers dexie-react-hooks
```

### Backend (`apps/api`)

```bash
# Auth + validation
pnpm add arctic jose zod
```

### Shared (`packages/database`)

```bash
# Drizzle-Zod integration
pnpm add drizzle-zod zod
```

---

## Architecture Implications

### Shared Package Strategy

Zod schemas should be defined in a shared location (either `packages/database` alongside Drizzle schemas via `drizzle-zod`, or a new `packages/shared` package). Both `apps/web` and `apps/api` import from there.

```
packages/database/
  └── src/
      ├── schema.ts          (Drizzle table defs — exists)
      ├── validation.ts      (Zod schemas via drizzle-zod — NEW)
      └── index.ts           (re-exports — exists)
```

### Auth Flow

```
Browser                    Express API              Google
  │                           │                       │
  ├─ Click "Entrar com Google" ─►                     │
  │                           ├─ arctic.createAuthorizationURL() ──►
  │  ◄── redirect to Google ──┤                       │
  │                           │                       │
  │  ── Google callback ──────►                       │
  │                           ├─ arctic.validateAuthorizationCode() ◄──
  │                           ├─ jose.SignJWT()        │
  │  ◄── httpOnly cookie ─────┤                       │
  │                           │                       │
  ├─ API request + cookie ────►                       │
  │                           ├─ jose.jwtVerify()     │
  │  ◄── response ────────────┤                       │
```

### Sync Flow

```
Dexie (IndexedDB)         Express API           Neon PostgreSQL
  │                           │                       │
  ├─ CRUD → sync_queue ──────►                       │
  │  (offline or online)      │                       │
  │                           │                       │
  │ [when online]             │                       │
  ├─ POST /sync/push ────────►                       │
  │  (pending operations)     ├─ Drizzle writes ─────►
  │                           │                       │
  ├─ GET /sync/pull?since= ──►                       │
  │                           ├─ Drizzle reads ──────►
  │  ◄── changed records ────┤  ◄── results ─────────┤
  │                           │                       │
  ├─ Apply to Dexie           │                       │
  ├─ Clear synced from queue  │                       │
```

---

## Version Summary

All versions verified from npm on 2026-04-18 unless noted otherwise.

| Package | Version | Weekly Downloads | Last Published |
|---------|---------|-----------------|----------------|
| dexie-react-hooks | 4.4.0 | 325K | ~1 month ago |
| arctic | 3.7.0 | 1.8M | ~1 year ago |
| jose | 6.2.2 | 64.6M | ~1 month ago |
| zod | 4.3.6 | 158.6M | ~3 months ago |
| react-hook-form | 7.72.1 | 49.3M | ~15 days ago |
| @hookform/resolvers | 5.2.2 | 40.4M | ~7 months ago |
| react-router | 7.14.1 | 53.5M | ~5 days ago |
| recharts | 3.8.1 | 45.7M | ~24 days ago |
| @tanstack/react-table | 8.21.3 | 11.2M | ~16 hours ago |
| drizzle-zod | ~0.7.0 | — | VERIFY BEFORE USE |

---

## Sources

- https://dexie.org/cloud/pricing — Dexie Cloud pricing, verified 2026-04-18
- https://www.npmjs.com/package/dexie-cloud-addon — v4.4.10, verified 2026-04-18
- https://www.npmjs.com/package/dexie-react-hooks — v4.4.0, verified 2026-04-18
- https://arcticjs.dev/ — Arctic v3 documentation
- https://www.npmjs.com/package/arctic — v3.7.0, verified 2026-04-18
- https://www.npmjs.com/package/jose — v6.2.2, verified 2026-04-18
- https://www.npmjs.com/package/zod — v4.3.6, verified 2026-04-18
- https://www.npmjs.com/package/react-hook-form — v7.72.1, verified 2026-04-18
- https://www.npmjs.com/package/@hookform/resolvers — v5.2.2, verified 2026-04-18
- https://www.npmjs.com/package/react-router — v7.14.1, verified 2026-04-18
- https://www.npmjs.com/package/recharts — v3.8.1, verified 2026-04-18
- https://www.npmjs.com/package/@tanstack/react-table — v8.21.3, verified 2026-04-18
- https://www.npmjs.com/package/@mui/material — v9.0.0, verified 2026-04-18 (still MD2)
- https://mui.com/material-ui/getting-started/ — confirms MD2, MD3 tracked in GitHub issue #29345
- https://www.npmjs.com/package/passport — v0.7.0, last published 2 years ago
- https://www.npmjs.com/package/passport-google-oauth20 — v2.0.0, last published 7 years ago
