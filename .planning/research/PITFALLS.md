# Domain Pitfalls

**Project:** Espoa — Rural Association Management PWA
**Domain:** Offline-first PWA for Brazilian rural associations + PNAE compliance
**Researched:** 2026-04-18
**Confidence:** HIGH (grounded in codebase analysis, offline-first architecture patterns, and PNAE regulatory knowledge)

---

## Critical Pitfalls

Mistakes that cause rewrites, data loss, or make the product unusable.

---

### Pitfall 1: Floating-Point Currency — Silent Financial Corruption

**What goes wrong:** The codebase uses `real` (floating-point) for monetary `valor` fields in `transacao_financeira`, `mensalidade`, and `producao`. Floating-point arithmetic accumulates rounding errors: `0.1 + 0.2 = 0.30000000000000004`. Over months of financial transactions, totals silently drift. An association reports R$ 12.450,00 in PNAE income but the sum of individual entries yields R$ 12.449,97. This breaks prestação de contas to municipalities and can disqualify the association from future PNAE participation.

**Why it happens:** `real` is the default numeric type developers reach for. The rounding is invisible until someone audits totals against line items.

**Consequences:**
- Financial reports don't reconcile. Auditors reject prestação de contas.
- Association loses PNAE contracts — their primary market channel.
- Trust erosion: members see inconsistent numbers and suspect admin corruption.

**Warning signs:**
- Sum of transactions ≠ reported total (off by centavos)
- Rounding differences when exporting CSV/PDF vs. in-app display
- `toFixed(2)` sprinkled throughout the codebase as a band-aid

**Prevention:**
- Change `real("valor")` → `numeric("valor", { precision: 12, scale: 2 })` in all Drizzle schemas (`transacao-financeira.ts`, `mensalidade.ts`, `producao.ts`).
- On the Dexie side, store `valor` as integer centavos (e.g., R$ 12,50 → `1250`) and convert only for display. This eliminates floating-point math entirely in IndexedDB.
- Use integer arithmetic or a decimal library for all financial calculations.

**Detection:** Write a test that sums 1000 random transactions and compares with individual `toFixed(2)` results.

**Phase assignment:** Must be fixed in the very first schema migration phase, before any financial data is written.

---

### Pitfall 2: Schema Drift Causing Silent Sync Failures

**What goes wrong:** The Dexie client types (`apps/web/src/database/types.ts`, snake_case: `data_entrada`, `associado_id`) and Drizzle server schemas (`packages/database/src/schema/*.ts`, camelCase: `dataEntrada`, `associadoId`) are defined independently with no shared source of truth. When a field is added, renamed, or its type changes on one side, the other side silently continues using the old shape. The sync layer pushes `{ data_entrada: "2026-04-18" }` but the server expects `dataEntrada` — the insert succeeds with `null` in the column, or fails with a validation error that's swallowed by the sync retry logic.

**Why it happens:** Natural consequence of two independent database layers (IndexedDB + PostgreSQL) with two different ORMs (Dexie + Drizzle) that don't share type definitions.

**Consequences:**
- Data written offline never reaches the server correctly.
- Users believe their data is saved (it is, locally) but sync silently fails.
- Once discovered, requires manual data migration on both sides.

**Warning signs:**
- Sync queue grows but items keep failing
- Server database has NULL values in non-nullable columns (Drizzle defaults)
- Client and server records for the same entity have different field counts

**Prevention:**
- Use `drizzle-zod` to generate Zod schemas from the Drizzle definitions. These become the single source of truth.
- Generate Dexie-compatible types from the same Zod schemas (with a snake_case transform utility).
- Add a CI check: type-check a sample sync payload against both Dexie types and Drizzle insert schemas.
- The sync layer must explicitly map between client field names and server field names — never assume they match.

**Detection:** Unit test that serializes a Dexie record, transforms it for the API, and validates against the Drizzle insert schema.

**Phase assignment:** Must be resolved before sync implementation. Part of the "shared validation" / schema unification phase.

---

### Pitfall 3: `relatorio_pnae` Excluded from Sync by Missing Fields

**What goes wrong:** The `relatorio_pnae` table lacks `version`, `updated_at`, `device_id`, and `deleted_at` — the four fields every other entity uses for sync. If sync is built generically (iterating over table names and using version-based conflict resolution), the sync engine will crash or silently skip `relatorio_pnae`. PNAE reports created offline will never reach the server.

