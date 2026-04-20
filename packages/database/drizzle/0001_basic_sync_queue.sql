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
	CONSTRAINT "sync_queue_operation_id_unique" UNIQUE("operation_id")
);
