ALTER TABLE "associacao" ADD COLUMN "endereco" varchar(500);--> statement-breakpoint
ALTER TABLE "associacao" ADD COLUMN "status" varchar(50) DEFAULT 'ativa' NOT NULL;--> statement-breakpoint
ALTER TABLE "associacao" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "associacao" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "associacao" ADD COLUMN "device_id" varchar(255);--> statement-breakpoint
ALTER TABLE "associacao" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "associado" ADD COLUMN "associacao_id" uuid;--> statement-breakpoint
ALTER TABLE "associado" ADD COLUMN "cpf" varchar(14);--> statement-breakpoint
ALTER TABLE "associado" ADD COLUMN "caf" varchar(50);--> statement-breakpoint
ALTER TABLE "associado" ADD COLUMN "telefone" varchar(20);--> statement-breakpoint
ALTER TABLE "associado" ADD COLUMN "endereco" varchar(500);--> statement-breakpoint
ALTER TABLE "associado" ADD COLUMN "comunidade" varchar(255);--> statement-breakpoint
ALTER TABLE "associado" ADD CONSTRAINT "associado_associacao_id_associacao_id_fk" FOREIGN KEY ("associacao_id") REFERENCES "public"."associacao"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "associado" ADD CONSTRAINT "associado_cpf_unique" UNIQUE("cpf");