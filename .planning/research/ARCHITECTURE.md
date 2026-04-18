# Architecture Patterns — Offline-First Sync + Auth + UI Components

**Project:** Espoa — Rural Association Management PWA
**Domain:** Offline-first PWA with eventual sync to serverless PostgreSQL
**Researched:** 2026-04-18

---

## Recommended Architecture

### High-Level System View

```
┌─────────────────────────────────────────────────────────────────┐
│ BROWSER (PWA — installed on phone)                              │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ UI Layer (React 19 + React Router)                        │  │
│  │                                                           │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐   │  │
│  │  │  CRUD Views  │  │   Admin      │  │  Landing /     │   │  │
│  │  │  (Farmer)    │  │   Dashboard  │  │  Auth Screens  │   │  │
│  │  └──────┬───────┘  └──────┬───────┘  └───────┬────────┘   │  │
│  │         │                 │                   │            │  │
│  │  ┌──────▼─────────────────▼───────────────────▼────────┐   │  │
│  │  │  Data Access Layer (Dexie hooks + Zustand stores)   │   │  │
│  │  │  useLiveQuery()  ←→  Zustand (auth, sync, UI state) │   │  │
│  │  └──────┬──────────────────────────────────────────────┘   │  │
│  │         │                                                  │  │
│  │  ┌──────▼──────────────────────────────────────────────┐   │  │
│  │  │  Dexie (IndexedDB)                                  │   │  │
│  │  │  ┌────────────────────┐  ┌───────────────────────┐  │   │  │
│  │  │  │  Domain Tables     │  │  Sync Infrastructure  │  │   │  │
│  │  │  │  (7 entities)      │  │  sync_queue           │  │   │  │
│  │  │  │                    │  │  conflict_log          │  │   │  │
│  │  │  └────────────────────┘  └───────────┬───────────┘  │   │  │
│  │  └──────────────────────────────────────┼──────────────┘   │  │
│  └─────────────────────────────────────────┼──────────────────┘  │
│                                            │                     │
│  ┌─────────────────────────────────────────▼──────────────────┐  │
│  │  Sync Engine (client-side module)                          │  │
│  │  • Online detector (navigator.onLine + heartbeat)          │  │
│  │  • Push: drain sync_queue → POST /api/sync/push            │  │
│  │  • Pull: GET /api/sync/pull?since=<timestamp>              │  │
│  │  • Conflict writer → conflict_log if version mismatch      │  │
│  │  • Exponential backoff on network failures                 │  │
│  └─────────────────────────────────────────┬──────────────────┘  │
│                                            │ HTTPS (Axios)       │
│  ┌─────────────────────────────────────────┼──────────────────┐  │
│  │  Service Worker (Workbox via vite-plugin-pwa)              │  │
│  │  • Precache: app shell (HTML, CSS, JS, fonts, icons)       │  │
│  │  • Runtime: cache-first for static, network-first for API  │  │
│  │  • Background Sync API: retry failed sync pushes           │  │
│  └─────────────────────────────────────────┼──────────────────┘  │
└─────────────────────────────────────────────┼────────────────────┘
                                              │
                         ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │ ─ ─ ─ NETWORK ─ ─
                                              │
┌─────────────────────────────────────────────▼────────────────────┐
│ EXPRESS 5 API (apps/api)                                         │
│                                                                  │
│  ┌────────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  Auth Routes   │  │  Sync Routes │  │  CRUD/Query Routes   │  │
│  │  /auth/google  │  │  /sync/push  │  │  /api/associados     │  │
│  │  /auth/callback│  │  /sync/pull  │  │  /api/mensalidades   │  │
│  │  /auth/refresh │  │              │  │  /api/dashboard      │  │
│  └───────┬────────┘  └──────┬───────┘  └──────────┬───────────┘  │
│          │                  │                      │              │
│  ┌───────▼──────────────────▼──────────────────────▼───────────┐  │
│  │  Middleware Stack                                           │  │
│  │  cors → json → authGuard (jose.jwtVerify) → zod validate   │  │
│  └─────────────────────────┬───────────────────────────────────┘  │
│                            │                                      │
│  ┌─────────────────────────▼───────────────────────────────────┐  │
│  │  Drizzle ORM + @espoa/database                              │  │
│  └─────────────────────────┬───────────────────────────────────┘  │
└─────────────────────────────┼────────────────────────────────────┘
                              │ neon HTTP driver
                              ▼
                 ┌──────────────────────┐
                 │  Neon PostgreSQL     │
                 │  (serverless)        │
                 │  Source of truth     │
                 └──────────────────────┘
```

