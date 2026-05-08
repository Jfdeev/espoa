require("dotenv").config({ path: "../../.env" });
const { neon } = require("@neondatabase/serverless");
const sql = neon(process.env.DATABASE_URL);

async function run() {
  await sql.query(
    'ALTER TABLE "usuario" ADD COLUMN IF NOT EXISTS "cpf" varchar(14)',
    [],
  );
  console.log("usuario.cpf added ✓");

  process.exit(0);
}

run().catch((e) => {
  console.error("Migration failed:", e.message);
  process.exit(1);
});
