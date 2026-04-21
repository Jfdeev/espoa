import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { db } from "../../database/db";
import {
  transacaoRepository,
  mensalidadeRepository,
} from "../../repositories/financeiro.repository";

beforeEach(async () => {
  await db.delete();
  await db.open();
});

afterAll(async () => {
  await db.close();
});

// ─── TransacaoFinanceira ──────────────────────────────────────────────────────

const baseTransacao = {
  tipo: "receita",
  valor: 150.0,
  descricao: "Mensalidade outubro",
  data: "2024-10-01",
};

describe("transacaoRepository.create", () => {
  it("inserts and returns record with id and version 1", async () => {
    const record = await transacaoRepository.create(baseTransacao);
    expect(record.id).toBeTruthy();
    expect(record.tipo).toBe("receita");
    expect(record.version).toBe(1);
    expect(record.deleted_at).toBeUndefined();
  });
});

describe("transacaoRepository.update", () => {
  it("updates fields and bumps version", async () => {
    const created = await transacaoRepository.create(baseTransacao);
    const updated = await transacaoRepository.update(created.id!, {
      valor: 200.0,
    });
    expect(updated.valor).toBe(200.0);
    expect(updated.version).toBe(2);
  });

  it("throws when record does not exist", async () => {
    await expect(
      transacaoRepository.update("no-such-id", { valor: 1 })
    ).rejects.toThrow();
  });
});

describe("transacaoRepository.delete (soft)", () => {
  it("hides record from list and findById after soft delete", async () => {
    const created = await transacaoRepository.create(baseTransacao);
    await transacaoRepository.delete(created.id!);

    expect(await transacaoRepository.findById(created.id!)).toBeUndefined();
    expect(await transacaoRepository.list()).toHaveLength(0);
  });

  it("preserves row in database with deleted_at set", async () => {
    const created = await transacaoRepository.create(baseTransacao);
    await transacaoRepository.delete(created.id!);
    const raw = await db.transacao_financeira.get(created.id!);
    expect(raw?.deleted_at).toBeTruthy();
  });

  it("throws when record does not exist", async () => {
    await expect(transacaoRepository.delete("ghost-id")).rejects.toThrow();
  });
});

describe("transacaoRepository.list", () => {
  it("returns only active records", async () => {
    await transacaoRepository.create({ ...baseTransacao, tipo: "despesa" });
    await transacaoRepository.create(baseTransacao);
    await transacaoRepository.delete(
      (await transacaoRepository.list())[0].id!
    );
    const list = await transacaoRepository.list();
    expect(list).toHaveLength(1);
  });

  it("returns empty array on empty database", async () => {
    expect(await transacaoRepository.list()).toHaveLength(0);
  });
});

// ─── Mensalidade ─────────────────────────────────────────────────────────────

const associadoId = crypto.randomUUID();
const baseMensalidade = {
  associado_id: associadoId,
  valor: 50.0,
  data_pagamento: "2024-10-05",
  forma_pagamento: "pix",
};

describe("mensalidadeRepository.create", () => {
  it("inserts and returns record with id and version 1", async () => {
    const record = await mensalidadeRepository.create(baseMensalidade);
    expect(record.id).toBeTruthy();
    expect(record.associado_id).toBe(associadoId);
    expect(record.version).toBe(1);
  });
});

describe("mensalidadeRepository.update", () => {
  it("updates valor and bumps version", async () => {
    const created = await mensalidadeRepository.create(baseMensalidade);
    const updated = await mensalidadeRepository.update(created.id!, {
      valor: 75.0,
    });
    expect(updated.valor).toBe(75.0);
    expect(updated.version).toBe(2);
  });

  it("throws when record does not exist", async () => {
    await expect(
      mensalidadeRepository.update("missing", { valor: 1 })
    ).rejects.toThrow();
  });
});

describe("mensalidadeRepository.delete (soft)", () => {
  it("soft-deletes and hides from list", async () => {
    const created = await mensalidadeRepository.create(baseMensalidade);
    await mensalidadeRepository.delete(created.id!);
    expect(await mensalidadeRepository.list()).toHaveLength(0);
    const raw = await db.mensalidade.get(created.id!);
    expect(raw?.deleted_at).toBeTruthy();
  });

  it("throws when record does not exist", async () => {
    await expect(mensalidadeRepository.delete("ghost")).rejects.toThrow();
  });
});

describe("mensalidadeRepository.listByAssociado", () => {
  it("returns only records for the given associado", async () => {
    const otherId = crypto.randomUUID();
    await mensalidadeRepository.create(baseMensalidade);
    await mensalidadeRepository.create({
      ...baseMensalidade,
      associado_id: otherId,
    });

    const list = await mensalidadeRepository.listByAssociado(associadoId);
    expect(list).toHaveLength(1);
    expect(list[0].associado_id).toBe(associadoId);
  });

  it("excludes soft-deleted records", async () => {
    const created = await mensalidadeRepository.create(baseMensalidade);
    await mensalidadeRepository.delete(created.id!);
    const list = await mensalidadeRepository.listByAssociado(associadoId);
    expect(list).toHaveLength(0);
  });
});
