import {
  pgTable,
  uuid,
  varchar,
  date,
  integer,
  timestamp,
  real,
} from "drizzle-orm/pg-core";
import { associado } from "./associado";
import { usuario } from "./usuario";

export const mensalidade = pgTable("mensalidade", {
  id: uuid("id").defaultRandom().primaryKey(),
  associadoId: uuid("associado_id").references(() => associado.id),
  usuarioId: uuid("usuario_id").references(() => usuario.id),
  valor: real("valor").notNull(),
  dataPagamento: date("data_pagamento"),
  formaPagamento: varchar("forma_pagamento", { length: 100 }),
  version: integer("version").notNull().default(1),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  deviceId: varchar("device_id", { length: 255 }),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});
