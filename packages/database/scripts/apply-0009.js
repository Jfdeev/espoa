require("dotenv").config({ path: "../../.env" });
const { neon } = require("@neondatabase/serverless");
const sql = neon(process.env.DATABASE_URL);

async function run() {
  await sql.query('ALTER TABLE "mensalidade" ALTER COLUMN "associado_id" DROP NOT NULL', []);
  console.log("mensalidade.associado_id is now nullable ✓");

  await sql.query(
    'ALTER TABLE "mensalidade" ADD COLUMN IF NOT EXISTS "usuario_id" uuid REFERENCES "usuario"("id")',
    [],
  );
  console.log("mensalidade.usuario_id added ✓");

  process.exit(0);
}

run().catch((e) => {
  console.error("Migration failed:", e.message);
  process.exit(1);
});
