import { db } from "../database/db";
import type { TransacaoFinanceira, Mensalidade } from "../database/types";

// ─── TransacaoFinanceira ─────────────────────────────────────────────────────

export type CreateTransacaoInput = Omit<
  TransacaoFinanceira,
  "id" | "version" | "updated_at" | "deleted_at"
>;

export type UpdateTransacaoInput = Partial<
  Omit<TransacaoFinanceira, "id" | "version" | "updated_at" | "deleted_at">
>;

export const transacaoRepository = {
  async create(data: CreateTransacaoInput): Promise<TransacaoFinanceira> {
    const now = new Date().toISOString();
    const record: TransacaoFinanceira = {
      ...data,
      id: crypto.randomUUID(),
      version: 1,
      updated_at: now,
    };
    await db.transacao_financeira.add(record);
    return record;
  },

  async update(
    id: string,
    data: UpdateTransacaoInput
  ): Promise<TransacaoFinanceira> {
    const existing = await db.transacao_financeira.get(id);
    if (!existing) throw new Error(`TransacaoFinanceira ${id} não encontrada`);

    const updated: TransacaoFinanceira = {
      ...existing,
      ...data,
      id,
      version: existing.version + 1,
      updated_at: new Date().toISOString(),
    };
    await db.transacao_financeira.put(updated);
    return updated;
  },

  async delete(id: string): Promise<void> {
    const existing = await db.transacao_financeira.get(id);
    if (!existing) throw new Error(`TransacaoFinanceira ${id} não encontrada`);

    await db.transacao_financeira.update(id, {
      deleted_at: new Date().toISOString(),
      version: existing.version + 1,
      updated_at: new Date().toISOString(),
    });
  },

  async list(): Promise<TransacaoFinanceira[]> {
    return db.transacao_financeira
      .filter((record) => !record.deleted_at)
      .toArray();
  },

  async findById(id: string): Promise<TransacaoFinanceira | undefined> {
    const record = await db.transacao_financeira.get(id);
    if (!record || record.deleted_at) return undefined;
    return record;
  },
};

// ─── Mensalidade ─────────────────────────────────────────────────────────────

export type CreateMensalidadeInput = Omit<
  Mensalidade,
  "id" | "version" | "updated_at" | "deleted_at"
>;

export type UpdateMensalidadeInput = Partial<
  Omit<Mensalidade, "id" | "version" | "updated_at" | "deleted_at">
>;

export const mensalidadeRepository = {
  async create(data: CreateMensalidadeInput): Promise<Mensalidade> {
    const now = new Date().toISOString();
    const record: Mensalidade = {
      ...data,
      id: crypto.randomUUID(),
      version: 1,
      updated_at: now,
    };
    await db.mensalidade.add(record);
    return record;
  },

  async update(
    id: string,
    data: UpdateMensalidadeInput
  ): Promise<Mensalidade> {
    const existing = await db.mensalidade.get(id);
    if (!existing) throw new Error(`Mensalidade ${id} não encontrada`);

    const updated: Mensalidade = {
      ...existing,
      ...data,
      id,
      version: existing.version + 1,
      updated_at: new Date().toISOString(),
    };
    await db.mensalidade.put(updated);
    return updated;
  },

  async delete(id: string): Promise<void> {
    const existing = await db.mensalidade.get(id);
    if (!existing) throw new Error(`Mensalidade ${id} não encontrada`);

    await db.mensalidade.update(id, {
      deleted_at: new Date().toISOString(),
      version: existing.version + 1,
      updated_at: new Date().toISOString(),
    });
  },

  async list(): Promise<Mensalidade[]> {
    return db.mensalidade
      .filter((record) => !record.deleted_at)
      .toArray();
  },

  async listByAssociado(associadoId: string): Promise<Mensalidade[]> {
    return db.mensalidade
      .where("associado_id")
      .equals(associadoId)
      .filter((record) => !record.deleted_at)
      .toArray();
  },

  async findById(id: string): Promise<Mensalidade | undefined> {
    const record = await db.mensalidade.get(id);
    if (!record || record.deleted_at) return undefined;
    return record;
  },
};
