import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { db } from "../../database/db";
import { producaoRepository } from "../../repositories/producao.repository";

beforeEach(async () => {
  await db.delete();
  await db.open();
});

afterAll(async () => {
  await db.close();
});

const associadoId = crypto.randomUUID();
const base = {
  associado_id: associadoId,
  cultura: "Milho",
  quantidade: 500,
  data: "2024-09-10",
};

// ─── create ──────────────────────────────────────────────────────────────────

describe("producaoRepository.create", () => {
  it("inserts and returns record with id and version 1", async () => {
    const record = await producaoRepository.create(base);
    expect(record.id).toBeTruthy();
    expect(record.cultura).toBe("Milho");
    expect(record.version).toBe(1);
    expect(record.updated_at).toBeTruthy();
    expect(record.deleted_at).toBeUndefined();
  });

  it("generates unique ids for distinct records", async () => {
    const a = await producaoRepository.create(base);
    const b = await producaoRepository.create({ ...base, cultura: "Soja" });
    expect(a.id).not.toBe(b.id);
  });

  it("sets device_id on the record", async () => {
    const record = await producaoRepository.create(base);
    expect(record.device_id).toBeTruthy();
  });

  it("enqueues a create operation in sync_queue", async () => {
    const record = await producaoRepository.create(base);
    const queue = await db.sync_queue.toArray();
    expect(queue).toHaveLength(1);
    expect(queue[0].table_name).toBe("producao");
    expect(queue[0].operation).toBe("create");
    expect(queue[0].record_id).toBe(record.id);
    expect(queue[0].synced).toBe(0);
  });

  it("stores full record payload in sync_queue", async () => {
    await producaoRepository.create(base);
    const queue = await db.sync_queue.toArray();
    const payload = JSON.parse(queue[0].payload);
    expect(payload.cultura).toBe("Milho");
    expect(payload.quantidade).toBe(500);
    expect(payload.associado_id).toBe(associadoId);
  });
});

// ─── update ──────────────────────────────────────────────────────────────────

describe("producaoRepository.update", () => {
  it("updates fields and increments version", async () => {
    const created = await producaoRepository.create(base);
    if (!created.id) throw new Error("created.id is undefined");
    const updated = await producaoRepository.update(created.id, { quantidade: 800 });
    expect(updated.quantidade).toBe(800);
    expect(updated.version).toBe(2);
    expect(updated.cultura).toBe("Milho");
  });

  it("preserves associado_id after update", async () => {
    const created = await producaoRepository.create(base);
    const updated = await producaoRepository.update(created.id!, { cultura: "Feijão" });
    expect(updated.associado_id).toBe(associadoId);
  });

  it("refreshes updated_at on mutation", async () => {
    const created = await producaoRepository.create(base);
    const updated = await producaoRepository.update(created.id!, { cultura: "Feijão" });
    expect(new Date(updated.updated_at) >= new Date(created.updated_at)).toBe(true);
  });

  it("throws when record does not exist", async () => {
    await expect(
      producaoRepository.update("missing-id", { quantidade: 10 })
    ).rejects.toThrow();
  });

  it("enqueues an update operation in sync_queue", async () => {
    const created = await producaoRepository.create(base);
    await db.sync_queue.clear();

    await producaoRepository.update(created.id!, { quantidade: 800 });

    const queue = await db.sync_queue.toArray();
    expect(queue).toHaveLength(1);
    expect(queue[0].table_name).toBe("producao");
    expect(queue[0].operation).toBe("update");
    expect(queue[0].record_id).toBe(created.id);
    expect(queue[0].synced).toBe(0);
  });

  it("stores updated fields in sync_queue payload", async () => {
    const created = await producaoRepository.create(base);
    await db.sync_queue.clear();

    await producaoRepository.update(created.id!, { quantidade: 800 });

    const queue = await db.sync_queue.toArray();
    const payload = JSON.parse(queue[0].payload);
    expect(payload.quantidade).toBe(800);
    expect(payload.version).toBe(2);
  });
});

// ─── delete (soft) ───────────────────────────────────────────────────────────

