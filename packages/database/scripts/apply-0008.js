require("dotenv").config({ path: "../../.env" });
const { neon } = require("@neondatabase/serverless");
const sql = neon(process.env.DATABASE_URL);

sql.query('ALTER TABLE "associado" ADD COLUMN IF NOT EXISTS "usuario_id" uuid REFERENCES "usuario"("id")', [])
  .then(() => {
    console.log("Migration 0008: usuario_id added to associado ✓");
    process.exit(0);
  })
  .catch((e) => {
    if (e.message && (e.message.includes("already exists") || e.message.includes("duplicate"))) {
      console.log("Column already exists, skip ✓");
      process.exit(0);
    }
    console.error("Migration failed:", e.message);
    process.exit(1);
  });
