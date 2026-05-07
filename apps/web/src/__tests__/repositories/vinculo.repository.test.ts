import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { db } from "../../database/db";
import { vinculoRepository } from "../../repositories/vinculo.repository";

beforeEach(async () => {
  await db.delete();
  await db.open();
});

afterAll(async () => {
  await db.close();
});

async function getAllQueued() {
  return db.sync_queue.toArray();
}

describe("vinculoRepository.aprovar", () => {
  it("enqueues an approve_member intent", async () => {
    await vinculoRepository.aprovar("user-1", "assoc-1");
    const items = await getAllQueued();
    expect(items).toHaveLength(1);
    expect(items[0].table_name).toBe("usuario_associacao");
    expect(items[0].record_id).toBe("user-1");
    expect(items[0].operation).toBe("update");
    expect(items[0].synced).toBe(0);
    const payload = JSON.parse(items[0].payload);
    expect(payload.intent).toBe("approve_member");
    expect(payload.associacao_id).toBe("assoc-1");
  });
});

describe("vinculoRepository.rejeitar", () => {
  it("enqueues a reject_member intent", async () => {
    await vinculoRepository.rejeitar("user-2", "assoc-2");
    const items = await getAllQueued();
    expect(items).toHaveLength(1);
    const payload = JSON.parse(items[0].payload);
    expect(payload.intent).toBe("reject_member");
    expect(payload.associacao_id).toBe("assoc-2");
  });
});

describe("vinculoRepository.alterarRole", () => {
  it("enqueues a change_role intent with the new role", async () => {
    await vinculoRepository.alterarRole("user-3", "assoc-3", "adm");
    const items = await getAllQueued();
    expect(items).toHaveLength(1);
    const payload = JSON.parse(items[0].payload);
    expect(payload.intent).toBe("change_role");
    expect(payload.role).toBe("adm");
    expect(payload.associacao_id).toBe("assoc-3");
  });
});

describe("vinculoRepository.remover", () => {
  it("enqueues a remove_member intent", async () => {
    await vinculoRepository.remover("user-4", "assoc-4");
    const items = await getAllQueued();
    expect(items).toHaveLength(1);
    const payload = JSON.parse(items[0].payload);
    expect(payload.intent).toBe("remove_member");
    expect(payload.associacao_id).toBe("assoc-4");
  });
});

describe("vinculoRepository.responderConvite", () => {
  it("enqueues a respond_invite intent with acao aceitar", async () => {
    await vinculoRepository.responderConvite("user-5", "assoc-5", "aceitar");
    const items = await getAllQueued();
    expect(items).toHaveLength(1);
    expect(items[0].record_id).toBe("user-5");
    const payload = JSON.parse(items[0].payload);
    expect(payload.intent).toBe("respond_invite");
    expect(payload.acao).toBe("aceitar");
    expect(payload.associacao_id).toBe("assoc-5");
  });

  it("enqueues a respond_invite intent with acao recusar", async () => {
    await vinculoRepository.responderConvite("user-6", "assoc-6", "recusar");
    const items = await getAllQueued();
    expect(items).toHaveLength(1);
    const payload = JSON.parse(items[0].payload);
    expect(payload.intent).toBe("respond_invite");
    expect(payload.acao).toBe("recusar");
  });
});

describe("vinculoRepository — general queue behavior", () => {
  it("sets created_at as ISO string", async () => {
    await vinculoRepository.aprovar("user-1", "assoc-1");
    const items = await getAllQueued();
    expect(items[0].created_at).toBeTruthy();
    expect(() => new Date(items[0].created_at)).not.toThrow();
  });

  it("multiple operations create separate queue entries", async () => {
    await vinculoRepository.aprovar("user-1", "assoc-1");
    await vinculoRepository.rejeitar("user-2", "assoc-1");
    await vinculoRepository.remover("user-3", "assoc-1");
    const items = await getAllQueued();
    expect(items).toHaveLength(3);
  });
});
