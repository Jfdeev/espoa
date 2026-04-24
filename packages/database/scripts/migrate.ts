/**
 * Script de migração que usa o Neon HTTP driver diretamente.
 * Roda cada arquivo SQL pendente na ordem do journal.
 * Uso: npx ts-node scripts/migrate.ts
 */
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

config({ path: "../../.env" });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL não definido no .env");

const sql = neon(DATABASE_URL);

async function main() {
  // Garantir tabela de controle de migrações
  await sql`
    CREATE TABLE IF NOT EXISTS drizzle_migrations (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  const drizzleDir = join(__dirname, "../drizzle");
  const files = readdirSync(drizzleDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const { rows } = await sql`SELECT 1 FROM drizzle_migrations WHERE name = ${file}`;
    if (rows.length > 0) {
      console.log(`[skip] ${file} já aplicado`);
      continue;
    }

    const content = readFileSync(join(drizzleDir, file), "utf-8");
    // Drizzle separa statements com --> statement-breakpoint
    const statements = content
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean);

    console.log(`[apply] ${file} (${statements.length} statements)`);
    for (const stmt of statements) {
      await sql.unsafe(stmt);
    }

    await sql`INSERT INTO drizzle_migrations (name) VALUES (${file})`;
    console.log(`[done] ${file}`);
  }

  console.log("Migrações concluídas!");
}

main().catch((err) => {
  console.error("Erro na migração:", err);
  process.exit(1);
});
