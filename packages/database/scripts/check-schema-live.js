// Verifica se as colunas do banco batem com o schema esperado
require("dotenv").config({ path: "../../apps/api/.env" });
const { neon } = require("@neondatabase/serverless");

const sql = neon(process.env.DATABASE_URL);

async function checkTable(tableName, expectedCols) {
  const rows = await sql`
    SELECT column_name, is_nullable, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = ${tableName}
    ORDER BY ordinal_position
  `;
  const actual = rows.map((r) => r.column_name);
  const missing = expectedCols.filter((c) => !actual.includes(c));
  const extra = actual.filter((c) => !expectedCols.includes(c));

  if (missing.length || extra.length) {
    console.log(`\n⚠️  ${tableName}:`);
    if (missing.length) console.log("  FALTANDO:", missing.join(", "));
    if (extra.length) console.log("  SOBRANDO:", extra.join(", "));
  } else {
    console.log(`✓  ${tableName}`);
  }
}

async function main() {
  await checkTable("mensalidade", ["id", "associado_id", "usuario_id", "valor", "data_pagamento", "forma_pagamento", "version", "updated_at", "device_id", "deleted_at"]);
  await checkTable("associado", ["id", "nome", "contato", "data_entrada", "status", "version", "updated_at", "device_id", "deleted_at", "associacao_id", "cpf", "caf", "telefone", "endereco", "comunidade", "usuario_id"]);
  await checkTable("usuario", ["id", "email", "nome", "telefone", "cpf", "avatar_url", "auth_provider", "google_id", "password_hash", "email_verified", "verification_token", "reset_token", "reset_token_expires_at", "created_at", "updated_at"]);
  await checkTable("usuario_associacao", ["id", "usuario_id", "associacao_id", "role", "status", "requested_at", "joined_at", "version", "updated_at", "device_id"]);
  await checkTable("edital_pnae", ["id", "associacao_id", "titulo", "numero_edital", "orgao_responsavel", "descricao", "municipio", "estado", "data_abertura", "data_limite", "valor_total_estimado", "link_original", "observacoes_internas", "status", "created_by", "created_at", "version", "updated_at", "device_id", "deleted_at"]);
  await checkTable("sync_queue", ["id", "operation_id", "device_id", "table_name", "record_id", "operation", "payload", "processed", "created_at"]);

  // Verificar constraint única do sync_queue
  const constraints = await sql`
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'sync_queue'::regclass AND contype = 'u'
  `;
  console.log("\nsync_queue unique constraints:", constraints.map((c) => c.conname));
}

main().catch((e) => { console.error(e.message); process.exit(1); });