---

## Component Boundaries

### Client-Side Components

| Component | Responsibility | Reads From | Writes To | Technology |
|-----------|---------------|------------|-----------|------------|
| **UI Layer** | Render screens, handle user input, navigation | Dexie (via useLiveQuery), Zustand | Dexie (local writes) | React 19, React Router, React Hook Form |
| **Data Access Layer** | Abstract Dexie reads/writes, expose reactive queries | Dexie | Dexie + sync_queue | dexie-react-hooks, Zustand |
| **Sync Engine** | Detect connectivity, push/pull changes, handle conflicts | sync_queue, conflict_log | Dexie tables, sync_queue, conflict_log | Custom module, Axios |
| **Auth State** | Token storage, auth status, user profile | Zustand (memory), cookie (JWT) | Zustand | Zustand, jose (decode only) |
| **Service Worker** | Cache app shell, retry failed syncs | Cache API, Background Sync | Cache API | Workbox (via vite-plugin-pwa) |

### Server-Side Components

| Component | Responsibility | Reads From | Writes To | Technology |
|-----------|---------------|------------|-----------|------------|
| **Auth Routes** | OAuth flow, JWT issuance, token refresh | Google OAuth (via Arctic) | JWT cookie | Arctic, jose |
| **Sync Routes** | Accept pushed changes, serve pulled changes | Drizzle/Neon | Drizzle/Neon | Express 5, Drizzle |
| **CRUD Routes** | Direct API for admin queries, dashboard data | Drizzle/Neon | Drizzle/Neon | Express 5, Drizzle |
| **Auth Middleware** | Verify JWT on protected routes | JWT from cookie/header | — | jose |
| **Validation Middleware** | Validate request bodies against Zod schemas | Request body | — | Zod (shared schemas) |

### Shared Package (`packages/database`)

| Export | Used By | Purpose |
|--------|---------|---------|
| Drizzle schemas | `apps/api` | ORM table definitions |
| Zod schemas (via drizzle-zod) | `apps/web`, `apps/api` | Form validation + API request validation |
| `db` connection | `apps/api` | Neon PostgreSQL queries |
| TypeScript types | `apps/web`, `apps/api` | Shared domain types |

---

## Data Flow

### 1. Local-First Write (User Creates/Edits/Deletes)

All mutations go to Dexie first. The server never blocks a user operation.

```
User action
    │
    ▼
React form (validated by Zod)
    │
    ▼
Dexie transaction (atomic):
    ├── 1. Write to domain table (e.g., associado)
    │       • Set version = version + 1
    │       • Set updated_at = now
    │       • Set device_id = this device's UUID
    │
    └── 2. Enqueue to sync_queue
            • table_name: "associado"
            • record_id: <uuid>
            • operation: "create" | "update" | "delete"
            • payload: JSON.stringify(record)
            • synced: 0
            • created_at: ISO timestamp
    │
    ▼
UI updates instantly (useLiveQuery reacts to Dexie change)
```

**Key design rule: The Dexie write and sync_queue enqueue happen in the same Dexie transaction.** If either fails, both roll back. This guarantees no operation is lost.

### 2. Sync Push (Client → Server)

When online, the Sync Engine drains the queue.

```
Sync Engine detects: navigator.onLine === true
    │
    ▼
Read sync_queue WHERE synced = 0, ORDER BY created_at ASC
    │
    ▼
Batch operations (max ~50 per request to avoid timeouts)
    │
    ▼
POST /api/sync/push
    Headers: { Authorization: Bearer <JWT> }
    Body: {
      device_id: "uuid-of-device",
      operations: [
        { table: "associado", id: "uuid", op: "create", version: 2, payload: {...} },
        { table: "mensalidade", id: "uuid", op: "update", version: 3, payload: {...} },
        ...
      ]
    }
    │
    ▼
Server processes each operation:
    ├── For each operation:
    │     ├── Check: server_record.version < incoming_version?
    │     │     ├── YES → Apply change via Drizzle, return { id, status: "applied" }
    │     │     └── NO  → Return { id, status: "conflict", server_data: {...} }
    │     │
    │     └── For "create": INSERT, return { id, status: "applied" }
    │
    ▼
Response: {
  applied: ["uuid1", "uuid2"],
  conflicts: [{ id: "uuid3", server_version: 5, server_data: {...} }]
}
    │
    ▼
Client processes response:
    ├── Applied → Mark sync_queue entries as synced = 1
    └── Conflicts → Write to conflict_log for resolution
```

