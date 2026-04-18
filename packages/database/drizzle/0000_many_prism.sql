CREATE TABLE "associado" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" varchar(255) NOT NULL,
	"contato" varchar(255),
	"data_entrada" date NOT NULL,
	"status" varchar(50) DEFAULT 'ativo' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"device_id" varchar(255),
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "ata" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"titulo" varchar(255) NOT NULL,
	"conteudo" text NOT NULL,
	"data" date NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"device_id" varchar(255),
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "edital_pnae" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"titulo" varchar(255) NOT NULL,
	"descricao" text,
	"data_inicio" date NOT NULL,
	"data_fim" date NOT NULL,
	"status" varchar(50) DEFAULT 'aberto' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"device_id" varchar(255),
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "mensalidade" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"associado_id" uuid NOT NULL,
	"valor" real NOT NULL,
	"data_pagamento" date,
	"forma_pagamento" varchar(100),
	"version" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"device_id" varchar(255),
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "producao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"associado_id" uuid NOT NULL,
	"cultura" varchar(255) NOT NULL,
	"quantidade" real NOT NULL,
	"data" date NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"device_id" varchar(255),
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "relatorio_pnae" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"edital_id" uuid NOT NULL,
	"conteudo" text NOT NULL,
	"data_geracao" date NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transacao_financeira" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tipo" varchar(100) NOT NULL,
	"valor" real NOT NULL,
	"descricao" varchar(500),
	"data" date NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"device_id" varchar(255),
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "mensalidade" ADD CONSTRAINT "mensalidade_associado_id_associado_id_fk" FOREIGN KEY ("associado_id") REFERENCES "public"."associado"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "producao" ADD CONSTRAINT "producao_associado_id_associado_id_fk" FOREIGN KEY ("associado_id") REFERENCES "public"."associado"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relatorio_pnae" ADD CONSTRAINT "relatorio_pnae_edital_id_edital_pnae_id_fk" FOREIGN KEY ("edital_id") REFERENCES "public"."edital_pnae"("id") ON DELETE no action ON UPDATE no action;