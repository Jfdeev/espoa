CREATE TABLE "area_plantada" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"associado_id" uuid NOT NULL,
	"cultura" varchar(255) NOT NULL,
	"area_ha" real NOT NULL,
	"data_referencia" date NOT NULL,
	"observacao" text,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"device_id" varchar(255),
	"deleted_at" timestamp with time zone
);

ALTER TABLE "area_plantada" ADD CONSTRAINT "area_plantada_associado_id_associado_id_fk" FOREIGN KEY ("associado_id") REFERENCES "public"."associado"("id") ON DELETE no action ON UPDATE no action;
