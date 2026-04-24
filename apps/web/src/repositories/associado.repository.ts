import { db } from "../database/db";
import type { Associado } from "../database/types";

export type CreateAssociadoInput = Omit<
  Associado,
  "id" | "version" | "updated_at" | "deleted_at"
>;

export type UpdateAssociadoInput = Partial<
  Omit<Associado, "id" | "version" | "updated_at" | "deleted_at">
>;

export const associadoRepository = {
  async create(data: CreateAssociadoInput): Promise<Associado> {
    const now = new Date().toISOString();
    const record: Associado = {
      ...data,
      id: crypto.randomUUID(),
      version: 1,
      updated_at: now,
    };
    await db.associado.add(record);
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
    };
    await db.associado.put(updated);
    return updated;
  },

  async delete(id: string): Promise<void> {
    const existing = await db.associado.get(id);
    if (!existing) throw new Error(`Associado ${id} não encontrado`);

    await db.associado.update(id, {
      deleted_at: new Date().toISOString(),
      version: existing.version + 1,
      updated_at: new Date().toISOString(),
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