describe("producaoRepository.delete (soft)", () => {
  it("hides record from list and findById after delete", async () => {
    const created = await producaoRepository.create(base);
    await producaoRepository.delete(created.id!);

    expect(await producaoRepository.findById(created.id!)).toBeUndefined();
    expect(await producaoRepository.list()).toHaveLength(0);
  });

  it("preserves row in database with deleted_at set", async () => {
    const created = await producaoRepository.create(base);
    await producaoRepository.delete(created.id!);
    const raw = await db.producao.get(created.id!);
    expect(raw?.deleted_at).toBeTruthy();
  });

  it("increments version on soft delete", async () => {
    const created = await producaoRepository.create(base);
    await producaoRepository.delete(created.id!);
    const raw = await db.producao.get(created.id!);
    expect(raw?.version).toBe(2);
  });

  it("throws when record does not exist", async () => {
    await expect(
      producaoRepository.delete("no-such-id")
    ).rejects.toThrow();
  });

  it("enqueues a delete operation in sync_queue", async () => {
    const created = await producaoRepository.create(base);
    await db.sync_queue.clear();

    await producaoRepository.delete(created.id!);

    const queue = await db.sync_queue.toArray();
    expect(queue).toHaveLength(1);
    expect(queue[0].table_name).toBe("producao");
    expect(queue[0].operation).toBe("delete");
    expect(queue[0].record_id).toBe(created.id);
    expect(queue[0].synced).toBe(0);
  });

  it("stores deleted_at in sync_queue payload", async () => {
    const created = await producaoRepository.create(base);
    await db.sync_queue.clear();

    await producaoRepository.delete(created.id!);

    const queue = await db.sync_queue.toArray();
    const payload = JSON.parse(queue[0].payload);
    expect(payload.deleted_at).toBeTruthy();
    expect(payload.version).toBe(2);
  });
});

// ─── list ────────────────────────────────────────────────────────────────────

describe("producaoRepository.list", () => {
  it("returns only active records", async () => {
    await producaoRepository.create(base);
    const b = await producaoRepository.create({ ...base, cultura: "Soja" });
    await producaoRepository.delete(b.id!);

    const list = await producaoRepository.list();
    expect(list).toHaveLength(1);
    expect(list[0].cultura).toBe("Milho");
  });

  it("returns empty array on empty database", async () => {
    expect(await producaoRepository.list()).toHaveLength(0);
  });

  it("returns empty array when all records are soft-deleted", async () => {
    const a = await producaoRepository.create(base);
    await producaoRepository.delete(a.id!);
    expect(await producaoRepository.list()).toHaveLength(0);
  });
});

// ─── listByAssociado ─────────────────────────────────────────────────────────

describe("producaoRepository.listByAssociado", () => {
  it("returns only records for the given associado", async () => {
    const otherId = crypto.randomUUID();
    await producaoRepository.create(base);
    await producaoRepository.create({ ...base, associado_id: otherId });

    const list = await producaoRepository.listByAssociado(associadoId);
    expect(list).toHaveLength(1);
    expect(list[0].associado_id).toBe(associadoId);
  });

  it("excludes soft-deleted records by associado", async () => {
    const created = await producaoRepository.create(base);
    await producaoRepository.delete(created.id!);
    expect(await producaoRepository.listByAssociado(associadoId)).toHaveLength(0);
  });

  it("returns empty array when associado has no records", async () => {
    expect(
      await producaoRepository.listByAssociado("no-records-id")
    ).toHaveLength(0);
  });
});

// ─── findById ────────────────────────────────────────────────────────────────

describe("producaoRepository.findById", () => {
  it("returns record when found and not deleted", async () => {
    const created = await producaoRepository.create(base);
    const found = await producaoRepository.findById(created.id!);
    expect(found?.id).toBe(created.id);
  });

  it("returns undefined for soft-deleted record", async () => {
    const created = await producaoRepository.create(base);
    await producaoRepository.delete(created.id!);
    expect(await producaoRepository.findById(created.id!)).toBeUndefined();
  });

  it("returns undefined for non-existent id", async () => {
    expect(await producaoRepository.findById("nope")).toBeUndefined();
  });
});
