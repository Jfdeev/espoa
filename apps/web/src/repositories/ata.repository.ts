import { db } from "../database/db";
import type { Ata } from "../database/types";
import { getDeviceId } from "@/lib/device-id";
import { enqueueSyncOperation } from "@/sync/enqueue";

export type CreateAtaInput = Omit<
  Ata,
  "id" | "version" | "updated_at" | "deleted_at" | "device_id"
>;

export type UpdateAtaInput = Partial<
  Omit<Ata, "id" | "version" | "updated_at" | "deleted_at" | "device_id">
>;

export const ataRepository = {
  async create(data: CreateAtaInput): Promise<Ata> {
    const now = new Date().toISOString();
    const record: Ata = {
      ...data,
      id: crypto.randomUUID(),
      version: 1,
      updated_at: now,
      device_id: getDeviceId(),
    };
    await db.transaction("rw", [db.ata, db.sync_queue], async () => {
      await db.ata.add(record);
      await enqueueSyncOperation("ata", record.id!, "create", record as Record<string, unknown>);
    });
    return record;
  },

  async update(id: string, data: UpdateAtaInput): Promise<Ata> {
    const existing = await db.ata.get(id);
    if (!existing) throw new Error(`Ata ${id} não encontrada`);

    const updated: Ata = {
      ...existing,
      ...data,
      id,
      version: existing.version + 1,
      updated_at: new Date().toISOString(),
      device_id: getDeviceId(),
    };
    await db.transaction("rw", [db.ata, db.sync_queue], async () => {
      await db.ata.put(updated);
      await enqueueSyncOperation("ata", id, "update", updated as Record<string, unknown>);
    });
    return updated;
  },

  async delete(id: string): Promise<void> {
    const existing = await db.ata.get(id);
    if (!existing) throw new Error(`Ata ${id} não encontrada`);

    const softDeleted: Partial<Ata> = {
      deleted_at: new Date().toISOString(),
      version: existing.version + 1,
      updated_at: new Date().toISOString(),
      device_id: getDeviceId(),
    };
    const fullRecord: Ata = { ...existing, ...softDeleted };

    await db.transaction("rw", [db.ata, db.sync_queue], async () => {
      await db.ata.update(id, softDeleted);
      await enqueueSyncOperation("ata", id, "delete", fullRecord as Record<string, unknown>);
    });
  },

  async list(): Promise<Ata[]> {
    return db.ata
      .filter((record) => !record.deleted_at)
      .reverse()
      .sortBy("data");
  },

  async findById(id: string): Promise<Ata | undefined> {
    const record = await db.ata.get(id);
    if (!record || record.deleted_at) return undefined;
    return record;
  },
};
