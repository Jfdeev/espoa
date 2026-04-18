import {
  pgTable,
  uuid,
  varchar,
  date,
  integer,
  timestamp,
  real,
} from "drizzle-orm/pg-core";

export const transacaoFinanceira = pgTable("transacao_financeira", {
  id: uuid("id").defaultRandom().primaryKey(),
  tipo: varchar("tipo", { length: 100 }).notNull(),
  valor: real("valor").notNull(),
  descricao: varchar("descricao", { length: 500 }),
  data: date("data").notNull(),
  version: integer("version").notNull().default(1),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  deviceId: varchar("device_id", { length: 255 }),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});