### 3. Sync Pull (Server → Client)

After pushing, the client pulls changes made by other devices or admin operations.

```
Sync Engine (after push completes, or on timer):
    │
    ▼
GET /api/sync/pull?since=<last_sync_timestamp>&device_id=<uuid>
    Headers: { Authorization: Bearer <JWT> }
    │
    ▼
Server queries:
    SELECT * FROM each_table
    WHERE updated_at > :since
      AND device_id != :device_id   ← don't send back our own changes
    ORDER BY updated_at ASC
    LIMIT 500
    │
    ▼
Response: {
  changes: [
    { table: "associado", id: "uuid", data: {...}, version: 3, deleted_at: null },
    { table: "ata", id: "uuid", data: {...}, version: 1, deleted_at: "2026-04-18T..." },
    ...
  ],
  sync_timestamp: "2026-04-18T14:30:00Z",  ← client stores for next pull
  has_more: false                            ← pagination signal
}
    │
    ▼
Client applies changes to Dexie:
    ├── For each change:
    │     ├── Local record exists AND local.version > remote.version?
    │     │     └── Conflict → write to conflict_log
    │     ├── Local record exists AND local.version <= remote.version?
    │     │     └── Overwrite local with remote data
    │     └── No local record?
    │           └── Insert into Dexie
    │
    └── Store sync_timestamp in Dexie metadata table
```

### 4. Conflict Resolution

```
Conflict detected (push or pull):
    │
    ▼
Write to conflict_log:
    • table_name, record_id
    • local_data: JSON of local version
    • remote_data: JSON of server version
    • resolved: 0
    │
    ▼
Resolution strategy (configurable per table):
    │
    ├── AUTO: Last-write-wins (default for most tables)
    │     Compare updated_at timestamps, keep most recent.
    │     Suitable for: associado, producao, ata
    │
    ├── AUTO: Server-wins (for financial data)
    │     Server version always wins to prevent tampering.
    │     Suitable for: transacao_financeira, mensalidade
    │
    └── MANUAL: Admin reviews (rare edge cases)
    │     Show in admin dashboard: "3 conflicts pending"
    │     Admin picks which version to keep.
    │     Suitable for: edital_pnae, relatorio_pnae
    │
    ▼
After resolution:
    Mark conflict_log.resolved = 1
    Apply winning version to both Dexie and sync_queue (to push resolution)
```

---

## Auth Flow for Offline-First Context

### The Challenge

Traditional OAuth flows require network access. In an offline-first app:
- Users must be able to **use the app offline** after initial authentication
- The JWT must be **long-lived enough** to survive extended offline periods
- Sync operations need a **valid token** — but the user shouldn't be blocked from local work

### Auth Architecture

```
INITIAL LOGIN (requires network):

  ┌──────────┐         ┌──────────────┐         ┌──────────┐
  │  Browser  │         │  Express API │         │  Google  │
  └────┬──────┘         └──────┬───────┘         └────┬─────┘
       │                       │                      │
       ├── GET /auth/google ──►│                      │
       │                       ├── arctic.createAuthorizationURL()
       │  ◄── 302 redirect ───┤         ──────────────►
       │                       │                      │
       ├── (user logs in at Google) ─────────────────►│
       │                       │                      │
       │  ◄── callback with code ─────────────────────┤
       ├── GET /auth/callback?code=xxx ──►│           │
       │                       ├── arctic.validateAuthorizationCode()
       │                       │         ──────────────►
       │                       │  ◄── tokens + profile ┤
       │                       │                      │
       │                       ├── Verify user is authorized
       │                       │   (check allowed email list or domain)
       │                       │
       │                       ├── jose.SignJWT({
       │                       │     sub: user_id,
       │                       │     email: email,
       │                       │     role: "admin" | "farmer",
       │                       │     device_id: <generated>
       │                       │   })
       │                       │   .setExpirationTime('30d')  ← long-lived for offline
       │                       │
       │  ◄── Set-Cookie: token=<JWT>; HttpOnly; Secure; SameSite=Strict
       │  ◄── Body: { user: {...}, device_id: "uuid" }
       │                       │
       ├── Store in Zustand:   │
       │   user, role,         │
       │   device_id           │
       │                       │
       ├── Store device_id     │
       │   in Dexie metadata   │
       │                       │
       ▼                       ▼
```

