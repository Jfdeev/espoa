// Diagnóstico: verifica que tabelas/colunas existem no banco vs esperado.
// Não modifica nada — apenas reporta.

require("dotenv").config({ path: "../../apps/api/.env" });
require("dotenv").config({ path: "../../.env" });

const { neon } = require("@neondatabase/serverless");
const sql = neon(process.env.DATABASE_URL);

async function tableExists(name) {
  const rows = await sql`
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = ${name}
  `;
  return rows.length > 0;
}

async function columnExists(table, column) {
  const rows = await sql`
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = ${table} AND column_name = ${column}
  `;
  return rows.length > 0;
}

async function listColumns(table) {
  return await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = ${table}
    ORDER BY ordinal_position
  `;
}

async function listAppliedMigrations() {
  try {
    return await sql`SELECT name FROM drizzle_migrations ORDER BY id`;
  } catch {
    return [];
  }
}

async function main() {
  console.log("=== Tabelas esperadas ===");
  const expectedTables = [
    "usuario", "associacao", "usuario_associacao", "associado",
    "mensalidade", "transacao_financeira", "ata", "aviso",
    "producao", "edital_pnae", "relatorio_pnae", "sync_queue",
    "conflict_log", "drizzle_migrations",
  ];
  for (const t of expectedTables) {
    const exists = await tableExists(t);
    console.log(`  ${exists ? "✓" : "✗ FALTA"}  ${t}`);
  }

  console.log("\n=== ata columns ===");
  const ataCols = await listColumns("ata");
  console.log("  " + ataCols.map((c) => c.column_name).join(", "));

  console.log("\n=== transacao_financeira columns ===");
  const tfCols = await listColumns("transacao_financeira");
  console.log("  " + tfCols.map((c) => c.column_name).join(", "));

  console.log("\n=== aviso columns (se existir) ===");
  if (await tableExists("aviso")) {
    const avCols = await listColumns("aviso");
    console.log("  " + avCols.map((c) => c.column_name).join(", "));
  } else {
    console.log("  (tabela não existe)");
  }

  console.log("\n=== usuario columns ===");
  const usuarioCols = await listColumns("usuario");
  console.log("  " + usuarioCols.map((c) => c.column_name).join(", "));

  console.log("\n=== drizzle_migrations (aplicadas) ===");
  const applied = await listAppliedMigrations();
  for (const m of applied) console.log(`  ${m.name}`);

  console.log("\n=== Conclusões ===");
  const checks = [
    ["aviso table", await tableExists("aviso")],
    ["ata.associacao_id", await columnExists("ata", "associacao_id")],
    ["ata.participantes", await columnExists("ata", "participantes")],
    ["ata.local", await columnExists("ata", "local")],
    ["ata.resumo_ia", await columnExists("ata", "resumo_ia")],
    ["transacao_financeira.associacao_id", await columnExists("transacao_financeira", "associacao_id")],
    ["usuario.cpf", await columnExists("usuario", "cpf")],
  ];
  for (const [label, ok] of checks) {
    console.log(`  ${ok ? "✓" : "✗ FALTA"}  ${label}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
