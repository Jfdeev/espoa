require("dotenv").config({ path: "../../.env" });
const { neon } = require("@neondatabase/serverless");

const sql = neon(process.env.DATABASE_URL);

async function main() {
  console.log("Applying pending schema changes...\n");

  const statements = [
    ['ALTER TABLE "usuario" ADD COLUMN IF NOT EXISTS "cpf" varchar(14)', "usuario.cpf"],
    ['ALTER TABLE "mensalidade" ADD COLUMN IF NOT EXISTS "usuario_id" uuid REFERENCES "usuario"("id")', "mensalidade.usuario_id"],
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

main();
