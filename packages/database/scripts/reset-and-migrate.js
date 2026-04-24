// Reset falsos registros de migração e reaplicar corretamente
require("dotenv").config({ path: "../../.env" });
const { neon } = require("@neondatabase/serverless");
const fs = require("fs");
const path = require("path");

const sql = neon(process.env.DATABASE_URL);

// Chamar neon com sql.query() executa SQL raw sem template literals
async function execSQL(stmt) {
  if (!stmt || !stmt.trim()) return;
  return sql.query(stmt, []);
}

async function main() {
  // Limpar registros falsos
  await sql`DELETE FROM drizzle_migrations`;
  console.log("Registros de migration limpos.");

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

    console.log(`\n[apply] ${file} (${statements.length} statements)`);
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      try {
        await execSQL(stmt);
        console.log(`  [${i + 1}/${statements.length}] OK`);
      } catch (e) {
        // Ignorar erros de "already exists" para idempotência
        if (e.message && (e.message.includes("already exists") || e.message.includes("duplicate"))) {
          console.log(`  [${i + 1}/${statements.length}] already exists — skip`);
        } else {
          console.error(`  [${i + 1}/${statements.length}] ERRO:`, e.message);
          console.error("  SQL:", stmt.substring(0, 120));
          throw e;
        }
      }
    }

    await sql`INSERT INTO drizzle_migrations (name) VALUES (${file})`;
    console.log(`[done] ${file}`);
  }
  console.log("\nMigrações concluídas!");
}

main().catch((e) => {
  console.error("Falha fatal:", e.message);
  process.exit(1);
});
