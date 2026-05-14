// scripts/run-migrate.js
// Roda migrations pendentes lendo o _journal.json (ignora arquivos órfãos)
// Carrega o .env da API (fonte de verdade do DATABASE_URL)
require("dotenv").config({ path: "../../apps/api/.env" });
// Fallback para o .env raiz caso o da API não exista
require("dotenv").config({ path: "../../.env" });

const { neon } = require("@neondatabase/serverless");
const fs = require("node:fs");
const path = require("node:path");

const sql = neon(process.env.DATABASE_URL);

async function main() {
  await sql`CREATE TABLE IF NOT EXISTS drizzle_migrations (id SERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE, applied_at TIMESTAMPTZ DEFAULT NOW())`;

  const drizzleDir = path.join(__dirname, "../drizzle");

  // Lê o journal oficial do Drizzle para saber quais migrations existem e em que ordem
  const journal = JSON.parse(fs.readFileSync(path.join(drizzleDir, "meta/_journal.json"), "utf-8"));
  const files = journal.entries.map((e) => `${e.tag}.sql`);

  for (const file of files) {
    const rows = await sql`SELECT 1 FROM drizzle_migrations WHERE name = ${file}`;
    if (rows.length > 0) {
      console.log("[skip]", file);
      continue;
    }

    const content = fs.readFileSync(path.join(drizzleDir, file), "utf-8");
    const statements = content
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean);

    console.log("[apply]", file, "(" + statements.length + " statements)");
    for (const stmt of statements) {
      await sql.unsafe(stmt);
    }

    await sql`INSERT INTO drizzle_migrations (name) VALUES (${file})`;
    console.log("[done]", file);
  }
  console.log("Migrações concluídas!");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
