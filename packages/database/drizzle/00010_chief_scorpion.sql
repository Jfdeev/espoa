ALTER TABLE "edital_pnae" RENAME COLUMN "data_inicio" TO "data_abertura";--> statement-breakpoint
ALTER TABLE "edital_pnae" RENAME COLUMN "data_fim" TO "data_limite";--> statement-breakpoint
ALTER TABLE "edital_pnae" ADD COLUMN "associacao_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "edital_pnae" ADD COLUMN "numero_edital" varchar(100);--> statement-breakpoint
ALTER TABLE "edital_pnae" ADD COLUMN "orgao_responsavel" varchar(255);--> statement-breakpoint
ALTER TABLE "edital_pnae" ADD COLUMN "municipio" varchar(255);--> statement-breakpoint
ALTER TABLE "edital_pnae" ADD COLUMN "estado" varchar(2);--> statement-breakpoint
ALTER TABLE "edital_pnae" ADD COLUMN "valor_total_estimado" real;--> statement-breakpoint
ALTER TABLE "edital_pnae" ADD COLUMN "link_original" varchar(1000);--> statement-breakpoint
ALTER TABLE "edital_pnae" ADD COLUMN "observacoes_internas" text;--> statement-breakpoint
ALTER TABLE "edital_pnae" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "edital_pnae" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "edital_pnae" ADD CONSTRAINT "edital_pnae_associacao_id_associacao_id_fk" FOREIGN KEY ("associacao_id") REFERENCES "public"."associacao"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edital_pnae" ADD CONSTRAINT "edital_pnae_created_by_usuario_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."usuario"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "edital_pnae_associacao_id_deleted_at_idx" ON "edital_pnae" USING btree ("associacao_id","deleted_at");--> statement-breakpoint
CREATE INDEX "edital_pnae_status_idx" ON "edital_pnae" USING btree ("status");