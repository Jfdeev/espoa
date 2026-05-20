import {
  pgTable,
  uuid,
  varchar,
  text,
  date,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";
import { associacao } from "./associacao";

export const ata = pgTable("ata", {
  id: uuid("id").defaultRandom().primaryKey(),
  associacaoId: uuid("associacao_id").references(() => associacao.id, { onDelete: "cascade" }),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  conteudo: text("conteudo").notNull(),
  data: date("data").notNull(),
  participantes: text("participantes"),
  local: varchar("local", { length: 255 }),
  resumoIa: text("resumo_ia"),
  version: integer("version").notNull().default(1),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  deviceId: varchar("device_id", { length: 255 }),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});
