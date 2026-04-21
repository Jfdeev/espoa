import { db } from "../database/db";
import type { Producao } from "../database/types";

export type CreateProducaoInput = Omit<
  Producao,
  "id" | "version" | "updated_at" | "deleted_at"
>;

export type UpdateProducaoInput = Partial<
  Omit<Producao, "id" | "version" | "updated_at" | "deleted_at">
>;

export const producaoRepository = {
  async create(data: CreateProducaoInput): Promise<Producao> {
    const now = new Date().toISOString();
    const record: Producao = {
      ...data,
      id: crypto.randomUUID(),
      version: 1,
      updated_at: now,
    };
    await db.producao.add(record);
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
    };
    await db.producao.put(updated);
    return updated;
  },

  async delete(id: string): Promise<void> {
    const existing = await db.producao.get(id);
    if (!existing) throw new Error(`Producao ${id} não encontrada`);

    await db.producao.update(id, {
      deleted_at: new Date().toISOString(),
      version: existing.version + 1,
      updated_at: new Date().toISOString(),
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
