// Apply pending migrations (0006, 0007) without dropping existing tables
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
      throw e;
    }
  }
}

async function main() {
  console.log("Applying pending migrations...\n");

  // 0006 — add sync fields to usuario_associacao
  console.log("[0006] usuario_associacao sync fields:");
  await execSQL(
    `ALTER TABLE "usuario_associacao" ADD COLUMN IF NOT EXISTS "version" integer DEFAULT 1 NOT NULL`,
    "version"
  );
  await execSQL(
    `ALTER TABLE "usuario_associacao" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL`,
    "updated_at"
  );
  await execSQL(
    `ALTER TABLE "usuario_associacao" ADD COLUMN IF NOT EXISTS "device_id" varchar(255)`,
    "device_id"
  );

  // 0007 — create conflict_log
  console.log("\n[0007] conflict_log table:");
  await execSQL(
    `CREATE TABLE IF NOT EXISTS "conflict_log" (
      "id" serial PRIMARY KEY NOT NULL,
      "device_id" varchar(255) NOT NULL,
      "operation_id" varchar(255) NOT NULL,
      "table_name" varchar(100) NOT NULL,
      "record_id" varchar(255) NOT NULL,
      "local_data" jsonb,
      "remote_data" jsonb,
      "reason" text,
      "resolved" boolean DEFAULT false NOT NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL
    )`,
    "conflict_log"
  );

  console.log("\nMigrations applied successfully!");
}

main().catch((e) => {
  console.error("Fatal:", e.message);
  process.exit(1);
});
