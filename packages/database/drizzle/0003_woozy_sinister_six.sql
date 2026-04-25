ALTER TABLE "usuario_associacao" DROP CONSTRAINT "usuario_associacao_usuario_id_associacao_id_pk";--> statement-breakpoint
ALTER TABLE "usuario_associacao" ADD PRIMARY KEY ("id");