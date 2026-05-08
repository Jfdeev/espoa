import { db } from "@/database/db";
import type { SyncTableName, SyncOperationType } from "./types";

/**
 * Adiciona uma operação à fila de sincronização.
 *
 * IMPORTANTE: deve ser chamada DENTRO de uma transação Dexie ativa que
 * inclua `db.sync_queue` nas tabelas participantes.
 * Isso garante atomicidade: ou o registro é gravado E enfileirado, ou nenhum.
 *
 * @example
 * await db.transaction("rw", [db.associado, db.sync_queue], async () => {
 *   await db.associado.add(record);
 *   await enqueueSyncOperation("associado", record.id!, "create", record);
 * });
 */
export async function enqueueSyncOperation(
  tableName: SyncTableName,
  recordId: string,
  operation: SyncOperationType,
  payload: Record<string, unknown>,
): Promise<void> {
  await db.sync_queue.add({
    table_name: tableName,
    record_id: recordId,
    operation,
    payload: JSON.stringify(payload),
    created_at: new Date().toISOString(),
    synced: 0,
  });
}