### Token Lifecycle for Offline-First

```
Token issued (30-day expiry)
    │
    ├── Days 0-20: Token valid
    │     • Sync operations work normally
    │     • Local CRUD always works (no token needed for Dexie)
    │
    ├── Days 20-27: Token nearing expiry
    │     • Sync Engine attempts POST /auth/refresh
    │     │   ├── Online → New 30-day token issued, restart cycle
    │     │   └── Offline → Continue with current token, retry later
    │     • UI shows subtle "Conecte-se para renovar acesso" hint
    │
    ├── Days 27-30: Token about to expire
    │     • UI shows warning: "Seu acesso expira em 3 dias"
    │     • Local CRUD still works
    │     • Sync paused if token invalid
    │
    └── Day 30+: Token expired
          • Local CRUD still works (Dexie doesn't check JWT)
          • Sync is blocked until re-authentication
          • UI shows: "Faça login para sincronizar seus dados"
          • All queued changes are preserved in sync_queue
          • On next login, sync_queue drains automatically
```

**Key principle: Authentication gates sync, not local usage.** A farmer with an expired token can still view data, create records, and do all local work. Only sync to/from the server requires a valid token.

### Device Registration

Each device gets a UUID stored in Dexie `_metadata` table on first auth. This device_id:
- Tags all local writes (so server can filter "don't send me my own changes" on pull)
- Enables per-device conflict tracking
- Persists across sessions (stored in IndexedDB, not in JWT)

---

## UI Component Boundaries

### Route Structure

```
/                           → Landing page (public, existing)
/app                        → App shell (authenticated)
  /app/dashboard            → Admin dashboard (admin only)
  /app/associados           → Member list + search
  /app/associados/:id       → Member detail / edit
  /app/associados/novo      → Create member
  /app/financeiro           → Financial overview
  /app/financeiro/nova      → New transaction
  /app/mensalidades         → Dues/payment list
  /app/atas                 → Meeting minutes list
  /app/atas/:id             → Meeting detail / edit
  /app/atas/nova            → New meeting minutes
  /app/producao             → Production records
  /app/producao/nova        → New production entry
  /app/pnae                 → PNAE notices + reports
  /app/configuracoes        → Settings (sync status, account)
/auth/login                 → Login screen
/auth/callback              → OAuth callback handler
```

### Component Architecture

```
<App>
├── <LandingPage />              ← Public, existing
│
├── <AuthLayout />                ← Login / callback pages
│   ├── <LoginScreen />
│   └── <AuthCallback />
│
└── <AppShell />                  ← Authenticated area
    ├── <BottomNav />             ← Mobile nav (farmer profile)
    ├── <SideNav />               ← Desktop nav (admin profile)
    ├── <SyncStatusBar />         ← "Offline" / "Syncing..." / "✓ Synced"
    │
    ├── <DashboardPage />         ← Admin only
    │   ├── <StatCard />          ← Total members, revenue, etc.
    │   ├── <RevenueChart />      ← Recharts: monthly in/out
    │   ├── <MembershipChart />   ← Recharts: active vs inactive
    │   ├── <RecentActivity />    ← TanStack Table: last 10 ops
    │   └── <PendingDues />       ← Members with overdue payments
    │
    ├── <AssociadoListPage />
    │   ├── <SearchBar />
    │   ├── <AssociadoCard />     ← Card-based list (mobile-friendly)
    │   └── <FAB "+" />           ← Floating action button → /novo
    │
    ├── <AssociadoFormPage />     ← Create / Edit (same component)
    │   └── <AssociadoForm />     ← React Hook Form + Zod validation
    │
    ├── <FinanceiroPage />
    │   ├── <BalanceSummary />
    │   ├── <TransactionList />   ← TanStack Table with filters
    │   └── <FAB "+" />
    │
    ├── <MensalidadesPage />
    │   ├── <PaymentStatusGrid /> ← Matrix: members × months
    │   └── <RegisterPayment />   ← Dialog/sheet for quick entry
    │
    ├── <AtasPage />
    │   ├── <AtaList />
    │   └── <AtaForm />           ← Rich-ish text (textarea for v1)
    │
    ├── <ProducaoPage />
    │   ├── <ProducaoList />
    │   └── <ProducaoForm />
    │
    ├── <PnaePage />
    │   ├── <EditalList />
    │   └── <RelatorioView />
    │
    └── <ConfigPage />
        ├── <SyncStatus />        ← Queue size, last sync, conflicts
        ├── <ConflictList />      ← Pending conflicts for admin
        └── <AccountInfo />       ← User profile, logout
```

