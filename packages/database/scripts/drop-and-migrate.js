// Drop all tables and reapply all migrations from scratch.
// Migration order is taken from _journal.json — NOT from filename sort,
// which is unreliable when filenames have varying prefix lengths (e.g. "00010_").
require("dotenv").config({ path: "../../.env" });
const { neon } = require("@neondatabase/serverless");
const fs = require("node:fs");
const path = require("node:path");

const sql = neon(process.env.DATABASE_URL);

async function execSQL(stmt) {
  if (!stmt?.trim()) return;
  return sql.query(stmt, []);
}

/**
 * Locate the SQL file for a given journal tag.
 *
 * Drizzle expects `{tag}.sql` but filenames sometimes diverge
 * (e.g. tag "0008_chief_scorpion" → actual file "00010_chief_scorpion.sql").
 * We try an exact match first, then fall back to matching the descriptive
 * suffix after the numeric prefix.
 */
function findMigrationFile(drizzleDir, tag) {
  const exact = path.join(drizzleDir, `${tag}.sql`);
  if (fs.existsSync(exact)) return exact;

  // e.g. "0008_chief_scorpion" → "chief_scorpion"
  const description = tag.replace(/^\d+_/, "");
  const allFiles = fs.readdirSync(drizzleDir).filter((f) => f.endsWith(".sql"));
  const match = allFiles.find((f) => f.endsWith(`_${description}.sql`));
  return match ? path.join(drizzleDir, match) : null;
}

async function main() {
  // Drop every table in public schema (cascade to handle FK order)
  const tables = await sql`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  `;

  if (tables.length > 0) {
    const names = tables.map((t) => `"${t.tablename}"`).join(", ");
    console.log("Dropping tables:", names);
    await execSQL(`DROP TABLE IF EXISTS ${names} CASCADE`);
    console.log("All tables dropped.\n");
  }

  // Recreate our own migration-tracking table
  await execSQL(`
    CREATE TABLE drizzle_migrations (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Read ordered migration list from the Drizzle journal
  const journalPath = path.join(__dirname, "../drizzle/meta/_journal.json");
  const journal = JSON.parse(fs.readFileSync(journalPath, "utf-8"));
  const entries = [...journal.entries].sort((a, b) => a.idx - b.idx);

  const drizzleDir = path.join(__dirname, "../drizzle");

  for (const entry of entries) {
    const filePath = findMigrationFile(drizzleDir, entry.tag);

    if (!filePath) {
      console.warn(
        `[skip] No SQL file found for journal tag "${entry.tag}" (idx ${entry.idx}) — skipping`,
      );
      continue;
    }

    const file = path.basename(filePath);
    const content = fs.readFileSync(filePath, "utf-8");
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
        const msg = e?.message || String(e);
        const isSkippable =
          msg.includes("already exists") ||
          msg.includes("duplicate key") ||
          (msg.includes("does not exist") && msg.includes("constraint"));

        if (isSkippable) {
          console.log(
            `  [${i + 1}/${statements.length}] skip (${msg.split("\n")[0].substring(0, 80)})`,
          );
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
