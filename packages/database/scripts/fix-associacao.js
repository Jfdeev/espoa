require("dotenv").config({ path: "../../.env" });
const { neon } = require("@neondatabase/serverless");

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL not set");

const sql = neon(DATABASE_URL);

async function main() {
  console.log("DB URL prefix:", DATABASE_URL.substring(0, 40) + "...");

  // Must use tagged template — neon v1.1 doesn't support sql(string) or sql.unsafe()
  try {
    await sql`ALTER TABLE "associacao" ADD COLUMN IF NOT EXISTS "endereco" varchar(500)`;
    console.log("[OK] endereco");
  } catch(e) { console.error("[FAIL] endereco:", e.message); }

  try {
    await sql`ALTER TABLE "associacao" ADD COLUMN IF NOT EXISTS "status" varchar(50) DEFAULT 'ativa' NOT NULL`;
    console.log("[OK] status");
  } catch(e) { console.error("[FAIL] status:", e.message); }

  try {
    await sql`ALTER TABLE "associacao" ADD COLUMN IF NOT EXISTS "version" integer DEFAULT 1 NOT NULL`;
    console.log("[OK] version");
  } catch(e) { console.error("[FAIL] version:", e.message); }

  try {
    await sql`ALTER TABLE "associacao" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL`;
    console.log("[OK] updated_at");
  } catch(e) { console.error("[FAIL] updated_at:", e.message); }

  try {
    await sql`ALTER TABLE "associacao" ADD COLUMN IF NOT EXISTS "device_id" varchar(255)`;
    console.log("[OK] device_id");
  } catch(e) { console.error("[FAIL] device_id:", e.message); }

  try {
    await sql`ALTER TABLE "associacao" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone`;
    console.log("[OK] deleted_at");
  } catch(e) { console.error("[FAIL] deleted_at:", e.message); }

  // Verify
  const rows = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'associacao' ORDER BY ordinal_position`;
  console.log("\nColumns now:", rows.map(r => r.column_name));
}

main().catch(console.error);
