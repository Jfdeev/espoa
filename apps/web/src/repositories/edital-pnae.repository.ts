import { db } from "../database/db";
import type { EditalPnae } from "../database/types";
import { getDeviceId } from "@/lib/device-id";
import { enqueueSyncOperation } from "@/sync/enqueue";

export type CreateEditalPnaeInput = Omit<
  EditalPnae,
  "id" | "version" | "updated_at" | "deleted_at" | "device_id" | "created_at"
>;

export type UpdateEditalPnaeInput = Partial<
  Omit<
    EditalPnae,
    "id" | "version" | "updated_at" | "deleted_at" | "device_id" | "created_at" | "associacao_id"
  >
>;

export const editalPnaeRepository = {
  async create(data: CreateEditalPnaeInput): Promise<EditalPnae> {
    const now = new Date().toISOString();
    const record: EditalPnae = {
      ...data,
      id: crypto.randomUUID(),
      version: 1,
      updated_at: now,
      created_at: now,
      device_id: getDeviceId(),
    };
    await db.transaction("rw", [db.edital_pnae, db.sync_queue], async () => {
      await db.edital_pnae.add(record);
      await enqueueSyncOperation(
        "edital_pnae",
        record.id!,
        "create",
        record as unknown as Record<string, unknown>,
      );
    });
    return record;
  },

  async update(id: string, data: UpdateEditalPnaeInput): Promise<EditalPnae> {
    const existing = await db.edital_pnae.get(id);
    if (!existing) throw new Error(`Edital ${id} não encontrado`);

    const updated: EditalPnae = {
      ...existing,
      ...data,
      id,
      version: existing.version + 1,
      updated_at: new Date().toISOString(),
      device_id: getDeviceId(),
    };
    await db.transaction("rw", [db.edital_pnae, db.sync_queue], async () => {
      await db.edital_pnae.put(updated);
      await enqueueSyncOperation(
        "edital_pnae",
        id,
        "update",
        updated as unknown as Record<string, unknown>,
      );
    });
    return updated;
  },

  async delete(id: string): Promise<void> {
    const existing = await db.edital_pnae.get(id);
    if (!existing) throw new Error(`Edital ${id} não encontrado`);

    const softDeleted: Partial<EditalPnae> = {
      deleted_at: new Date().toISOString(),
      version: existing.version + 1,
      updated_at: new Date().toISOString(),
      device_id: getDeviceId(),
    };
    const fullRecord: EditalPnae = { ...existing, ...softDeleted };

    await db.transaction("rw", [db.edital_pnae, db.sync_queue], async () => {
      await db.edital_pnae.update(id, softDeleted);
      await enqueueSyncOperation(
        "edital_pnae",
        id,
        "delete",
        fullRecord as unknown as Record<string, unknown>,
      );
    });
  },

  async list(): Promise<EditalPnae[]> {
    return db.edital_pnae.filter((record) => !record.deleted_at).toArray();
  },

  async listByAssociacao(associacaoId: string): Promise<EditalPnae[]> {
    return db.edital_pnae
      .where("associacao_id")
      .equals(associacaoId)
      .filter((record) => !record.deleted_at)
      .toArray();
  },

  async findById(id: string): Promise<EditalPnae | undefined> {
    const record = await db.edital_pnae.get(id);
    if (!record || record.deleted_at) return undefined;
    return record;
  },
};
