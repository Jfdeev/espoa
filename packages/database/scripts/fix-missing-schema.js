// Fix pontual: reaplica idempotentemente as peças que estão marcadas como
// aplicadas em drizzle_migrations mas que não existem no banco.
//
// Usa tagged-template do driver (não sql.unsafe) para garantir execução real.

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

async function main() {
  console.log("DATABASE_URL host:", new URL(process.env.DATABASE_URL).host);

  // 1. ata.resumo_ia
  if (!(await columnExists("ata", "resumo_ia"))) {
    console.log("[fix] adicionando ata.resumo_ia ...");
    await sql`ALTER TABLE "ata" ADD COLUMN IF NOT EXISTS "resumo_ia" text`;
    const ok = await columnExists("ata", "resumo_ia");
    console.log("       resultado:", ok ? "OK" : "FALHOU");
  } else {
    console.log("[ok] ata.resumo_ia já existe");
  }

  // 2. tabela aviso (criar em chamadas separadas — cada statement num call)
  if (!(await tableExists("aviso"))) {
    console.log("[fix] criando tabela aviso ...");
    await sql`
      CREATE TABLE IF NOT EXISTS "aviso" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "associacao_id" uuid NOT NULL REFERENCES "associacao"("id") ON DELETE CASCADE,
        "titulo" varchar(200) NOT NULL,
        "mensagem" text NOT NULL,
        "expira_em" timestamp with time zone,
        "version" integer DEFAULT 1 NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
        "device_id" varchar(255),
        "deleted_at" timestamp with time zone
      )
    `;
    const created = await tableExists("aviso");
    console.log("       tabela:", created ? "OK" : "FALHOU");

    if (created) {
      console.log("[fix] criando índice aviso_associacao_id_deleted_at_idx ...");
      await sql`
        CREATE INDEX IF NOT EXISTS "aviso_associacao_id_deleted_at_idx"
          ON "aviso" ("associacao_id", "deleted_at")
      `;
      console.log("       índice: OK");
    }
  } else {
    console.log("[ok] tabela aviso já existe");
  }

  console.log("\nConcluído. Validando...");

  const finalChecks = [
    ["aviso table", await tableExists("aviso")],
    ["ata.resumo_ia", await columnExists("ata", "resumo_ia")],
  ];
  for (const [label, ok] of finalChecks) {
    console.log(`  ${ok ? "✓" : "✗ FALTA"}  ${label}`);
  }
}

main().catch((e) => {
  console.error("ERRO:", e);
  process.exit(1);
});
