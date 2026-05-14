import { db, conflictLog, mensalidade as mensalidadeTable, transacaoFinanceira, usuarioAssociacao } from "@espoa/database";
import { and, eq, gt, inArray, isNull } from "drizzle-orm";
import {
  syncTableNames,
  syncTables,
  createEmptyPulledRows,
} from "../sync/sync.tables";
import type { ConflictLogRow, PulledRows, SyncTableName } from "../sync/sync.types";
import { toSnakeObject } from "../utils/case-mapper";

/** Retorna os associacao_ids ativos do usuário para usar nos filtros de pull */
async function getAssociacaoIdsDoUsuario(userId: string): Promise<string[]> {
  const vinculos = await db
    .select({ associacaoId: usuarioAssociacao.associacaoId })
    .from(usuarioAssociacao)
    .where(and(eq(usuarioAssociacao.usuarioId, userId), eq(usuarioAssociacao.status, "ativo")));
  return vinculos.map((v) => v.associacaoId);
}

export async function pullRowsByTable(
  lastPulledAt: Date | null,
  userId?: string,
): Promise<PulledRows> {
  const pulled = createEmptyPulledRows();

  for (const tableName of syncTableNames) {
    try {
      pulled[tableName] = await getPulledRows(tableName, lastPulledAt, userId);
    } catch (err) {
      // Log o erro mas não deixa uma tabela quebrar o sync inteiro
      console.error(`[sync-pull] Erro ao fazer pull de "${tableName}":`, err instanceof Error ? err.message : err);
      pulled[tableName] = [];
    }
  }

  return pulled;
}

async function getPulledRows(
  tableName: SyncTableName,
  lastPulledAt: Date | null,
  userId?: string,
) {
  // Mensalidades: só pull das do próprio usuário
  if (tableName === "mensalidade" && userId) {
    const rows = lastPulledAt
      ? await db
          .select()
          .from(mensalidadeTable)
          .where(and(eq(mensalidadeTable.usuarioId, userId), gt(mensalidadeTable.updatedAt, lastPulledAt)))
      : await db
          .select()
          .from(mensalidadeTable)
          .where(eq(mensalidadeTable.usuarioId, userId));
    return rows.map((row: Record<string, unknown>) => toSnakeObject(row));
  }

  // transacao_financeira: só pull das associações do usuário
  if (tableName === "transacao_financeira" && userId) {
    const assocIds = await getAssociacaoIdsDoUsuario(userId);
    if (assocIds.length === 0) return [];
    const rows = lastPulledAt
      ? await db
          .select()
          .from(transacaoFinanceira)
          .where(and(inArray(transacaoFinanceira.associacaoId, assocIds), gt(transacaoFinanceira.updatedAt, lastPulledAt)))
      : await db
          .select()
          .from(transacaoFinanceira)
          .where(inArray(transacaoFinanceira.associacaoId, assocIds));
    return rows.map((row: Record<string, unknown>) => toSnakeObject(row));
  }

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
