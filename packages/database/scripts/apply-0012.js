require("dotenv").config({ path: ".env.local" });
require("dotenv").config({ path: "../../.env" });
const { neon } = require("@neondatabase/serverless");

const sql = neon(process.env.DATABASE_URL);

async function main() {
  console.log("Applying migration 0012: add ata association fields...\n");

  const statements = [
    ['ALTER TABLE "ata" ADD COLUMN IF NOT EXISTS "associacao_id" uuid REFERENCES "associacao"("id") ON DELETE CASCADE', "ata.associacao_id"],
    ['ALTER TABLE "ata" ADD COLUMN IF NOT EXISTS "participantes" text', "ata.participantes"],
    ['ALTER TABLE "ata" ADD COLUMN IF NOT EXISTS "local" varchar(255)', "ata.local"],
  ];

  for (const [stmt, label] of statements) {
    try {
      await sql.query(stmt, []);
      console.log(`  ✓ ${label} added`);
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

  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
