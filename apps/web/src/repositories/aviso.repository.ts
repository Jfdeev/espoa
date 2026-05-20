import { db } from "../database/db";
import type { Aviso } from "../database/types";
import { getDeviceId } from "@/lib/device-id";
import { enqueueSyncOperation } from "@/sync/enqueue";

export type CreateAvisoInput = Omit<
  Aviso,
  "id" | "version" | "updated_at" | "deleted_at" | "device_id"
>;

export type UpdateAvisoInput = Partial<
  Omit<Aviso, "id" | "version" | "updated_at" | "deleted_at" | "device_id">
>;

export const avisoRepository = {
  async create(data: CreateAvisoInput): Promise<Aviso> {
    const now = new Date().toISOString();
    const record: Aviso = {
      ...data,
      id: crypto.randomUUID(),
      version: 1,
      updated_at: now,
      device_id: getDeviceId(),
    };
    await db.transaction("rw", [db.aviso, db.sync_queue], async () => {
      await db.aviso.add(record);
      await enqueueSyncOperation(
        "aviso",
        record.id!,
        "create",
        record as unknown as Record<string, unknown>,
      );
    });
    return record;
  },

  async update(id: string, data: UpdateAvisoInput): Promise<Aviso> {
    const existing = await db.aviso.get(id);
    if (!existing) throw new Error(`Aviso ${id} não encontrado`);

    const updated: Aviso = {
      ...existing,
      ...data,
      id,
      version: existing.version + 1,
      updated_at: new Date().toISOString(),
      device_id: getDeviceId(),
    };
    await db.transaction("rw", [db.aviso, db.sync_queue], async () => {
      await db.aviso.put(updated);
      await enqueueSyncOperation(
        "aviso",
        id,
        "update",
        updated as unknown as Record<string, unknown>,
      );
    });
    return updated;
  },

  async delete(id: string): Promise<void> {
    const existing = await db.aviso.get(id);
    if (!existing) throw new Error(`Aviso ${id} não encontrado`);

    const softDeleted: Partial<Aviso> = {
      deleted_at: new Date().toISOString(),
      version: existing.version + 1,
      updated_at: new Date().toISOString(),
      device_id: getDeviceId(),
    };
    const fullRecord: Aviso = { ...existing, ...softDeleted };

    await db.transaction("rw", [db.aviso, db.sync_queue], async () => {
      await db.aviso.update(id, softDeleted);
      await enqueueSyncOperation(
        "aviso",
        id,
        "delete",
        fullRecord as unknown as Record<string, unknown>,
      );
    });
  },

  async listByAssociacao(associacaoId: string): Promise<Aviso[]> {
    return db.aviso
      .where("associacao_id")
      .equals(associacaoId)
      .filter((a) => !a.deleted_at)
      .toArray();
  },

  async findById(id: string): Promise<Aviso | undefined> {
    const record = await db.aviso.get(id);
    if (!record || record.deleted_at) return undefined;
    return record;
  },
};

/**
 * Filtra a lista somente com avisos ativos (não expirados).
 * Usado pelo dashboard do membro — admin enxerga avisos expirados também.
 */
export function filterAvisosAtivos(avisos: Aviso[]): Aviso[] {
  const now = Date.now();
  return avisos.filter(
    (a) => !a.expira_em || new Date(a.expira_em).getTime() > now,
  );
}
