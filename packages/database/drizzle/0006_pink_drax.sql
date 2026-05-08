ALTER TABLE "usuario_associacao" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "usuario_associacao" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "usuario_associacao" ADD COLUMN "device_id" varchar(255);