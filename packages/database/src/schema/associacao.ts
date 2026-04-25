import {
  pgTable,
  uuid,
  varchar,
  timestamp,
} from "drizzle-orm/pg-core";
import { usuario } from "./usuario";

export const associacao = pgTable("associacao", {
  id: uuid("id").defaultRandom().primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(),
  cnpj: varchar("cnpj", { length: 18 }).notNull().unique(),
  municipio: varchar("municipio", { length: 255 }).notNull(),
  estado: varchar("estado", { length: 2 }).notNull(),
  telefone: varchar("telefone", { length: 20 }),
  email: varchar("email", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid("created_by").references(() => usuario.id, { onDelete: "set null" }),
});
