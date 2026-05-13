import {
  db,
  conflictLog,
  mensalidade as mensalidadeTable,
  associado as associadoTable,
  producao as producaoTable,
  editalPnae as editalPnaeTable,
  associacao as associacaoTable,
  usuarioAssociacao as usuarioAssociacaoTable,
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
const ASSOC_SCOPED: SyncTableName[] = [
  "associado",
  "producao",
  "edital_pnae",
  "associacao",
  "usuario_associacao",
];

export async function pullRowsByTable(
  lastPulledAt: Date | null,
  userId?: string,
): Promise<PulledRows> {
  const pulled = createEmptyPulledRows();

  const assocIds = userId ? await getAssociacaoIds(userId) : [];

  for (const tableName of syncTableNames) {
    pulled[tableName] = await getPulledRows(tableName, lastPulledAt, userId, assocIds);
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

async function getPulledRows(
  tableName: SyncTableName,
  lastPulledAt: Date | null,
  userId?: string,
  assocIds: string[] = [],
) {
  // Tabelas com escopo de associação: sem associação ativa → sem dados
  if (ASSOC_SCOPED.includes(tableName) && assocIds.length === 0) {
    return [];
  }

  // ── mensalidade: filtro por userId (comportamento existente) ─────────────────
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

  // ── associado: associacao_id direto ──────────────────────────────────────────
  if (tableName === "associado") {
    const rows = lastPulledAt
      ? await db
          .select()
          .from(associadoTable)
          .where(and(inArray(associadoTable.associacaoId, assocIds), gt(associadoTable.updatedAt, lastPulledAt)))
      : await db
          .select()
          .from(associadoTable)
          .where(inArray(associadoTable.associacaoId, assocIds));
    return rows.map((row: Record<string, unknown>) => toSnakeObject(row));
  }

  // ── producao: JOIN com associado para chegar em associacao_id ────────────────
  if (tableName === "producao") {
    const cols = getTableColumns(producaoTable);
    const rows = lastPulledAt
      ? await db
          .select(cols)
          .from(producaoTable)
          .innerJoin(associadoTable, eq(producaoTable.associadoId, associadoTable.id))
          .where(and(inArray(associadoTable.associacaoId, assocIds), gt(producaoTable.updatedAt, lastPulledAt)))
      : await db
          .select(cols)
          .from(producaoTable)
          .innerJoin(associadoTable, eq(producaoTable.associadoId, associadoTable.id))
          .where(inArray(associadoTable.associacaoId, assocIds));
    return rows.map((row: Record<string, unknown>) => toSnakeObject(row));
  }

  // ── edital_pnae: associacao_id direto ────────────────────────────────────────
  if (tableName === "edital_pnae") {
    const rows = lastPulledAt
      ? await db
          .select()
          .from(editalPnaeTable)
          .where(and(inArray(editalPnaeTable.associacaoId, assocIds), gt(editalPnaeTable.updatedAt, lastPulledAt)))
      : await db
          .select()
          .from(editalPnaeTable)
          .where(inArray(editalPnaeTable.associacaoId, assocIds));
    return rows.map((row: Record<string, unknown>) => toSnakeObject(row));
  }

  // ── associacao: apenas as associações do usuário ─────────────────────────────
  if (tableName === "associacao") {
    const rows = lastPulledAt
      ? await db
          .select()
          .from(associacaoTable)
          .where(and(inArray(associacaoTable.id, assocIds), gt(associacaoTable.updatedAt, lastPulledAt)))
      : await db
          .select()
          .from(associacaoTable)
          .where(inArray(associacaoTable.id, assocIds));
    return rows.map((row: Record<string, unknown>) => toSnakeObject(row));
  }

  // ── usuario_associacao: associacao_id direto ──────────────────────────────────
  if (tableName === "usuario_associacao") {
    const rows = lastPulledAt
      ? await db
          .select()
          .from(usuarioAssociacaoTable)
          .where(and(inArray(usuarioAssociacaoTable.associacaoId, assocIds), gt(usuarioAssociacaoTable.updatedAt, lastPulledAt)))
      : await db
          .select()
          .from(usuarioAssociacaoTable)
          .where(inArray(usuarioAssociacaoTable.associacaoId, assocIds));
    return rows.map((row: Record<string, unknown>) => toSnakeObject(row));
  }

  // ── ata, transacao_financeira: sem associacao_id no schema ───────────────────
  // Retorna tudo por ora; corrigir exige adicionar associacao_id a essas tabelas.
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
