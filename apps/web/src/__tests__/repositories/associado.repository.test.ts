import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { db } from "../../database/db";
import { associadoRepository } from "../../repositories/associado.repository";

beforeEach(async () => {
  await db.delete();
  await db.open();
});

afterAll(async () => {
  await db.close();
});

const base = {
  nome: "João da Silva",
  status: "ativo",
  data_entrada: "2024-01-15",
};

describe("associadoRepository.create", () => {
  it("inserts and returns the record with generated id and version 1", async () => {
    const record = await associadoRepository.create(base);
    expect(record.id).toBeTruthy();
    expect(record.nome).toBe("João da Silva");
    expect(record.version).toBe(1);
    expect(record.updated_at).toBeTruthy();
    expect(record.deleted_at).toBeUndefined();
  });

  it("generates unique ids for different records", async () => {
    const a = await associadoRepository.create(base);
    const b = await associadoRepository.create({ ...base, nome: "Maria" });
    expect(a.id).not.toBe(b.id);
  });
});

describe("associadoRepository.update", () => {
  it("updates fields and increments version", async () => {
    const created = await associadoRepository.create(base);
    const updated = await associadoRepository.update(created.id!, {
      status: "inativo",
    });
    expect(updated.status).toBe("inativo");
    expect(updated.version).toBe(2);
    expect(updated.nome).toBe("João da Silva");
  });

  it("updates updated_at on each mutation", async () => {
    const created = await associadoRepository.create(base);
    const updated = await associadoRepository.update(created.id!, {
      nome: "João Atualizado",
    });
    expect(new Date(updated.updated_at) >= new Date(created.updated_at!)).toBe(
      true
    );
  });

  it("throws when record does not exist", async () => {
    await expect(
      associadoRepository.update("non-existent-id", { status: "inativo" })
    ).rejects.toThrow();
  });
});

describe("associadoRepository.delete (soft)", () => {
  it("sets deleted_at without removing the row", async () => {
    const created = await associadoRepository.create(base);
    await associadoRepository.delete(created.id!);

    // findById should not return soft-deleted records
    const found = await associadoRepository.findById(created.id!);
    expect(found).toBeUndefined();

    // raw Dexie access confirms row still exists
    const raw = await db.associado.get(created.id!);
    expect(raw?.deleted_at).toBeTruthy();
  });

  it("increments version on soft delete", async () => {
    const created = await associadoRepository.create(base);
    await associadoRepository.delete(created.id!);
    const raw = await db.associado.get(created.id!);
    expect(raw?.version).toBe(2);
  });

  it("throws when record does not exist", async () => {
    await expect(
      associadoRepository.delete("non-existent-id")
    ).rejects.toThrow();
  });
});

describe("associadoRepository.list", () => {
  it("returns only non-deleted records", async () => {
    const a = await associadoRepository.create({ ...base, nome: "A" });
    const b = await associadoRepository.create({ ...base, nome: "B" });
    await associadoRepository.delete(b.id!);

    const list = await associadoRepository.list();
    expect(list).toHaveLength(1);
    expect(list[0].nome).toBe("A");
  });

  it("returns empty array when all records are soft-deleted", async () => {
    const a = await associadoRepository.create(base);
    await associadoRepository.delete(a.id!);
    expect(await associadoRepository.list()).toHaveLength(0);
  });

  it("returns empty array when database is empty", async () => {
    expect(await associadoRepository.list()).toHaveLength(0);
  });
});

describe("associadoRepository.findById", () => {
  it("returns the record when it exists and is not deleted", async () => {
    const created = await associadoRepository.create(base);
    const found = await associadoRepository.findById(created.id!);
    expect(found?.id).toBe(created.id);
  });

  it("returns undefined for a soft-deleted record", async () => {
    const created = await associadoRepository.create(base);
    await associadoRepository.delete(created.id!);
    expect(await associadoRepository.findById(created.id!)).toBeUndefined();
  });

  it("returns undefined for a non-existent id", async () => {
    expect(
      await associadoRepository.findById("does-not-exist")
    ).toBeUndefined();
  });
});
