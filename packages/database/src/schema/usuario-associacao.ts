import {
  pgTable,
  uuid,
  varchar,
  timestamp,
} from "drizzle-orm/pg-core";
import { usuario } from "./usuario";
import { associacao } from "./associacao";

export const usuarioAssociacao = pgTable("usuario_associacao", {
  id: uuid("id").defaultRandom().primaryKey(),
  usuarioId: uuid("usuario_id")
    .notNull()
    .references(() => usuario.id, { onDelete: "cascade" }),
  associacaoId: uuid("associacao_id")
    .notNull()
    .references(() => associacao.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 20 }).notNull().default("associado"),
  status: varchar("status", { length: 20 }).notNull().default("pendente"), 
  requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
  joinedAt: timestamp("joined_at", { withTimezone: true }),
});
