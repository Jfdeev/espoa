import { db } from "../database/db";
import type { Associado } from "../database/types";
import { getDeviceId } from "@/lib/device-id";
import { enqueueSyncOperation } from "@/sync/enqueue";

export type CreateAssociadoInput = Omit<
  Associado,
  "id" | "version" | "updated_at" | "deleted_at" | "device_id"
>;

export type UpdateAssociadoInput = Partial<
  Omit<Associado, "id" | "version" | "updated_at" | "deleted_at" | "device_id">
>;

export const associadoRepository = {
  async create(data: CreateAssociadoInput): Promise<Associado> {
    const now = new Date().toISOString();
    const record: Associado = {
      ...data,
      id: crypto.randomUUID(),
      version: 1,
      updated_at: now,
      device_id: getDeviceId(),
    };
    await db.transaction("rw", [db.associado, db.sync_queue], async () => {
      await db.associado.add(record);
      await enqueueSyncOperation("associado", record.id!, "create", record as Record<string, unknown>);
    });
    return record;
  },

  async update(id: string, data: UpdateAssociadoInput): Promise<Associado> {
    const existing = await db.associado.get(id);
    if (!existing) throw new Error(`Associado ${id} não encontrado`);

    const updated: Associado = {
      ...existing,
      ...data,
      id,
      version: existing.version + 1,
      updated_at: new Date().toISOString(),
      device_id: getDeviceId(),
    };
    await db.transaction("rw", [db.associado, db.sync_queue], async () => {
      await db.associado.put(updated);
      await enqueueSyncOperation("associado", id, "update", updated as Record<string, unknown>);
    });
    return updated;
  },

  async delete(id: string): Promise<void> {
    const existing = await db.associado.get(id);
    if (!existing) throw new Error(`Associado ${id} não encontrado`);

    const softDeleted: Partial<Associado> = {
      deleted_at: new Date().toISOString(),
      version: existing.version + 1,
      updated_at: new Date().toISOString(),
      device_id: getDeviceId(),
    };
    const fullRecord: Associado = { ...existing, ...softDeleted };

    await db.transaction("rw", [db.associado, db.sync_queue], async () => {
      await db.associado.update(id, softDeleted);
      await enqueueSyncOperation("associado", id, "delete", fullRecord as Record<string, unknown>);
    });
  },

  async list(): Promise<Associado[]> {
    return db.associado
      .filter((record) => !record.deleted_at)
      .toArray();
  },

  async findById(id: string): Promise<Associado | undefined> {
    const record = await db.associado.get(id);
    if (!record || record.deleted_at) return undefined;
    return record;
  },
};
