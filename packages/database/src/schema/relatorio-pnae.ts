import {
  pgTable,
  uuid,
  text,
  date,
} from "drizzle-orm/pg-core";
import { editalPnae } from "./edital-pnae";

export const relatorioPnae = pgTable("relatorio_pnae", {
  id: uuid("id").defaultRandom().primaryKey(),
  editalId: uuid("edital_id")
    .notNull()
    .references(() => editalPnae.id),
  conteudo: text("conteudo").notNull(),
  dataGeracao: date("data_geracao").notNull(),
});
