require("dotenv").config({ path: ".env.local" });
require("dotenv").config({ path: "../../.env" });
const { neon } = require("@neondatabase/serverless");

const sql = neon(process.env.DATABASE_URL);

async function execSQL(stmt, label) {
  if (!stmt?.trim()) return;
  try {
    await sql.query(stmt, []);
    console.log(`  ✓ ${label}`);
  } catch (e) {
    const msg = e.message || "";
    if (msg.includes("already exists") || msg.includes("duplicate column")) {
      console.log(`  ~ ${label} (already exists, skip)`);
    } else {
      console.error(`  ✗ ${label}: ${msg}`);
      process.exit(1);
    }
  }
}

async function main() {
  console.log("Applying migration 0015: add area_plantada table...\n");

  await execSQL(
    `CREATE TABLE IF NOT EXISTS "area_plantada" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "associado_id" uuid NOT NULL,
      "cultura" varchar(255) NOT NULL,
      "area_ha" real NOT NULL,
      "data_referencia" date NOT NULL,
      "observacao" text,
      "version" integer DEFAULT 1 NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
      "device_id" varchar(255),
      "deleted_at" timestamp with time zone
    )`,
    "CREATE TABLE area_plantada",
  );

  await execSQL(
    `ALTER TABLE "area_plantada"
      ADD CONSTRAINT "area_plantada_associado_id_associado_id_fk"
      FOREIGN KEY ("associado_id") REFERENCES "public"."associado"("id")
      ON DELETE no action ON UPDATE no action`,
    "FK area_plantada.associado_id → associado.id",
  );

  console.log("\nMigration 0015 done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
