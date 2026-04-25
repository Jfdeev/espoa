CREATE TABLE "associacao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" varchar(255) NOT NULL,
	"cnpj" varchar(18),
	"endereco" varchar(500),
	"telefone" varchar(20),
	"email" varchar(255),
	"status" varchar(50) DEFAULT 'ativa' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"device_id" varchar(255),
	"deleted_at" timestamp with time zone,
	CONSTRAINT "associacao_cnpj_unique" UNIQUE("cnpj")
);
--> statement-breakpoint
CREATE TABLE "sync_queue" (
	"id" serial PRIMARY KEY NOT NULL,
	"operation_id" varchar(255) NOT NULL,
	"device_id" varchar(255) NOT NULL,
	"table_name" varchar(100) NOT NULL,
	"record_id" varchar(255) NOT NULL,
	"operation" varchar(20) NOT NULL,
	"payload" jsonb NOT NULL,
	"processed" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sync_queue_device_id_operation_id_unique" UNIQUE("device_id","operation_id")
);
--> statement-breakpoint
ALTER TABLE "associado" ADD COLUMN "associacao_id" uuid;--> statement-breakpoint
ALTER TABLE "associado" ADD COLUMN "cpf" varchar(14);--> statement-breakpoint
ALTER TABLE "associado" ADD COLUMN "caf" varchar(50);--> statement-breakpoint
ALTER TABLE "associado" ADD COLUMN "telefone" varchar(20);--> statement-breakpoint
ALTER TABLE "associado" ADD COLUMN "endereco" varchar(500);--> statement-breakpoint
ALTER TABLE "associado" ADD COLUMN "comunidade" varchar(255);--> statement-breakpoint
ALTER TABLE "associado" ADD CONSTRAINT "associado_associacao_id_associacao_id_fk" FOREIGN KEY ("associacao_id") REFERENCES "public"."associacao"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "associado" ADD CONSTRAINT "associado_cpf_unique" UNIQUE("cpf");