import {
  pgTable,
  uuid,
  varchar,
  date,
  integer,
  timestamp,
  real,
  text,
} from "drizzle-orm/pg-core";
import { associado } from "./associado";

export const areaPlantada = pgTable("area_plantada", {
  id: uuid("id").defaultRandom().primaryKey(),
  associadoId: uuid("associado_id")
    .notNull()
    .references(() => associado.id),
  cultura: varchar("cultura", { length: 255 }).notNull(),
  areaHa: real("area_ha").notNull(),
  dataReferencia: date("data_referencia").notNull(),
  observacao: text("observacao"),
  version: integer("version").notNull().default(1),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  deviceId: varchar("device_id", { length: 255 }),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});
