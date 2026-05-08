ALTER TABLE "associado" ADD COLUMN "usuario_id" uuid REFERENCES "usuario"("id");