**Why it happens:** The schema was likely defined before the sync pattern was finalized.

**Consequences:**
- PNAE reports exist only on the device that created them.
- If that device is lost/reset, reports are gone.
- Other admin devices never see the report.

**Warning signs:**
- PNAE reports visible on one device but not others.
- Sync logic has a special case or try/catch around relatorio_pnae.

**Prevention:**
- Add `version`, `updated_at`, `device_id`, `deleted_at` to `relatorio_pnae` in the next schema migration.
- Also restructure the table to have proper structured fields (`produtos_entregues`, `valor_total`, `membros_participantes`) instead of a single `conteudo` text blob — as flagged in FEATURES.md.
- Add a lint rule or schema test: "every domain entity table must have the 4 sync fields."

**Phase assignment:** Schema migration phase, alongside the currency type fix.

---

### Pitfall 4: Sync Queue Grows Forever on Unreliable Networks

**What goes wrong:** The sync queue (`sync_queue` table) enqueues every write operation. In rural areas with days-long offline periods, the queue accumulates hundreds of entries. When connectivity returns briefly (unstable 2G/3G), the sync engine tries to push the entire queue, the connection drops mid-request, and partially-synced operations may be re-sent on the next attempt. Without idempotency guarantees, this causes duplicate records on the server or conflicting versions.

**Why it happens:** Developers test sync on fast WiFi. They never simulate "3 days offline, then 30 seconds of flaky 2G."

**Consequences:**
- Duplicate financial transactions (same mensalidade recorded twice).
- Sync never completes because the batch is too large for the network window.
- Users see "syncing..." indefinitely — lose trust in the system.

**Warning signs:**
- sync_queue table has thousands of unsynced entries
- Server has duplicate records with slightly different `updated_at` timestamps
- Sync takes minutes on slow connections and often times out