### Two-Profile UX Strategy

```
FARMER (agricultor) profile:              ADMIN profile:
┌──────────────────────────┐             ┌──────────────────────────┐
│  Bottom navigation:      │             │  Side navigation:        │
│  • Início (home/summary) │             │  • Dashboard             │
│  • Meus Dados (my data)  │             │  • Associados            │
│  • Produção              │             │  • Financeiro            │
│  • Mais (atas, PNAE)     │             │  • Mensalidades          │
│                          │             │  • Atas                  │
│  Large touch targets     │             │  • Produção              │
│  Icon + label on buttons │             │  • PNAE                  │
│  Simplified card views   │             │  • Configurações         │
│  Read-focused (own data) │             │                          │
└──────────────────────────┘             │  Data tables + filters   │
                                         │  Full CRUD on all entities│
                                         │  Dashboard charts        │
                                         └──────────────────────────┘
```

The profile is determined by the JWT `role` claim. React Router guards restrict admin routes:

```typescript
// Simplified route guard
function AdminRoute({ children }) {
  const role = useAuthStore(s => s.user?.role);
  if (role !== 'admin') return <Navigate to="/app" />;
  return children;
}
```

---

## Patterns to Follow

### Pattern 1: Repository Pattern for Dexie Access

Wrap Dexie operations behind a repository to centralize sync_queue enqueuing.

```typescript
// src/repositories/associado.repo.ts
import { db } from '../database/db';
import { v4 as uuid } from 'uuid';

export const associadoRepo = {
  async create(data: Omit<Associado, 'id' | 'version' | 'updated_at'>) {
    const id = uuid();
    const now = new Date().toISOString();
    const record = { ...data, id, version: 1, updated_at: now, device_id: getDeviceId() };

    await db.transaction('rw', [db.associado, db.sync_queue], async () => {
      await db.associado.add(record);
      await db.sync_queue.add({
        table_name: 'associado',
        record_id: id,
        operation: 'create',
        payload: JSON.stringify(record),
        synced: 0,
        created_at: now,
      });
    });

    return record;
  },

  async update(id: string, changes: Partial<Associado>) {
    const now = new Date().toISOString();
    await db.transaction('rw', [db.associado, db.sync_queue], async () => {
      const existing = await db.associado.get(id);
      if (!existing) throw new Error('Not found');

      const updated = {
        ...existing,
        ...changes,
        version: existing.version + 1,
        updated_at: now,
        device_id: getDeviceId(),
      };
      await db.associado.put(updated);
      await db.sync_queue.add({
        table_name: 'associado',
        record_id: id,
        operation: 'update',
        payload: JSON.stringify(updated),
        synced: 0,
        created_at: now,
      });
    });
  },

  async softDelete(id: string) {
    return this.update(id, { deleted_at: new Date().toISOString() });
  },
};
```

**Why:** Every write automatically enqueues for sync. Impossible to forget. The Dexie transaction guarantees atomicity.

### Pattern 2: Sync Engine as Singleton Module

