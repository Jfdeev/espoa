require("dotenv").config({ path: "../../.env" });
const { neon } = require("@neondatabase/serverless");

const sql = neon(process.env.DATABASE_URL);

async function main() {
  console.log("Adding cpf column to usuario table...");
  try {
    await sql.query('ALTER TABLE "usuario" ADD COLUMN IF NOT EXISTS "cpf" varchar(14)', []);
    console.log("  ✓ cpf column added successfully");
  } catch (e) {
    console.error("  ✗ Error:", e.message);
    process.exit(1);
  }
}

main();
