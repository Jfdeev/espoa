import {
  db,
  conflictLog,
  mensalidade as mensalidadeTable,
  associado as associadoTable,
  producao as producaoTable,
  editalPnae as editalPnaeTable,
  associacao as associacaoTable,
  usuarioAssociacao as usuarioAssociacaoTable,
  transacaoFinanceira as transacaoFinanceiraTable,
  aviso as avisoTable,
  ata as ataTable,
} from "@espoa/database";
import { and, eq, gt, inArray, getTableColumns } from "drizzle-orm";
import {
  syncTableNames,
  syncTables,
  createEmptyPulledRows,
} from "../sync/sync.tables";
import type { ConflictLogRow, PulledRows, SyncTableName } from "../sync/sync.types";
import { toSnakeObject } from "../utils/case-mapper";

// Tabelas que só fazem sentido no contexto de uma associação específica.
// Se o usuário não tiver associação ativa, retornam vazio.
const ASSOC_SCOPED = new Set<SyncTableName>([
  "associado",
  "producao",
  "edital_pnae",
  "associacao",
  "usuario_associacao",
  "transacao_financeira",
]);

export async function pullRowsByTable(
  lastPulledAt: Date | null,
  userId?: string,
): Promise<PulledRows> {
  const pulled = createEmptyPulledRows();

  const assocIds = userId ? await getAssociacaoIds(userId) : [];

  for (const tableName of syncTableNames) {
    try {
      pulled[tableName] = await getPulledRows(tableName, lastPulledAt, userId, assocIds);
    } catch (err) {
      console.error(`[sync-pull] Erro ao fazer pull de "${tableName}":`, err instanceof Error ? err.message : err);
      pulled[tableName] = [];
    }
  }

  return pulled;
}

async function getAssociacaoIds(userId: string): Promise<string[]> {
  const vinculos = await db
    .select({ associacaoId: usuarioAssociacaoTable.associacaoId })
    .from(usuarioAssociacaoTable)
    .where(
      and(
        eq(usuarioAssociacaoTable.usuarioId, userId),
        eq(usuarioAssociacaoTable.status, "ativo"),
      ),
    );
  return vinculos.map((v) => v.associacaoId);
}

// Configuração das tabelas que filtram por inArray em uma coluna de associação.
type AssocTableConfig = { table: any; filterCol: any; updatedAtCol: any };

const ASSOC_TABLE_CONFIG: Partial<Record<SyncTableName, AssocTableConfig>> = {
  associado:            { table: associadoTable,            filterCol: associadoTable.associacaoId,            updatedAtCol: associadoTable.updatedAt },
  edital_pnae:          { table: editalPnaeTable,           filterCol: editalPnaeTable.associacaoId,           updatedAtCol: editalPnaeTable.updatedAt },
  associacao:           { table: associacaoTable,           filterCol: associacaoTable.id,                     updatedAtCol: associacaoTable.updatedAt },
  usuario_associacao:   { table: usuarioAssociacaoTable,    filterCol: usuarioAssociacaoTable.associacaoId,    updatedAtCol: usuarioAssociacaoTable.updatedAt },
  transacao_financeira: { table: transacaoFinanceiraTable,  filterCol: transacaoFinanceiraTable.associacaoId,  updatedAtCol: transacaoFinanceiraTable.updatedAt },
};

async function fetchByAssocIds(
  config: AssocTableConfig,
  assocIds: string[],
  lastPulledAt: Date | null,
): Promise<Record<string, unknown>[]> {
  const baseWhere = inArray(config.filterCol, assocIds);
  const rows = lastPulledAt
    ? await db.select().from(config.table).where(and(baseWhere, gt(config.updatedAtCol, lastPulledAt)))
    : await db.select().from(config.table).where(baseWhere);
  return rows.map((row: Record<string, unknown>) => toSnakeObject(row));
}

