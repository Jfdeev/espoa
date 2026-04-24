ALTER TABLE "usuario" DROP CONSTRAINT "usuario_firebase_uid_unique";--> statement-breakpoint
ALTER TABLE "usuario" ADD COLUMN "google_id" varchar(128);--> statement-breakpoint
ALTER TABLE "usuario" ADD COLUMN "password_hash" varchar(255);--> statement-breakpoint
ALTER TABLE "usuario" ADD COLUMN "email_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "usuario" ADD COLUMN "verification_token" varchar(128);--> statement-breakpoint
ALTER TABLE "usuario" ADD COLUMN "reset_token" varchar(128);--> statement-breakpoint
ALTER TABLE "usuario" ADD COLUMN "reset_token_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "usuario" DROP COLUMN "firebase_uid";--> statement-breakpoint
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_google_id_unique" UNIQUE("google_id");