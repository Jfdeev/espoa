import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";
import { associacao } from "./associacao";

/**
 * Quadro de avisos da associação — mural curto gerenciado pelos admins.
 * Visível para todos os membros ativos no dashboard.
 */
export const aviso = pgTable("aviso", {
  id: uuid("id").defaultRandom().primaryKey(),
  associacaoId: uuid("associacao_id")
    .notNull()
    .references(() => associacao.id, { onDelete: "cascade" }),
  titulo: varchar("titulo", { length: 200 }).notNull(),
  mensagem: text("mensagem").notNull(),
  // Aviso expira automaticamente após essa data — null = sem expiração
  expiraEm: timestamp("expira_em", { withTimezone: true }),
  // Sync fields (mesmo padrão das outras tabelas sincronizáveis)
  version: integer("version").notNull().default(1),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  deviceId: varchar("device_id", { length: 255 }),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});
