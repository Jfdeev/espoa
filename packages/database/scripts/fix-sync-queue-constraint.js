// Corrige a unique constraint do sync_queue de operation_id para (device_id, operation_id)
require("dotenv").config({ path: "../../apps/api/.env" });
const { neon } = require("@neondatabase/serverless");

const sql = neon(process.env.DATABASE_URL);

async function main() {
  // Remove constraint antiga (single column)
  await sql`ALTER TABLE sync_queue DROP CONSTRAINT IF EXISTS sync_queue_operation_id_unique`;
  console.log("✓ Removida constraint sync_queue_operation_id_unique");

  // Adiciona constraint correta (composite)
  await sql`
    ALTER TABLE sync_queue
    ADD CONSTRAINT sync_queue_device_id_operation_id_unique
    UNIQUE (device_id, operation_id)
  `;
  console.log("✓ Adicionada constraint sync_queue_device_id_operation_id_unique");
}

main().catch((e) => { console.error("ERRO:", e.message); process.exit(1); });
