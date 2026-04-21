import {
  associado,
  associacao,
  ata,
  mensalidade,
  producao,
  transacaoFinanceira,
} from "@espoa/database";
import type { PulledRows, SyncTableName } from "./sync.types";

export const syncTables = {
  associado,
  associacao,
  mensalidade,
  transacao_financeira: transacaoFinanceira,
  ata,
  producao,
} as const;

export const syncTableNames = Object.keys(syncTables) as SyncTableName[];

export function createEmptyPulledRows(): PulledRows {
  return {
    associado: [],
    associacao: [],
    mensalidade: [],
    transacao_financeira: [],
    ata: [],
    producao: [],
  };
}
