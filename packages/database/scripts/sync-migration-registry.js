require("dotenv").config({ path: "../../apps/api/.env" });
const { neon } = require("@neondatabase/serverless");
const sql = neon(process.env.DATABASE_URL);

async function run() {
  // Criar tabela se não existir
  await sql`CREATE TABLE IF NOT EXISTS drizzle_migrations (id SERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE, applied_at TIMESTAMPTZ DEFAULT NOW())`;

  const rows = await sql`SELECT name FROM drizzle_migrations ORDER BY id`;
  console.log("Migrations registradas:");
  rows.forEach((r) => console.log(" -", r.name));

  // Registrar as migrations que foram aplicadas manualmente (se ainda não registradas)
  const toRegister = [
    "0008_chief_scorpion.sql",
    "0009_add_documento_transacao_financeira.sql",
    "0010_associado_usuario_id.sql",
    "0011_transacao_financeira_associacao_id.sql",
  ];

  for (const name of toRegister) {
    const existing = await sql`SELECT 1 FROM drizzle_migrations WHERE name = ${name}`;
    if (existing.length === 0) {
      await sql`INSERT INTO drizzle_migrations (name) VALUES (${name})`;
      console.log("[registrado]", name);
    } else {
      console.log("[já existe]", name);
    }
  }
  console.log("Feito.");
}

run().catch((e) => {
  console.error("Erro:", e.message);
  process.exit(1);
});
