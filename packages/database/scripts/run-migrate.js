// scripts/run-migrate.js
// Roda todas as migrações SQL pendentes via Neon HTTP driver
require("dotenv").config({ path: "../../.env" });

const { neon } = require("@neondatabase/serverless");
const fs = require("node:fs");
const path = require("node:path");

const sql = neon(process.env.DATABASE_URL);

async function main() {
  await sql`CREATE TABLE IF NOT EXISTS drizzle_migrations (id SERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE, applied_at TIMESTAMPTZ DEFAULT NOW())`;

  const drizzleDir = path.join(__dirname, "../drizzle");
  const files = fs
    .readdirSync(drizzleDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

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
