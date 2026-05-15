const { neon } = require("@neondatabase/serverless");

const sql = neon(process.env.DATABASE_URL);

async function run() {
  await sql`ALTER TABLE mensalidade ALTER COLUMN associado_id DROP NOT NULL`;
  console.log("OK: mensalidade.associado_id is now nullable");

  // Verificar também usuario_id
  await sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'mensalidade' AND column_name = 'usuario_id'
      ) THEN
        ALTER TABLE mensalidade ADD COLUMN usuario_id uuid REFERENCES usuario(id);
        RAISE NOTICE 'usuario_id added';
      ELSE
        RAISE NOTICE 'usuario_id already exists';
      END IF;
    END $$;
  `;
  console.log("OK: mensalidade.usuario_id checked");
}

run().catch((e) => {
  console.error("ERRO:", e.message);
  process.exit(1);
});
