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
);

CREATE INDEX IF NOT EXISTS "aviso_associacao_id_deleted_at_idx"
  ON "aviso" ("associacao_id", "deleted_at");
