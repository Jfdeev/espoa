# Codebase Conventions

**Mapped:** 2026-04-18

## Code Style

### TypeScript Configuration

| Setting | `apps/web` | `apps/api` | `packages/database` |
|---------|-----------|-----------|---------------------|
| target | (via tsconfig.app.json) | ES2020 | ES2020 |
| module | (via tsconfig.app.json) | CommonJS | ESNext |
| moduleResolution | (via tsconfig.app.json) | default | bundler |
| strict | (via tsconfig.app.json) | true | true |

- Web app uses split tsconfig: `tsconfig.app.json` + `tsconfig.node.json` referenced from `tsconfig.json`
- Database package uses `bundler` module resolution with declaration maps

### ESLint

Only `apps/web` has ESLint configured:
- Flat config format (`eslint.config.js`)
- `@eslint/js` recommended
- `typescript-eslint` recommended
- `eslint-plugin-react-hooks` flat recommended
- `eslint-plugin-react-refresh` vite preset
- Target: `**/*.{ts,tsx}` files, ignores `dist/`

**No ESLint in `apps/api` or `packages/database`.**

### Formatting

- No Prettier or formatting tool configured
- No `.editorconfig`

## Patterns

### Module Exports

**Barrel export pattern:** Each module uses `index.ts` for re-exports.

```typescript
// packages/database/src/index.ts
export { db } from "./connection";
export * from "./schema";

// packages/database/src/schema/index.ts
export { associado } from "./associado";
export { mensalidade } from "./mensalidade";
// ...etc
```

```typescript
// apps/web/src/database/index.ts
export { db } from "./db";
export type { Associado, Mensalidade, ... } from "./types";
```

### Schema Definition

**Drizzle pattern (server-side):**
```typescript
export const tableName = pgTable("table_name", {
  id: uuid("id").defaultRandom().primaryKey(),
  // ... typed columns
  version: integer("version").notNull().default(1),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  deviceId: varchar("device_id", { length: 255 }),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});
```

Every entity table includes these sync-ready fields: `version`, `updatedAt`, `deviceId`, `deletedAt`.

**Dexie pattern (client-side):**
```typescript
db.version(1).stores({
  tableName: "id, indexed_field1, indexed_field2, deleted_at",
});
```

### Type Definitions

Client-side interfaces use snake_case field names (matching SQL columns directly):
```typescript
export interface Associado {
  id?: string;
  nome: string;
  data_entrada: string;  // snake_case
  // ...
}
```

Server-side Drizzle schemas use camelCase:
```typescript
dataEntrada: date("data_entrada").notNull(),  // camelCase TS, snake_case SQL
```

### Error Handling

- **None observed.** No try/catch blocks, no error boundaries, no error handling middleware in Express.
- Non-null assertion (`!`) used for `process.env.DATABASE_URL` without validation.

### Environment Variables

- Single env var: `DATABASE_URL`
- Loaded via `dotenv` in database package
- `.env` file expected at project root (drizzle.config reads `../../.env`)
- `.env.example` provided with empty `DATABASE_URL=`

## Observed Anti-Patterns

1. **No input validation:** API has no validation middleware
2. **Unsafe env access:** `process.env.DATABASE_URL!` assumes existence without checking
3. **Schema drift risk:** Client-side Dexie types and server-side Drizzle schemas are manually kept in sync — no shared source of truth
