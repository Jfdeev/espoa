require("dotenv").config({ path: "../../.env" });
const { neon } = require("@neondatabase/serverless");
const sql = neon(process.env.DATABASE_URL);

async function main() {
  const rows = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'associacao' ORDER BY ordinal_position`;
  console.log("Columns in associacao:", rows.map(r => r.column_name));
  
  const migrations = await sql`SELECT name FROM drizzle_migrations ORDER BY id`;
  console.log("Applied migrations:", migrations.map(r => r.name));
}

main().catch(console.error);
