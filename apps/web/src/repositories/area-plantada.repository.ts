import { db } from "../database/db";
import type { AreaPlantada } from "../database/types";
import { getDeviceId } from "@/lib/device-id";
import { enqueueSyncOperation } from "@/sync/enqueue";

export type CreateAreaPlantadaInput = Omit<
  AreaPlantada,
  "id" | "version" | "updated_at" | "deleted_at" | "device_id"
>;

export type UpdateAreaPlantadaInput = Partial<
  Omit<AreaPlantada, "id" | "version" | "updated_at" | "deleted_at" | "device_id">
>;

export const areaPlantadaRepository = {
  async create(data: CreateAreaPlantadaInput): Promise<AreaPlantada> {
    const now = new Date().toISOString();
    const record: AreaPlantada = {
      ...data,
      id: crypto.randomUUID(),
      version: 1,
      updated_at: now,
      device_id: getDeviceId(),
    };
    await db.transaction("rw", [db.area_plantada, db.sync_queue], async () => {
      await db.area_plantada.add(record);
      await enqueueSyncOperation("area_plantada", record.id!, "create", record as unknown as Record<string, unknown>);
    });
    return record;
  },

  async update(id: string, data: UpdateAreaPlantadaInput): Promise<AreaPlantada> {
    const existing = await db.area_plantada.get(id);
    if (!existing) throw new Error(`AreaPlantada ${id} não encontrada`);

    const updated: AreaPlantada = {
      ...existing,
      ...data,
      id,
      version: existing.version + 1,
      updated_at: new Date().toISOString(),
      device_id: getDeviceId(),
    };
    await db.transaction("rw", [db.area_plantada, db.sync_queue], async () => {
      await db.area_plantada.put(updated);
      await enqueueSyncOperation("area_plantada", id, "update", updated as unknown as Record<string, unknown>);
    });
    return updated;
  },

  async delete(id: string): Promise<void> {
    const existing = await db.area_plantada.get(id);
    if (!existing) throw new Error(`AreaPlantada ${id} não encontrada`);

    const softDeleted: Partial<AreaPlantada> = {
      deleted_at: new Date().toISOString(),
      version: existing.version + 1,
      updated_at: new Date().toISOString(),
      device_id: getDeviceId(),
    };
    const fullRecord: AreaPlantada = { ...existing, ...softDeleted };

    await db.transaction("rw", [db.area_plantada, db.sync_queue], async () => {
      await db.area_plantada.update(id, softDeleted);
      await enqueueSyncOperation("area_plantada", id, "delete", fullRecord as unknown as Record<string, unknown>);
    });
  },

  async list(): Promise<AreaPlantada[]> {
    return db.area_plantada
      .filter((record) => !record.deleted_at)
      .toArray();
  },

  async listByAssociado(associadoId: string): Promise<AreaPlantada[]> {
    return db.area_plantada
      .where("associado_id")
      .equals(associadoId)
      .filter((record) => !record.deleted_at)
      .toArray();
  },

  async findById(id: string): Promise<AreaPlantada | undefined> {
    const record = await db.area_plantada.get(id);
    if (!record || record.deleted_at) return undefined;
    return record;
  },
};