async function fetchMensalidade(userId: string, lastPulledAt: Date | null) {
  const rows = lastPulledAt
    ? await db.select().from(mensalidadeTable).where(and(eq(mensalidadeTable.usuarioId, userId), gt(mensalidadeTable.updatedAt, lastPulledAt)))
    : await db.select().from(mensalidadeTable).where(eq(mensalidadeTable.usuarioId, userId));
  return rows.map((row: Record<string, unknown>) => toSnakeObject(row));
}

async function fetchProducao(assocIds: string[], lastPulledAt: Date | null) {
  const cols = getTableColumns(producaoTable);
  const join = eq(producaoTable.associadoId, associadoTable.id);
  const baseWhere = inArray(associadoTable.associacaoId, assocIds);
  const rows = lastPulledAt
    ? await db.select(cols).from(producaoTable).innerJoin(associadoTable, join).where(and(baseWhere, gt(producaoTable.updatedAt, lastPulledAt)))
    : await db.select(cols).from(producaoTable).innerJoin(associadoTable, join).where(baseWhere);
  return rows.map((row: Record<string, unknown>) => toSnakeObject(row));
}

async function getPulledRows(
  tableName: SyncTableName,
  lastPulledAt: Date | null,
  userId?: string,
  assocIds: string[] = [],
) {
  if (ASSOC_SCOPED.has(tableName) && assocIds.length === 0) return [];

  if (tableName === "mensalidade" && userId) return fetchMensalidade(userId, lastPulledAt);

  if (tableName === "producao") return fetchProducao(assocIds, lastPulledAt);

  // aviso: só pull das associações do usuário
  if (tableName === "aviso") {
    if (assocIds.length === 0) return [];
    const rows = lastPulledAt
      ? await db
          .select()
          .from(avisoTable)
          .where(and(inArray(avisoTable.associacaoId, assocIds), gt(avisoTable.updatedAt, lastPulledAt)))
      : await db
          .select()
          .from(avisoTable)
          .where(inArray(avisoTable.associacaoId, assocIds));
    return rows.map((row: Record<string, unknown>) => toSnakeObject(row));
  }

  // ata: só pull das associações do usuário (evita vazamento entre associações)
  if (tableName === "ata") {
    if (assocIds.length === 0) return [];
    const rows = lastPulledAt
      ? await db
          .select()
          .from(ataTable)
          .where(and(inArray(ataTable.associacaoId, assocIds), gt(ataTable.updatedAt, lastPulledAt)))
      : await db
          .select()
          .from(ataTable)
          .where(inArray(ataTable.associacaoId, assocIds));
    return rows.map((row: Record<string, unknown>) => toSnakeObject(row));
  }

  const assocConfig = ASSOC_TABLE_CONFIG[tableName];
  if (assocConfig) return fetchByAssocIds(assocConfig, assocIds, lastPulledAt);
  const table = syncTables[tableName] as any;
  const rows = lastPulledAt
    ? await db.select().from(table).where(gt(table.updatedAt, lastPulledAt))
    : await db.select().from(table);
  return rows.map((row: Record<string, unknown>) => toSnakeObject(row));
}

export async function pullConflictLogs(
  deviceId: string,
  lastPulledAt: Date | null,
): Promise<ConflictLogRow[]> {
  const rows = lastPulledAt
    ? await db
        .select()
        .from(conflictLog)
        .where(
          and(
            eq(conflictLog.deviceId, deviceId),
            gt(conflictLog.createdAt, lastPulledAt),
          ),
        )
    : await db
        .select()
        .from(conflictLog)
        .where(eq(conflictLog.deviceId, deviceId));

  return rows.map((row) => ({
    id: row.id,
    device_id: row.deviceId,
    operation_id: row.operationId,
    table_name: row.tableName,
    record_id: row.recordId,
    local_data: row.localData as Record<string, unknown> | null,
    remote_data: row.remoteData as Record<string, unknown> | null,
    reason: row.reason,
    resolved: row.resolved,
    created_at: row.createdAt.toISOString(),
  }));
}
