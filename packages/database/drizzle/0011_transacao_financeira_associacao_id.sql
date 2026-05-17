ALTER TABLE "transacao_financeira" ADD COLUMN "associacao_id" uuid REFERENCES "associacao"("id") ON DELETE CASCADE;
