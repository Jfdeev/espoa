import { db } from "../database/db";
import type { Associacao } from "../database/types";
import { getDeviceId } from "@/lib/device-id";
import { enqueueSyncOperation } from "@/sync/enqueue";

export type CreateAssociacaoInput = Omit<
  Associacao,
  "id" | "version" | "updated_at" | "deleted_at" | "device_id"
>;

export type UpdateAssociacaoInput = Partial<
  Omit<Associacao, "id" | "version" | "updated_at" | "deleted_at" | "device_id">
>;

export const associacaoRepository = {
  /**
   * Cria uma associação localmente com flag pending_server_validation.
   * Usada pelo OnboardingADMPage para criação offline.
   */
  async create(data: CreateAssociacaoInput): Promise<Associacao> {
    const now = new Date().toISOString();
    const record: Associacao = {
      ...data,
      id: crypto.randomUUID(),
      version: 1,
      updated_at: now,
      device_id: getDeviceId(),
    };
    await db.transaction("rw", [db.associacao, db.sync_queue], async () => {
      await db.associacao.add(record);
      await enqueueSyncOperation("associacao", record.id!, "create", record as unknown as Record<string, unknown>);
    });
    return record;
  },

  async update(id: string, data: UpdateAssociacaoInput): Promise<Associacao> {
    const existing = await db.associacao.get(id);
    if (!existing) throw new Error(`Associação ${id} não encontrada`);

    const updated: Associacao = {
      ...existing,
      ...data,
      id,
      version: existing.version + 1,
      updated_at: new Date().toISOString(),
      device_id: getDeviceId(),
    };
    await db.transaction("rw", [db.associacao, db.sync_queue], async () => {
      await db.associacao.put(updated);
      await enqueueSyncOperation("associacao", id, "update", updated as unknown as Record<string, unknown>);
    });
    return updated;
  },

  async delete(id: string): Promise<void> {
    const existing = await db.associacao.get(id);
    if (!existing) throw new Error(`Associação ${id} não encontrada`);

    const softDeleted: Partial<Associacao> = {
      deleted_at: new Date().toISOString(),
      version: existing.version + 1,
      updated_at: new Date().toISOString(),
      device_id: getDeviceId(),
    };
    const fullRecord: Associacao = { ...existing, ...softDeleted };

    await db.transaction("rw", [db.associacao, db.sync_queue], async () => {
      await db.associacao.update(id, softDeleted);
      await enqueueSyncOperation("associacao", id, "delete", fullRecord as unknown as Record<string, unknown>);
    });
  },

  async findById(id: string): Promise<Associacao | undefined> {
    const record = await db.associacao.get(id);
    if (!record || record.deleted_at) return undefined;
    return record;
  },

  async list(): Promise<Associacao[]> {
    return db.associacao.filter((r) => !r.deleted_at).toArray();
  },
};
