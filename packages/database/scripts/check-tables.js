require("dotenv").config({ path: "../../.env" });
const { neon } = require("@neondatabase/serverless");
const sql = neon(process.env.DATABASE_URL);

async function main() {
  const tables = await sql`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
  `;
  console.log("Tabelas no banco:");
  tables.forEach((t) => console.log(" -", t.tablename));

  try {
    const migs = await sql`SELECT name FROM drizzle_migrations ORDER BY name`;
    console.log("\nMigrações registradas:");
    migs.forEach((m) => console.log(" -", m.name));
  } catch (e) {
    console.log("\nTabela drizzle_migrations não existe:", e.message);
  }
}

main().catch(console.error);
