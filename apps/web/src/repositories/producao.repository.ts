import { db } from "../database/db";
import type { Producao } from "../database/types";
import { getDeviceId } from "@/lib/device-id";
import { enqueueSyncOperation } from "@/sync/enqueue";

export type CreateProducaoInput = Omit<
  Producao,
  "id" | "version" | "updated_at" | "deleted_at" | "device_id"
>;

export type UpdateProducaoInput = Partial<
  Omit<Producao, "id" | "version" | "updated_at" | "deleted_at" | "device_id">
>;

export const producaoRepository = {
  async create(data: CreateProducaoInput): Promise<Producao> {
    const now = new Date().toISOString();
    const record: Producao = {
      ...data,
      id: crypto.randomUUID(),
      version: 1,
      updated_at: now,
      device_id: getDeviceId(),
    };
    await db.transaction("rw", [db.producao, db.sync_queue], async () => {
      await db.producao.add(record);
      await enqueueSyncOperation("producao", record.id!, "create", record as unknown as Record<string, unknown>);
    });
    return record;
  },

  async update(id: string, data: UpdateProducaoInput): Promise<Producao> {
    const existing = await db.producao.get(id);
    if (!existing) throw new Error(`Producao ${id} não encontrada`);

    const updated: Producao = {
      ...existing,
      ...data,
      id,
      version: existing.version + 1,
      updated_at: new Date().toISOString(),
      device_id: getDeviceId(),
    };
    await db.transaction("rw", [db.producao, db.sync_queue], async () => {
      await db.producao.put(updated);
      await enqueueSyncOperation("producao", id, "update", updated as unknown as Record<string, unknown>);
    });
    return updated;
  },

  async delete(id: string): Promise<void> {
    const existing = await db.producao.get(id);
    if (!existing) throw new Error(`Producao ${id} não encontrada`);

    const softDeleted: Partial<Producao> = {
      deleted_at: new Date().toISOString(),
      version: existing.version + 1,
      updated_at: new Date().toISOString(),
      device_id: getDeviceId(),
    };
    const fullRecord: Producao = { ...existing, ...softDeleted };

    await db.transaction("rw", [db.producao, db.sync_queue], async () => {
      await db.producao.update(id, softDeleted);
      await enqueueSyncOperation("producao", id, "delete", fullRecord as unknown as Record<string, unknown>);
    });
  },

  async list(): Promise<Producao[]> {
    return db.producao
      .filter((record) => !record.deleted_at)
      .toArray();
  },

  async listByAssociado(associadoId: string): Promise<Producao[]> {
    return db.producao
      .where("associado_id")
      .equals(associadoId)
      .filter((record) => !record.deleted_at)
      .toArray();
  },

  async findById(id: string): Promise<Producao | undefined> {
    const record = await db.producao.get(id);
    if (!record || record.deleted_at) return undefined;
    return record;
  },
};
