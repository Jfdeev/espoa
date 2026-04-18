import {
  pgTable,
  uuid,
  varchar,
  text,
  date,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";

export const editalPnae = pgTable("edital_pnae", {
  id: uuid("id").defaultRandom().primaryKey(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  descricao: text("descricao"),
  dataInicio: date("data_inicio").notNull(),
  dataFim: date("data_fim").notNull(),
  status: varchar("status", { length: 50 }).notNull().default("aberto"),
  version: integer("version").notNull().default(1),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  deviceId: varchar("device_id", { length: 255 }),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});