**Prevention:**
- **Batch size limits:** Push max 10-20 operations per request (not 50 — rural networks can't handle large payloads).
- **Idempotent sync operations:** Use the `record_id` + `version` as an idempotency key. Server must check: "If this exact version was already applied, return success without re-applying."
- **Progressive sync:** Mark each batch as synced immediately after server confirms, not after the entire queue is drained.
- **Sync status feedback:** Show users "Synced 15 of 47 changes" — not a spinner.
- **Compact queue:** Before pushing, merge multiple operations on the same record (e.g., 5 edits to the same associado → send only the latest version).

**Detection:** Load test: insert 500 records offline, then enable a throttled connection (50kbps, 2s latency, 10% packet loss). Measure sync completion time and check for duplicates.

**Phase assignment:** Core sync implementation phase. This is architectural — can't be bolted on later.

---

### Pitfall 5: IndexedDB Storage Limits and Silent Data Loss

**What goes wrong:** IndexedDB storage is not unlimited. On Android Chrome, the browser can use up to 60% of available disk space, but low-end phones (common in rural Brazil — 16-32GB storage with WhatsApp, photos, and other apps competing) may have as little as 200-500MB available. More critically, the browser can **evict** IndexedDB data under storage pressure without notifying the user — unless the app has requested persistent storage via `navigator.storage.persist()`.

**Why it happens:** Developers test on phones with ample storage. IndexedDB doesn't throw errors when approaching limits — it just starts failing writes, which Dexie surfaces as transaction errors that may be confused with other bugs.

**Consequences:**
- User creates records normally, but writes silently fail → data loss.
- If browser evicts IndexedDB without persistent storage permission, ALL local data (including unsynced changes) is destroyed.
- User loses weeks of offline work.

**Warning signs:**
- Dexie transaction errors that seem random
- Users report "I entered this yesterday and it's gone"
- App works fine for months then suddenly loses data

**Prevention:**
- **Request persistent storage on first launch:** `navigator.storage.persist()` — prevents browser eviction. Show the user a clear explanation in Portuguese of why they should accept.
- **Monitor storage usage:** Use `navigator.storage.estimate()` and warn at 80% capacity.
- **Prioritize unsynced data:** If storage is tight, the UI should aggressively prompt for sync ("Você tem 47 alterações não sincronizadas — conecte à internet").
- **Never store large blobs in IndexedDB:** Meeting minutes (`ata.conteudo`) should be plain text, not rich HTML with embedded images.

**Detection:** Test on a low-end Android phone (2GB RAM, 16GB storage with 80% full).

**Phase assignment:** PWA setup/hardening phase. Must be in place before users start entering production data.

---

### Pitfall 6: Offline Auth Token Expiry Locks Users Out

**What goes wrong:** The JWT issued at login has an expiration time. If a user logs in on Monday, goes offline for a week (common in remote rural areas), their JWT expires. When they open the app on Friday, the client-side JWT validation fails, and the app redirects to the login screen. But login requires Google OAuth, which requires internet. The user is locked out of their own local data.

**Why it happens:** Standard auth patterns assume persistent connectivity. JWT expiry is a security best practice that conflicts with offline-first requirements.

**Consequences:**
- User can't access local data they've been entering for days.
- Panic: "The app deleted my data" (it didn't — it just won't show it).
- Users stop trusting the app and revert to paper.

**Warning signs:**
- Users complain app "kicks them out" after a few days offline
- Support requests increase on Mondays (when rural workers return from areas without signal)

**Prevention:**
- **Separate auth for local access vs. sync:** Expired JWT blocks sync (correct — don't send stale tokens to the server), but does NOT block local CRUD operations.
- **Long-lived offline session:** Store a local session indicator (device fingerprint + user role) in IndexedDB that allows offline access indefinitely after first login.
- **Refresh on reconnection:** When connectivity returns, silently attempt a token refresh. If the refresh token is also expired, prompt re-login before sync — but never block local data access.
- **Grace period:** 30-day offline access minimum before requiring re-authentication.

**Detection:** Test: log in, disconnect, advance system clock 14 days, reopen app. Verify local data is accessible.

**Phase assignment:** Authentication phase. Must be designed into the auth architecture from the start.

---

## High Pitfalls

Mistakes that cause significant rework or poor user experience.

---

### Pitfall 7: `navigator.onLine` Is Unreliable — False Connectivity Detection

**What goes wrong:** `navigator.onLine` returns `true` if the device has ANY network interface active — including WiFi connected to a router with no internet, or a mobile network with no data plan. The app thinks it's online, attempts sync, fails repeatedly, and either burns the user's limited mobile data on failed requests or shows a "syncing" spinner that never resolves.

**Why it happens:** The API was designed for desktop browsers with binary online/offline. Rural connectivity is a spectrum: no signal → weak 2G → ok 3G → no signal.

**Consequences:**
- Sync engine hammers a dead connection, draining battery and data plan.
- User sees "online" indicator but sync fails — confusing UX.
- Exponential backoff kicks in but may be too aggressive (or not aggressive enough).

**Prevention:**
- **Heartbeat endpoint:** After `navigator.onLine` returns true, ping `GET /api/health` with a 5-second timeout. Only consider "online" if the heartbeat succeeds.
- **Actual request failures as signal:** If a sync push fails with a network error (not a 4xx/5xx), immediately switch to offline mode. Don't retry until next heartbeat success.
- **Connection quality awareness:** If available, use `navigator.connection.effectiveType` — if it's "slow-2g" or "2g", reduce batch sizes further and increase timeouts.
- **User-controlled sync:** Add a "Sincronizar agora" button so users can manually trigger sync when they know they have signal (e.g., they walked to the hill where signal is better).

**Phase assignment:** Sync engine implementation phase.

---

### Pitfall 8: Conflict Resolution That Users Can't Understand

**What goes wrong:** The architecture designs version-based conflict resolution with a `conflict_log` table. But when a conflict occurs (admin edited a member's data on the web while another admin edited it offline on their phone), what does the user see? A diff view? Technical merge options? Most offline-first apps either auto-resolve conflicts silently (last-write-wins, which loses data) or present technical UI that farmers can't interpret.

**Why it happens:** Conflict resolution is the hardest UX problem in offline-first apps. Developers focus on the sync protocol and defer the UI until late, then ship something confusing.

**Consequences:**
- Last-write-wins: Admin A's edits silently overwrite Admin B's → data loss and confusion.
- Technical diff UI: Users ignore it or click randomly → corrupt data.
- Unresolved conflicts pile up in conflict_log → data diverges permanently between devices.

**Warning signs:**
- conflict_log table has entries where `resolved = false` for weeks
- Users report that their edits "disappeared"
- Multiple records with the same data but slightly different fields

**Prevention:**
- **Domain-aware merge rules:** For most entities, use sensible defaults:
  - `associado`: Merge non-conflicting fields (if A changed `contato` and B changed `status`, keep both). Only flag true conflicts (both changed `contato`).
  - `transacao_financeira`: NEVER auto-merge financial data. Flag for admin review.
  - `ata`: Last-write-wins is acceptable (minutes are usually written by one person).
- **Simple conflict UI:** Show a side-by-side card view: "Versão do dispositivo A" vs "Versão do dispositivo B" with a "Escolher esta" button on each. No diffs, no merge tools.
- **Conflict count badge:** If there are unresolved conflicts, show a badge on the admin dashboard → "3 conflitos para resolver."
- **Auto-resolve where safe:** If only metadata fields differ (`updated_at`, `device_id`), auto-resolve silently.

**Phase assignment:** Sync implementation phase (protocol), then a dedicated UX phase for the conflict resolution UI.

---

### Pitfall 9: Service Worker Cache Serving Stale App Versions

**What goes wrong:** The PWA uses vite-plugin-pwa + Workbox for service worker caching. After a deploy, the service worker serves the cached old version of the app. Users continue using outdated code for days/weeks — potentially with bugs that the new version fixed, or with schema changes that make their local data incompatible with the updated server.

**Why it happens:** Service worker lifecycle is confusing. The new worker installs but doesn't activate until all tabs are closed. Users on mobile keep apps in background (not actually closed). PWA installed to homescreen further complicates this — it's hard to "force reload."

**Consequences:**
- Users run different app versions, causing inconsistent behavior reports.
- Schema changes on the server break sync for users with old client code.
- Bug fixes don't reach users for weeks.

**Warning signs:**
- Users report bugs that were already fixed
- Sync errors after server deployment
- Different users see different UI for the same screen

**Prevention:**
- **`skipWaiting()` + reload prompt:** Configure vite-plugin-pwa with `registerType: 'prompt'`. When a new version is detected, show a toast in Portuguese: "Nova versão disponível — Atualizar agora?" with a single button.
- **Version header in API responses:** Server returns `X-App-Version` header. Client compares with its bundled version and prompts update if mismatched.
- **Database migration awareness:** If the new version includes Dexie schema changes (new `db.version(N)`), Dexie handles migration automatically on open — but the old service worker must not prevent the new code from loading.
- **Never use `clientsClaim()` without a reload** — it can serve a mix of old cached resources and new JS, causing hydration errors.

**Phase assignment:** PWA configuration phase (vite-plugin-pwa setup).

---

### Pitfall 10: CPF Data Without Proper Protection — LGPD Compliance

**What goes wrong:** The FEATURES.md recommends adding CPF (Cadastro de Pessoa Física — Brazilian national ID number) to the `associado` entity, which is required for PNAE/CAF documentation. CPF is classified as personal data under LGPD (Lei Geral de Proteção de Dados — Brazilian data protection law, similar to GDPR). Storing CPF in plain text in IndexedDB on the user's phone AND in the server database creates two exposure surfaces.

**Why it happens:** Small-project mentality: "we're a small rural app, LGPD doesn't apply to us." It does — LGPD applies to any entity handling personal data of Brazilian individuals, regardless of size.

**Consequences:**
- If a device is stolen, all members' CPFs are exposed (IndexedDB is not encrypted at rest on most Android devices).
- Data breach notification obligations under LGPD.
- Potential fines (unlikely for small associations, but reputational damage in the community is severe).

**Warning signs:**
- CPF stored as plain varchar without any access control
- No data access logging
- No consent mechanism for data collection

**Prevention:**
- **Minimize CPF exposure:** Store CPF on the server only. On the client, store a masked version (`***.456.789-**`) for display. Full CPF is fetched from the server only when generating PNAE documents (which requires internet anyway).
- **Server-side encryption at rest:** Neon PostgreSQL supports encryption at rest by default — verify this is enabled.
- **Access logging:** Log when CPF is accessed/displayed, by whom.
- **Consent at registration:** When adding a member, show a simple consent text: "Seus dados serão usados para gestão da associação e participação no PNAE."
- **IndexedDB data:** Don't store full CPF in Dexie. Ever.

**Phase assignment:** Schema/validation phase (data modeling) + Authentication phase (access control).

---

### Pitfall 11: Dexie Version Migrations Breaking Existing Local Data

**What goes wrong:** The Dexie schema is currently at `db.version(1)`. The upcoming milestone will add new fields (CPF, categoria, mes_referencia, preco_unitario, etc.) and new tables. Each change requires a new `db.version(N)` with migration logic. If the migration is poorly written (e.g., it adds a required field without a default), Dexie will fail to open the database, and ALL existing local data becomes inaccessible.

**Why it happens:** Dexie migrations run on `db.open()`. If a migration throws, the database doesn't open. Unlike server-side migrations (which can be tested in staging), Dexie migrations run on each user's actual device with their actual data — there's no staging environment for client-side storage.

**Consequences:**
- App fails to start on devices with existing data.
- Users lose all local data and must start fresh (or need a complex recovery).
- The sync queue (with unsent changes) is also lost.

**Warning signs:**
- White screen / crash on app open (Dexie.open() throws)
- Works on fresh installs but not on existing devices
- No migration test suite

**Prevention:**
- **Always test migrations against populated databases:** Before any release, create a Dexie database with the OLD schema, populate it with test data, then run the upgraded code and verify data integrity.
- **New fields must have defaults:** `db.version(2).stores({...}).upgrade(tx => { ... })` — never add a column that requires a non-null value without providing a default in the upgrade function.
- **Keep old version declarations:** Dexie requires ALL previous `db.version(N)` calls to remain in code (even if bumped to N+5). Never delete old version declarations.
- **Backup before migrate:** Before running a risky migration, export critical tables to a temporary backup table, migrate, then delete backup if successful.

**Phase assignment:** Any phase that modifies the Dexie schema. Must be a standard part of the development process, not an afterthought.

---

## Moderate Pitfalls

Mistakes that degrade quality or cause significant debugging time.

---

### Pitfall 12: PNAE Regulatory Changes Invalidating Hardcoded Rules

**What goes wrong:** PNAE rules change frequently. Resolução CD/FNDE nº 4/2026 replaced previous resolutions. The per-member annual sale limit (currently R$ 40.000,00 per DAP/CAF), product price tables, priority criteria, and required document formats all change with new resolutions. Hardcoding these values means the app becomes wrong after the next regulation update, but won't look wrong — it'll silently use outdated limits and generate non-compliant documents.

**Why it happens:** Government regulations feel static — they change, at most, annually. But annual changes accumulate, and a hardcoded R$ 40.000 limit from 2026 will be wrong in 2027.

**Consequences:**
- Generated projeto de venda exceeds new per-member limits → rejected by municipality.
- Association submits proposal using old format → disqualified.
- App becomes "that tool that gave us wrong numbers" — trust destroyed.

**Prevention:**
- **Store PNAE configuration as data, not code:** Create a `pnae_config` table with: `valor_limite_anual_por_dap`, `ano_referencia`, `resolucao_referencia`. Admin can update these values when new rules come out.
- **Display the reference regulation:** Always show "Conforme Resolução CD/FNDE nº 4/2026" next to calculated values so the user knows which rules are being applied and can spot if they're outdated.
- **Produce warnings, not hard blocks:** If a calculation exceeds a limit, warn the user but don't prevent the action — the user may know about a new resolution the app doesn't yet reflect.

**Phase assignment:** PNAE features phase.

---

### Pitfall 13: Phone Number as Primary Contact Channel — Fragility

**What goes wrong:** The `associado.contato` field stores a phone number. In rural Brazil, phone numbers change frequently (prepaid SIM cards, shared phones, lost phones). If the system treats phone number as a reliable contact identifier, members become unreachable and may appear as duplicates when they re-register with a new number.

**Why it happens:** Phone number is the most obvious and available contact for rural populations. But availability ≠ stability.

**Consequences:**
- Members appear as duplicates when their number changes.
- Contact lists become useless over time.
- Association can't reach members for meetings or PNAE deliveries.

**Prevention:**
- **CPF as the unique member identifier** (not phone number). CPF doesn't change.
- **Allow multiple contacts:** `contato` could be an array or secondary table, tracking historical numbers.
- **Don't use phone for auth:** Google OAuth avoids this, which is correct. But if SMS verification is ever considered — don't.
- **Periodic contact validation:** Admin dashboard shows "20 membros sem contato atualizado há 6+ meses."

**Phase assignment:** Associado CRUD phase (schema design for contato).

---

### Pitfall 14: Portuguese Text Handling — Diacritics in Search/Sort

**What goes wrong:** Member names, crop names, and descriptions contain Portuguese diacritics (ã, ç, é, ô, ú). If search uses exact matching, a user searching "Joao" won't find "João". If sorting uses raw Unicode comparison, "Ática" sorts after "Zamora" because `À` (U+00C0) > `Z` (U+005A) in Unicode.

**Why it happens:** Default string comparison in both IndexedDB and PostgreSQL is binary/locale-unaware unless explicitly configured.

**Consequences:**
- Users can't find members by name (most common operation).
- Lists sort incorrectly — confusing for low-literacy users who rely on name recognition.
- Crop names don't match between production records and PNAE edital requirements.

**Prevention:**
- **IndexedDB/Dexie side:** Normalize search strings: strip diacritics for a `nome_busca` indexed field (e.g., `João da Silva` → `joao da silva`). Search against this field, display the original.
- **PostgreSQL side:** Use `COLLATE "pt_BR"` or `citext` extension for text comparisons. ICU collation is available in Neon PostgreSQL.
- **Crop name normalization:** Maintain a canonical list of crop names (tomate, alface, mandioca). When a user types "Mandioca", normalize to lowercase for matching against edital products.

**Phase assignment:** Associado CRUD phase (search implementation) + PNAE phase (product matching).

---

### Pitfall 15: Background Sync Draining Battery and Mobile Data

**What goes wrong:** The sync engine polls on a timer or aggressively retries after failure. On rural 3G connections, each failed attempt still consumes data plan. Constant network activity drains battery. Users notice their phone battery dies faster and their data plan runs out sooner — they uninstall the app.

**Why it happens:** Sync interval tuned for WiFi/broadband. No awareness of connection cost (metered vs. unmetered).

**Consequences:**
- Users blame the app for "eating my data plan" (prepaid plans in rural Brazil are 1-5GB/month).
- Battery drain makes the app impractical on older phones.
- Negative word-of-mouth in the community kills adoption.

**Warning signs:**
- Sync logs show repeated failed attempts at short intervals
- Users complain about data usage or battery

**Prevention:**
- **Respect `navigator.connection.saveData`:** If the user has data saver enabled, sync only on explicit user action.
- **Debounce sync:** Sync at most every 5 minutes when online, not on every write.
- **WiFi-preferring mode:** Offer a setting "Sincronizar apenas no Wi-Fi" (sync only on WiFi). Default ON for farmer profile.
- **Minimal payloads:** Don't sync unchanged records. Send only dirty fields + version, not the full record.
- **Background Sync API as fallback:** Use service worker Background Sync — the browser manages retry timing based on OS battery and network heuristics, which is smarter than custom retry logic.

**Phase assignment:** Sync engine phase.

---

### Pitfall 16: Single-Device Assumption Breaking Multi-Admin Workflows

**What goes wrong:** Small associations often have 2-3 admins who share management duties. If the app implicitly assumes one device per user (e.g., device_id used for sync deduplication is treated as user identity), then when two admins use different phones, they see each other's changes as "conflicts" instead of collaborative edits. Worse, if one admin re-installs the app (new device_id), the system treats them as a new device and re-syncs everything.

**Why it happens:** `device_id` in the schema conflates "which physical device generated this change" with "who is this user." These are different concepts.

**Consequences:**
- Every sync pull triggers false conflicts.
- Re-installing the app causes a full re-sync storm.
- Admins can't tell who made which change.

**Prevention:**
- **Separate `device_id` from `user_id`:** `device_id` is a UUID generated per app installation (stored in IndexedDB). `user_id` comes from auth (Google OAuth sub). The sync pull filter should exclude by `device_id` (don't re-download my own changes from this device) but NOT by `user_id` (I want to see my changes from my other device).
- **Store device_id in IndexedDB metadata table**, not in Zustand (which resets on page reload).
- **Device registration endpoint:** POST /api/devices to register a device_id → user_id mapping. Useful for "which devices does this user have" admin view.

**Phase assignment:** Auth + Sync phases.

---

### Pitfall 17: Testing Only on Fast Devices — Performance Cliff on Target Hardware

**What goes wrong:** Developers use modern phones/laptops. The target users (rural farmers) use phones costing R$ 500-800: Motorola Moto E series, Samsung Galaxy A03, Xiaomi Redmi 9A — devices with 2-3GB RAM, eMMC storage (slow I/O), and MediaTek/Snapdragon 4xx processors. React 19 with Dexie reads, Recharts rendering, and aggressive re-renders will lag noticeably on these devices.

**Why it happens:** "Works on my machine" — the universal developer blind spot, amplified by the socioeconomic gap between dev team and end users.

**Consequences:**
- App takes 5+ seconds to render a list of 50 members.
- Form interactions feel sluggish — farmers give up mid-entry.
- Dashboard with Recharts renders a blank screen for 3 seconds before charts appear.

**Warning signs:**
- No performance budget defined
- No testing on low-end hardware
- `useLiveQuery()` used inside components that render large lists without virtualization

**Prevention:**
- **Performance budget:** First Contentful Paint < 2s, Time to Interactive < 4s on a Moto E (test with Chrome DevTools throttling: 4x CPU slowdown + Slow 3G).
- **Virtualize lists:** Use `react-window` or `@tanstack/react-virtual` for any list that might exceed 20 items (members, transactions).
- **Lazy load Recharts:** Dashboard charts should use `React.lazy()` + Suspense — don't include chart library in main bundle.
- **Dexie query limits:** Always use `.limit()` on Dexie queries. Never load all records into memory.
- **Test on real hardware:** Buy a Moto E (R$ 600) for the team. Or use BrowserStack's real device cloud.

**Phase assignment:** Every UI phase. Performance should be validated at each phase, not as a final optimization pass.

---

## Minor Pitfalls

Mistakes that cause friction or accumulate as debt.

---

### Pitfall 18: Date/Time Handling Across Timezones

**What goes wrong:** Brazil has 4 time zones. The Drizzle schema uses `timestamp with time zone` (correct) but the Dexie client stores dates as ISO strings (`updated_at: string`). If the client generates timestamps using `new Date().toISOString()` (UTC), but the server's `$onUpdate(() => new Date())` uses the server's timezone, and a user in Acre (UTC-5) creates a record that another user in Brasília (UTC-3) edits, the version comparison based on `updated_at` may produce incorrect ordering.

**Prevention:**
- **All timestamps in UTC, everywhere.** Client generates UTC, server stores UTC, display converts to local time.
- **Use `updated_at` only for display and sync filtering, not for conflict resolution.** Use the integer `version` field for conflict detection — it's unambiguous.
- **Avoid `Date.now()` for business dates** (e.g., `data_pagamento`, `data` on ata). Use explicit date-only strings (`YYYY-MM-DD`) for business dates, reserving timestamps for technical metadata.

**Phase assignment:** Sync phase (timestamp handling conventions).

---

### Pitfall 19: Lost Edits During Re-sync After Long Offline Period

**What goes wrong:** User A goes offline for 10 days. During that time, User B deletes and recreates a member record (different UUID). When User A syncs, they receive the deletion + new creation. But User A had edited the OLD record offline — their sync_queue has an update for a UUID that no longer exists on the server. The server returns an error or silently drops it.

**Prevention:**
- **Soft deletes everywhere** (the `deleted_at` pattern is already designed — enforce it). Never hard-delete records.
- **Sync push handler:** If a record_id doesn't exist on the server AND the operation is "update" (not "create"), respond with a specific error code. Client writes this to conflict_log for manual resolution.
- **De-duplication logic:** Admin should be able to merge two records (old + recreated) by transferring related data (mensalidades, produção).

**Phase assignment:** Sync phase (edge case handling).

---

### Pitfall 20: Ignoring the Install Experience — PWA Without Guidance

**What goes wrong:** PWAs can be "installed" to the home screen, but the install prompt is subtle and varies by browser. Rural users who've never installed a PWA won't know what to do. They'll use the app in a browser tab, accidentally close it, and think their data is gone. Or they'll bookmark it but the bookmark loads without service worker, so offline doesn't work.

**Prevention:**
- **Custom install banner:** Show a visible, persistent (but dismissible) banner in Portuguese: "Instale o Espoa no seu celular para usar sem internet" with step-by-step instructions and screenshots.
- **Detect install state:** Use `window.matchMedia('(display-mode: standalone)')` to detect if running as installed PWA. If not, show the install prompt.
- **First-run tutorial:** 3-screen onboarding: (1) "Este app funciona sem internet" (2) "Seus dados são sincronizados quando há sinal" (3) "Instale para melhor experiência".
- **Support link:** Include "Como instalar" in the app menu — always accessible, not just on first visit.

**Phase assignment:** PWA setup phase + onboarding UX phase.

---

### Pitfall 21: PNAE Document Format Obsolescence

**What goes wrong:** The "Projeto de Venda" (sales project) document that associations submit for PNAE chamadas públicas has a format defined by FNDE. The format changes with new resolutions. If the app generates documents in a hardcoded format, they'll be rejected when the format changes.

**Prevention:**
- **Template-based generation:** Store document templates as data (in a `pnae_templates` table or as JSON config), not as hardcoded rendering logic. When the format changes, update the template — not the code.
- **Preview with disclaimer:** Show "Modelo conforme Resolução nº X/202Y — verifique com sua entidade executora se o formato está atualizado."
- **Don't auto-submit:** The app prepares the document; the human reviews and submits. This catches format issues before they reach the municipality.

**Phase assignment:** PNAE features phase (document generation).

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Severity | Mitigation |
|-------------|---------------|----------|------------|
| Schema migration | Floating-point currency (Pitfall 1) | CRITICAL | Fix `real` → `numeric`/integer before any financial data entry |
| Schema migration | relatorio_pnae sync fields (Pitfall 3) | CRITICAL | Add 4 sync fields + restructure to proper columns |
| Schema migration | Dexie version migration (Pitfall 11) | HIGH | Test migrations against populated databases before deploy |
| Shared validation / types | Schema drift (Pitfall 2) | CRITICAL | drizzle-zod as single source, field name mapping layer |
| Auth implementation | Offline token expiry lockout (Pitfall 6) | CRITICAL | Separate local access from sync auth |
| Auth implementation | Device vs user identity (Pitfall 16) | MODERATE | Explicit device_id / user_id separation |
| Sync engine | Queue growth / idempotency (Pitfall 4) | CRITICAL | Batch limits, queue compaction, idempotent server |
| Sync engine | navigator.onLine unreliability (Pitfall 7) | HIGH | Heartbeat verification endpoint |
| Sync engine | Conflict resolution UX (Pitfall 8) | HIGH | Domain-aware merge rules + simple admin UI |
| Sync engine | Battery/data drain (Pitfall 15) | MODERATE | WiFi-preferring mode, sync debounce |
| Sync engine | Timezone handling (Pitfall 18) | MINOR | All-UTC convention, version-based conflicts |
| Sync engine | Lost edits on re-sync (Pitfall 19) | MINOR | Soft deletes enforced, orphan update handling |
| PWA setup | Storage limits / eviction (Pitfall 5) | CRITICAL | `navigator.storage.persist()`, storage monitoring |
| PWA setup | Stale service worker cache (Pitfall 9) | HIGH | Prompt-based updates, version header checking |
| PWA setup | Install experience (Pitfall 20) | MINOR | Custom install banner with Portuguese guidance |
| Associado CRUD | Portuguese diacritics (Pitfall 14) | MODERATE | Normalized search field, pt_BR collation |
| Associado CRUD | Phone number fragility (Pitfall 13) | MODERATE | CPF as primary identifier, allow multiple contacts |
| PNAE features | Hardcoded regulatory values (Pitfall 12) | MODERATE | Config table for limits, display reference resolution |
| PNAE features | Document format changes (Pitfall 21) | MINOR | Template-based generation, preview with disclaimer |
| LGPD/Data protection | CPF exposure (Pitfall 10) | HIGH | Server-only storage, masked display, consent flow |
| All UI phases | Performance on low-end devices (Pitfall 17) | HIGH | Performance budget, list virtualization, lazy loading |

---

## Sources

- Codebase analysis: `apps/web/src/database/db.ts`, `apps/web/src/database/types.ts`, `packages/database/src/schema/*.ts`
- Known technical debt: `.planning/codebase/CONCERNS.md`
- Feature requirements: `.planning/research/FEATURES.md`
- Architecture: `.planning/research/ARCHITECTURE.md`
- Stack decisions: `.planning/research/STACK.md`
- LGPD: Lei 13.709/2018 (Lei Geral de Proteção de Dados Pessoais)
- PNAE: Lei 11.947/2009, Resolução CD/FNDE nº 4/2026
- Dexie migration behavior: dexie.org documentation
- IndexedDB storage limits: web.dev/storage-for-the-web
- PWA install experience: web.dev/learn/pwa/installation
- Brazilian mobile market: low-end Android dominance in rural areas (Anatel/IBGE data)