```typescript
// src/sync/sync-engine.ts
class SyncEngine {
  private interval: ReturnType<typeof setInterval> | null = null;
  private syncing = false;

  start(intervalMs = 30_000) {
    this.interval = setInterval(() => this.tick(), intervalMs);
    window.addEventListener('online', () => this.tick());
  }

  stop() {
    if (this.interval) clearInterval(this.interval);
  }

  private async tick() {
    if (this.syncing || !navigator.onLine) return;
    if (!getAuthToken()) return; // No sync without valid JWT

    this.syncing = true;
    try {
      await this.push();
      await this.pull();
    } catch (err) {
      // Exponential backoff on repeated failures
    } finally {
      this.syncing = false;
    }
  }

  private async push() { /* drain sync_queue in batches */ }
  private async pull() { /* fetch changes since last_sync_timestamp */ }
}

export const syncEngine = new SyncEngine();
```

### Pattern 3: Online/Offline State in Zustand

```typescript
// src/stores/sync-store.ts
interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncAt: string | null;
  pendingCount: number;   // sync_queue WHERE synced = 0
  conflictCount: number;  // conflict_log WHERE resolved = 0
}
```

The `SyncStatusBar` component reads this store to show connection state. The farmer sees a simple icon; the admin sees detailed sync info.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Fetching from Server for Reads

**What:** Making API calls to read data that should come from Dexie.
**Why bad:** Defeats offline-first. Adding latency. If offline, reads fail.
**Instead:** All reads come from Dexie via `useLiveQuery()`. Server is only for sync push/pull.

### Anti-Pattern 2: Sync on Every Write

**What:** Triggering a server sync immediately when the user saves a record.
**Why bad:** Blocks the UI. Fails when offline. Battery drain on mobile.
**Instead:** Enqueue to `sync_queue`. Sync Engine drains on a timer or when connectivity returns. Immediate sync feel comes from Dexie's local write being instant.

### Anti-Pattern 3: Storing Auth State Only in Memory

**What:** Relying on Zustand alone for auth state without persisting the JWT.
**Why bad:** Page refresh = logged out. User has to re-authenticate every time.
**Instead:** JWT lives in httpOnly secure cookie (sent with every API request automatically). Zustand holds decoded user info for UI rendering. On page load, try `GET /auth/me` → if cookie valid, populate Zustand. If offline, populate from cached Dexie `_metadata.user`.

### Anti-Pattern 4: Full Table Sync

**What:** Pulling ALL records from server on every sync.
**Why bad:** For an association with 200 members × 12 months of payments × years = thousands of records. Full sync wastes bandwidth on rural connections.
**Instead:** Delta sync with `since` timestamp. Only transfer what changed. Paginate large changesets (500 per response).

### Anti-Pattern 5: Ignoring Schema Drift

**What:** Having Dexie types (snake_case) and Drizzle schemas (camelCase) diverge silently.
**Why bad:** Sync will silently drop fields or error on mismatched keys.
**Instead:** The sync push/pull layer must include a field-name mapping. Define it once:

```typescript
// src/sync/field-map.ts
const FIELD_MAP = {
  associado: {
    data_entrada: 'dataEntrada',
    updated_at: 'updatedAt',
    device_id: 'deviceId',
    deleted_at: 'deletedAt',
  },
  // ... per table
} as const;
```

Or better: use Zod schemas with `.transform()` to convert between formats at the sync boundary.

---

## Scalability Considerations

| Concern | 20 members (v1) | 200 members | 1000+ members |
|---------|:---------------:|:-----------:|:-------------:|
| IndexedDB size | ~1 MB | ~10 MB | ~50 MB (within browser limits) |
| Sync queue batch | No batching needed | 50 ops/batch | 50 ops/batch + pagination |
| Pull response | All changes fit in 1 response | Paginate at 500 | Paginate at 500 |
| Conflict rate | Near zero (1 admin) | Low (few admins) | Medium (need auto-resolve) |
| Neon cold start | ~200ms (occasional) | OK | OK (serverless scales) |
| Dashboard queries | Simple counts | Aggregations in Dexie | Consider server-side aggregation |

---

## Build Order (Dependencies Between Components)

Build in this order — each layer depends on the ones above it:

