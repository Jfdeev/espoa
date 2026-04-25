import {
  pgTable,
  uuid,
  varchar,
  date,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";
import { associacao } from "./associacao";

export const associado = pgTable("associado", {
  id: uuid("id").defaultRandom().primaryKey(),
  associacaoId: uuid("associacao_id").references(() => associacao.id),
  nome: varchar("nome", { length: 255 }).notNull(),
  cpf: varchar("cpf", { length: 14 }).unique(),
  caf: varchar("caf", { length: 50 }),
  telefone: varchar("telefone", { length: 20 }),
  endereco: varchar("endereco", { length: 500 }),
  comunidade: varchar("comunidade", { length: 255 }),
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
