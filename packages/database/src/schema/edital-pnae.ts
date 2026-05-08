import {
  pgTable,
  uuid,
  varchar,
  text,
  date,
  integer,
  real,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { associacao } from "./associacao";
import { usuario } from "./usuario";

export const editalPnae = pgTable(
  "edital_pnae",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    associacaoId: uuid("associacao_id")
      .notNull()
      .references(() => associacao.id),

    titulo: varchar("titulo", { length: 255 }).notNull(),
    numeroEdital: varchar("numero_edital", { length: 100 }),
    orgaoResponsavel: varchar("orgao_responsavel", { length: 255 }),
    descricao: text("descricao"),

    municipio: varchar("municipio", { length: 255 }),
    estado: varchar("estado", { length: 2 }),

    dataAbertura: date("data_abertura"),
    dataLimite: date("data_limite").notNull(),

    valorTotalEstimado: real("valor_total_estimado"),

    linkOriginal: varchar("link_original", { length: 1000 }),

    observacoesInternas: text("observacoes_internas"),

    status: varchar("status", { length: 50 }).notNull().default("aberto"),

    createdBy: uuid("created_by").references(() => usuario.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    version: integer("version").notNull().default(1),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deviceId: varchar("device_id", { length: 255 }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    associacaoIdDeletedAtIdx: index(
      "edital_pnae_associacao_id_deleted_at_idx",
    ).on(table.associacaoId, table.deletedAt),
    statusIdx: index("edital_pnae_status_idx").on(table.status),
  }),
);
