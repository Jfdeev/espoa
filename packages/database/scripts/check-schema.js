require("dotenv").config({ path: "../../.env" });
const { neon } = require("@neondatabase/serverless");
const sql = neon(process.env.DATABASE_URL);

async function main() {
  const cols = await sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'usuario' 
    ORDER BY ordinal_position
  `;
  console.log("Colunas em 'usuario':");
  cols.forEach((r) => console.log(" -", r.column_name, ":", r.data_type));

  try {
    const rows = await sql`SELECT id, email FROM usuario LIMIT 3`;
    console.log("\nDados:", rows);
  } catch (e) {
    console.error("Erro no select:", e.message);
  }
}

main().catch(console.error);
