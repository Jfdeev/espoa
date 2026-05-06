import { db } from "../database/db";
import type { TransacaoFinanceira, Mensalidade } from "../database/types";
import { getDeviceId } from "@/lib/device-id";
import { enqueueSyncOperation } from "@/sync/enqueue";

// ─── TransacaoFinanceira ─────────────────────────────────────────────────────

export type CreateTransacaoInput = Omit<
  TransacaoFinanceira,
  "id" | "version" | "updated_at" | "deleted_at" | "device_id"
>;

export type UpdateTransacaoInput = Partial<
  Omit<TransacaoFinanceira, "id" | "version" | "updated_at" | "deleted_at" | "device_id">
>;

export const transacaoRepository = {
  async create(data: CreateTransacaoInput): Promise<TransacaoFinanceira> {
    const now = new Date().toISOString();
    const record: TransacaoFinanceira = {
      ...data,
      id: crypto.randomUUID(),
      version: 1,
      updated_at: now,
      device_id: getDeviceId(),
    };
    await db.transaction("rw", [db.transacao_financeira, db.sync_queue], async () => {
      await db.transacao_financeira.add(record);
      await enqueueSyncOperation("transacao_financeira", record.id!, "create", record as unknown as Record<string, unknown>);
    });
    return record;
  },

  async update(id: string, data: UpdateTransacaoInput): Promise<TransacaoFinanceira> {
    const existing = await db.transacao_financeira.get(id);
    if (!existing) throw new Error(`TransacaoFinanceira ${id} não encontrada`);

    const updated: TransacaoFinanceira = {
      ...existing,
      ...data,
      id,
      version: existing.version + 1,
      updated_at: new Date().toISOString(),
      device_id: getDeviceId(),
    };
    await db.transaction("rw", [db.transacao_financeira, db.sync_queue], async () => {
      await db.transacao_financeira.put(updated);
      await enqueueSyncOperation("transacao_financeira", id, "update", updated as unknown as Record<string, unknown>);
    });
    return updated;
  },

  async delete(id: string): Promise<void> {
    const existing = await db.transacao_financeira.get(id);
    if (!existing) throw new Error(`TransacaoFinanceira ${id} não encontrada`);

    const softDeleted: Partial<TransacaoFinanceira> = {
      deleted_at: new Date().toISOString(),
      version: existing.version + 1,
      updated_at: new Date().toISOString(),
      device_id: getDeviceId(),
    };
    const fullRecord: TransacaoFinanceira = { ...existing, ...softDeleted };

    await db.transaction("rw", [db.transacao_financeira, db.sync_queue], async () => {
      await db.transacao_financeira.update(id, softDeleted);
      await enqueueSyncOperation("transacao_financeira", id, "delete", fullRecord as unknown as Record<string, unknown>);
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
  "id" | "version" | "updated_at" | "deleted_at" | "device_id"
>;

export type UpdateMensalidadeInput = Partial<
  Omit<Mensalidade, "id" | "version" | "updated_at" | "deleted_at" | "device_id">
>;

export const mensalidadeRepository = {
  async create(data: CreateMensalidadeInput): Promise<Mensalidade> {
    const now = new Date().toISOString();
    const record: Mensalidade = {
      ...data,
      id: crypto.randomUUID(),
      version: 1,
      updated_at: now,
      device_id: getDeviceId(),
    };
    await db.transaction("rw", [db.mensalidade, db.sync_queue], async () => {
      await db.mensalidade.add(record);
      await enqueueSyncOperation("mensalidade", record.id!, "create", record as unknown as Record<string, unknown>);
    });
    return record;
  },

  async update(id: string, data: UpdateMensalidadeInput): Promise<Mensalidade> {
    const existing = await db.mensalidade.get(id);
    if (!existing) throw new Error(`Mensalidade ${id} não encontrada`);

    const updated: Mensalidade = {
      ...existing,
      ...data,
      id,
      version: existing.version + 1,
      updated_at: new Date().toISOString(),
      device_id: getDeviceId(),
    };
    await db.transaction("rw", [db.mensalidade, db.sync_queue], async () => {
      await db.mensalidade.put(updated);
      await enqueueSyncOperation("mensalidade", id, "update", updated as unknown as Record<string, unknown>);
    });
    return updated;
  },

  async delete(id: string): Promise<void> {
    const existing = await db.mensalidade.get(id);
    if (!existing) throw new Error(`Mensalidade ${id} não encontrada`);

    const softDeleted: Partial<Mensalidade> = {
      deleted_at: new Date().toISOString(),
      version: existing.version + 1,
      updated_at: new Date().toISOString(),
      device_id: getDeviceId(),
    };
    const fullRecord: Mensalidade = { ...existing, ...softDeleted };

    await db.transaction("rw", [db.mensalidade, db.sync_queue], async () => {
      await db.mensalidade.update(id, softDeleted);
      await enqueueSyncOperation("mensalidade", id, "delete", fullRecord as unknown as Record<string, unknown>);
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
