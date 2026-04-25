CREATE TABLE "associacao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" varchar(255) NOT NULL,
	"cnpj" varchar(18) NOT NULL,
	"municipio" varchar(255) NOT NULL,
	"estado" varchar(2) NOT NULL,
	"telefone" varchar(20),
	"email" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
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
CREATE TABLE "usuario" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firebase_uid" varchar(128) NOT NULL,
	"email" varchar(255) NOT NULL,
	"nome" varchar(255) NOT NULL,
	"telefone" varchar(20),
	"avatar_url" varchar(512),
	"auth_provider" varchar(20) DEFAULT 'email' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usuario_firebase_uid_unique" UNIQUE("firebase_uid"),
	CONSTRAINT "usuario_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "usuario_associacao" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"associacao_id" uuid NOT NULL,
	"role" varchar(20) DEFAULT 'associado' NOT NULL,
	"status" varchar(20) DEFAULT 'pendente' NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"joined_at" timestamp with time zone,
	CONSTRAINT "usuario_associacao_usuario_id_associacao_id_pk" PRIMARY KEY("usuario_id","associacao_id")
);
--> statement-breakpoint
ALTER TABLE "associacao" ADD CONSTRAINT "associacao_created_by_usuario_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."usuario"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuario_associacao" ADD CONSTRAINT "usuario_associacao_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuario_associacao" ADD CONSTRAINT "usuario_associacao_associacao_id_associacao_id_fk" FOREIGN KEY ("associacao_id") REFERENCES "public"."associacao"("id") ON DELETE cascade ON UPDATE no action;