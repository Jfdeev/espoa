import {
  pgTable,
  uuid,
  varchar,
  date,
  integer,
  timestamp,
  real,
} from "drizzle-orm/pg-core";
import { associado } from "./associado";

export const producao = pgTable("producao", {
  id: uuid("id").defaultRandom().primaryKey(),
  associadoId: uuid("associado_id")
    .notNull()
    .references(() => associado.id),
  cultura: varchar("cultura", { length: 255 }).notNull(),
  quantidade: real("quantidade").notNull(),
  data: date("data").notNull(),
  version: integer("version").notNull().default(1),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  deviceId: varchar("device_id", { length: 255 }),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});
