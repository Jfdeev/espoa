import {
  pgTable,
  uuid,
  varchar,
  text,
  date,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";

export const ata = pgTable("ata", {
  id: uuid("id").defaultRandom().primaryKey(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  conteudo: text("conteudo").notNull(),
  data: date("data").notNull(),
  version: integer("version").notNull().default(1),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  deviceId: varchar("device_id", { length: 255 }),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});
