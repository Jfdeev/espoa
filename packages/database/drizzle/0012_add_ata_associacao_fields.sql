ALTER TABLE "ata" ADD COLUMN "associacao_id" uuid REFERENCES "associacao"("id") ON DELETE CASCADE;
ALTER TABLE "ata" ADD COLUMN "participantes" text;
ALTER TABLE "ata" ADD COLUMN "local" varchar(255);
