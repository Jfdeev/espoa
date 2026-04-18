import {
  pgTable,
  uuid,
  varchar,
  date,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";

export const associado = pgTable("associado", {
  id: uuid("id").defaultRandom().primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(),
  contato: varchar("contato", { length: 255 }),
  dataEntrada: date("data_entrada").notNull(),
  status: varchar("status", { length: 50 }).notNull().default("ativo"),
  version: integer("version").notNull().default(1),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  deviceId: varchar("device_id", { length: 255 }),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});
