import {
  associado,
  associacao,
  ata,
  editalPnae,
  mensalidade,
  producao,
  transacaoFinanceira,
  usuarioAssociacao,
} from "@espoa/database";
import type { PulledRows, SyncTableName } from "./sync.types";

export const syncTables = {
  associado,
  associacao,
  mensalidade,
  transacao_financeira: transacaoFinanceira,
  ata,
  producao,
  usuario_associacao: usuarioAssociacao,
  edital_pnae: editalPnae,
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
    usuario_associacao: [],
    edital_pnae: [],
  };
}
