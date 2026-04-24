// Drop all tables and reapply all migrations from scratch
require("dotenv").config({ path: "../../.env" });
const { neon } = require("@neondatabase/serverless");
const fs = require("node:fs");
const path = require("node:path");

const sql = neon(process.env.DATABASE_URL);

async function execSQL(stmt) {
  if (!stmt?.trim()) return;
  return sql.query(stmt, []);
}

async function main() {
  // Drop all tables in public schema (including our tracking table)
  const tables = await sql`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  `;
  
  if (tables.length > 0) {
    const names = tables.map((t) => `"${t.tablename}"`).join(", ");
    console.log("Dropping tables:", names);
    await execSQL(`DROP TABLE IF EXISTS ${names} CASCADE`);
    console.log("All tables dropped.\n");
  }

  // Recreate migration tracking table
  await execSQL(`
    CREATE TABLE drizzle_migrations (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Apply all migrations in order
  const drizzleDir = path.join(__dirname, "../drizzle");
  const files = fs
    .readdirSync(drizzleDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const content = fs.readFileSync(path.join(drizzleDir, file), "utf-8");
    const statements = content
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean);

    console.log(`[apply] ${file} (${statements.length} statements)`);
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      try {
        await execSQL(stmt);
        console.log(`  [${i + 1}/${statements.length}] OK`);
      } catch (e) {
        // Skip "already exists" errors — migration is idempotent
        const msg = e.message || "";
        if (
          msg.includes("already exists") ||
          msg.includes("duplicate key") ||
          msg.includes("does not exist") && msg.includes("constraint")
        ) {
          console.log(`  [${i + 1}/${statements.length}] skip (${msg.split("\n")[0].substring(0, 80)})`);
        } else {
          console.error(`  [${i + 1}/${statements.length}] ERRO:`, msg);
          console.error("  SQL:", stmt.substring(0, 120));
          throw e;
        }
      }
    }

    await sql`INSERT INTO drizzle_migrations (name) VALUES (${file})`;
    console.log(`[done] ${file}\n`);
  }
  
  console.log("Banco recriado com sucesso!");
}

main().catch((e) => {
  console.error("Falha fatal:", e.message);
  process.exit(1);
});