```
WAVE 1 — Foundation (no runtime dependencies between them)
├── 1A. Shared Zod schemas in packages/database (drizzle-zod)
├── 1B. Fix schema drift (field name mapping layer)
├── 1C. Fix relatorio_pnae missing sync fields
└── 1D. Auth endpoints (Arctic + jose in apps/api)

WAVE 2 — Data Layer (depends on Wave 1)
├── 2A. Repository pattern for Dexie (write + sync_queue enqueue)
├── 2B. API CRUD routes (Express + Drizzle + Zod validation)
└── 2C. Auth integration on client (login flow, Zustand, route guards)

WAVE 3 — Sync (depends on Wave 2)
├── 3A. Sync push endpoint (POST /api/sync/push)
├── 3B. Sync pull endpoint (GET /api/sync/pull)
├── 3C. Client Sync Engine (push + pull + conflict detection)
└── 3D. Conflict resolution (auto + manual admin view)

WAVE 4 — UI (depends on Wave 2, can start in parallel with Wave 3)
├── 4A. App shell + routing + bottom nav
├── 4B. Associado CRUD screens (first entity, establishes pattern)
├── 4C. Financial screens (mensalidades + transações)
├── 4D. Atas + Produção screens (repeat pattern from 4B)
└── 4E. PNAE screens

WAVE 5 — Dashboard + Polish (depends on Wave 4)
├── 5A. Admin dashboard (Recharts + TanStack Table)
├── 5B. Sync status UI + conflict resolution UI
└── 5C. Farmer-specific simplified views
```

### Dependency Graph

```
1A ──► 2B (API needs Zod schemas for validation)
1B ──► 3A, 3B, 3C (sync needs field mapping to work)
1C ──► 3B (relatorio_pnae needs sync fields to participate in pull)
1D ──► 2C (client auth needs API auth endpoints)
2A ──► 3C (sync engine reads sync_queue written by repositories)
2A ──► 4B (CRUD screens use repositories to write data)
2B ──► 3A (sync push calls same Drizzle write logic as CRUD routes)
2C ──► 3C (sync engine needs auth token from auth store)
4B ──► 4C, 4D (establishes CRUD screen pattern, others follow same shape)
3C ──► 5B (sync status UI shows sync engine state)
4B-4E ──► 5A (dashboard aggregates data from all entities)
```

**Critical path:** 1A → 2A → 4B gives the first visible working feature (CRUD with local persistence) without needing sync. This lets users start testing the app while sync is built in parallel.

---

## Sources

| Claim | Source | Confidence |
|-------|--------|------------|
| Dexie transactions are ACID for multi-table writes | dexie.org/docs/Tutorial/Design (verified 2026-04-18) | HIGH |
| Dexie CRUD hooks enable sync interception | dexie.org/docs/Tutorial/Design — Change Tracking section (verified 2026-04-18) | HIGH |
| Dexie Cloud free tier: 3 production users | dexie.org/cloud, dexie.org/pricing (verified 2026-04-18) | HIGH |
| Background Sync API for retry | web.dev/articles/offline-cookbook (verified 2026-04-18) | HIGH |
| Workbox caching strategies (cache-first, network-first, stale-while-revalidate) | developer.chrome.com/docs/workbox/caching-strategies-overview (verified 2026-04-18) | HIGH |
| Hybrid Logical Clocks for event ordering | jaredforsyth.com/posts/hybrid-logical-clocks (verified 2026-04-18) | MEDIUM |
| Operation-based sync queue pattern | RxDB documentation on replication patterns, training data on CRDTs-for-mortals pattern | MEDIUM |
| Version + updated_at conflict detection (optimistic concurrency) | Standard pattern documented in rxdb.info/offline-first.html, training data | HIGH |
| Arctic for Google OAuth | STACK.md research (npm verified 2026-04-18) | HIGH |
| jose for JWT | STACK.md research (npm verified 2026-04-18) | HIGH |
| Field name mapping for schema drift | Project-specific analysis of CONCERNS.md | HIGH |
| 30-day JWT expiry for offline-first | Training data; common in offline-first literature. No single canonical source. | LOW |

**LOW confidence items for later validation:**
- The 30-day JWT expiry is a pragmatic choice, not a hard standard. Test with real users to find the right balance between security and usability.
- HLC (Hybrid Logical Clocks) are noted here as an option if `updated_at` timestamp ordering proves insufficient. For v1 with low concurrency (1-3 admins), simple timestamp + version is adequate. Revisit if conflict rates increase.
