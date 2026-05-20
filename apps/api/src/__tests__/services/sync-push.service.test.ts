import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── DB mock ─────────────────────────────────────────────────────────────────

// Tracks update().set() calls for assertions
const updateSetCalls: any[] = [];
// Tracks insert().values() calls for conflict_log assertions  
const conflictLogCalls: any[] = [];
// Controls what select().from().where() resolves to
let selectResult: any[] = [];
// Controls whether syncQueue dedup returns "new" (inserted) or "already exists"
let syncQueueDedupResult: any[] = [{ id: 1 }]; // default: new operation

vi.mock("@espoa/database", () => {
  const db = {
    insert: vi.fn(() => ({
      values: vi.fn((vals: any) => ({
        onConflictDoNothing: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve(syncQueueDedupResult)),
        })),
        // conflict_log insert doesn't use onConflictDoNothing
      })),
    })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve(selectResult)),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn((data: any) => {
        updateSetCalls.push(data);
        return { where: vi.fn().mockResolvedValue(undefined) };
      }),
    })),
  };

  // We need to track conflict_log inserts separately
  // Override insert to detect when it's called for conflict_log (2nd+ call per op)
  let insertCallIdx = 0;
  db.insert = vi.fn(() => {
    insertCallIdx++;
    const currentIdx = insertCallIdx;
    return {
      values: vi.fn((vals: any) => {
        if (currentIdx > 1) {
          // This is a conflict_log insert (after the syncQueue dedup insert)
          conflictLogCalls.push(vals);
          return Promise.resolve(undefined);
        }
        return {
          onConflictDoNothing: vi.fn(() => ({
            returning: vi.fn(() => Promise.resolve(syncQueueDedupResult)),
          })),
        };
      }),
    };
  }) as any;

  // Reset insertCallIdx per-test by exposing a reset fn
  (db as any).__resetInsertIdx = () => { insertCallIdx = 0; };

  return {
    db,
    syncQueue: { id: "id" },
    associado: { id: "id" },
    associacao: { id: "id" },
    usuario: { id: "id" },
    usuarioAssociacao: {
      id: "id",
      usuarioId: "usuario_id",
      associacaoId: "associacao_id",
      status: "status",
    },
    ata: { id: "id" },
    aviso: { id: "id" },
    mensalidade: { id: "id" },
    producao: { id: "id" },
    transacaoFinanceira: { id: "id" },
    editalPnae: { id: "id" },
    conflictLog: { id: "id" },
  };
});

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((a, b) => ({ eq: [a, b] })),
  and: vi.fn((...args: any[]) => ({ and: args })),
  isNull: vi.fn((a) => ({ isNull: a })),
}));

// Authorize-always mock for the new push authz layer — tests in this file
// exercise the apply path; authz is covered separately.
vi.mock("../../services/sync-push.authz", () => ({
  authorizePushOperation: vi.fn(async () => ({ ok: true })),
}));

import { isValidOperation, applyPushOperations } from "../../services/sync-push.service";
import { db } from "@espoa/database";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeOp(overrides: Record<string, any> = {}) {
  return {
    operationId: "op-1",
    tableName: "usuario_associacao",
    operation: "update",
    recordId: "user-123",
    payload: { intent: "approve_member", associacao_id: "assoc-456" },
    ...overrides,
  };
}

// ─── isValidOperation ────────────────────────────────────────────────────────

describe("isValidOperation", () => {
  const valid = {
    operationId: "op-abc-123",
    tableName: "associado" as const,
    operation: "create" as const,
    recordId: "rec-123",
    payload: { nome: "Maria" },
  };

  it("returns true for a complete valid operation", () => {
    expect(isValidOperation(valid)).toBe(true);
  });

  it("returns true for each valid tableName", () => {
    const tables = [
      "associado",
      "mensalidade",
      "transacao_financeira",
      "ata",
      "producao",
    ] as const;
    for (const tableName of tables) {
      expect(isValidOperation({ ...valid, tableName })).toBe(true);
    }
  });

  it("returns false when operationId is empty string", () => {
    expect(isValidOperation({ ...valid, operationId: "" })).toBe(false);
  });

  it("returns false when tableName is not a known sync table", () => {
    expect(
      isValidOperation({ ...valid, tableName: "unknown_table" as any })
    ).toBe(false);
  });

  it("returns false when operation is missing", () => {
    expect(isValidOperation({ ...valid, operation: undefined as any })).toBe(
      false
    );
  });

  it("returns false when recordId is empty string", () => {
    expect(isValidOperation({ ...valid, recordId: "" })).toBe(false);
  });

  it("returns false when payload is absent", () => {
    expect(isValidOperation({ ...valid, payload: undefined as any })).toBe(
      false
    );
  });

  it("returns false for null input", () => {
    expect(isValidOperation(null as any)).toBe(false);
  });

  it("returns false for empty object", () => {
    expect(isValidOperation({})).toBe(false);
  });

  it("returns true for usuario_associacao tableName", () => {
    expect(isValidOperation({ ...valid, tableName: "usuario_associacao" as any })).toBe(true);
  });
});

// ─── applyPushOperations — intent routing ────────────────────────────────────

describe("applyPushOperations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateSetCalls.length = 0;
    conflictLogCalls.length = 0;
    selectResult = [];
    syncQueueDedupResult = [{ id: 1 }];
    (db as any).__resetInsertIdx?.();
  });

  it("skips invalid operations", async () => {
    const result = await applyPushOperations("device-1", [
      { operationId: "", tableName: "" as any, operation: "" as any, recordId: "", payload: null as any },
    ]);
    expect(result).toEqual([]);
  });

  it("deduplicates already-processed operations (still acks)", async () => {
    syncQueueDedupResult = []; // empty = already in sync_queue
    const result = await applyPushOperations("device-1", [makeOp()]);
    expect(result).toEqual(["op-1"]);
  });

  it("acks a valid approve_member operation", async () => {
    selectResult = [{ id: "row-1", status: "pendente", version: 1 }];
    const result = await applyPushOperations("device-1", [makeOp()]);
    expect(result).toEqual(["op-1"]);
  });

  it("calls update with status ativo for approve_member", async () => {
    selectResult = [{ id: "row-1", status: "pendente", version: 1 }];
    await applyPushOperations("device-1", [makeOp()]);
    expect(updateSetCalls).toContainEqual(
      expect.objectContaining({ status: "ativo", version: 2 }),
    );
  });

  it("writes conflict when approve_member on non-pendente", async () => {
    selectResult = [{ id: "row-1", status: "ativo", version: 2 }];
    await applyPushOperations("device-1", [makeOp()]);
    expect(conflictLogCalls.length).toBeGreaterThan(0);
  });

  it("sets status rejeitado for reject_member", async () => {
    selectResult = [{ id: "row-1", status: "pendente", version: 1 }];
    await applyPushOperations("device-1", [
      makeOp({ payload: { intent: "reject_member", associacao_id: "assoc-456" } }),
    ]);
    expect(updateSetCalls).toContainEqual(
      expect.objectContaining({ status: "rejeitado", version: 2 }),
    );
  });

  it("changes role for change_role intent", async () => {
    selectResult = [{ id: "row-1", status: "ativo", version: 1 }];
    await applyPushOperations("device-1", [
      makeOp({
        payload: { intent: "change_role", associacao_id: "assoc-456", role: "adm" },
      }),
    ]);
    expect(updateSetCalls).toContainEqual(
      expect.objectContaining({ role: "adm", version: 2 }),
    );
  });

  it("sets status inativo for remove_member", async () => {
    selectResult = [{ id: "row-1", status: "ativo", version: 3 }];
    await applyPushOperations("device-1", [
      makeOp({ payload: { intent: "remove_member", associacao_id: "assoc-456" } }),
    ]);
    expect(updateSetCalls).toContainEqual(
      expect.objectContaining({ status: "inativo", version: 4 }),
    );
  });

  it("writes conflict for remove_member when already inativo", async () => {
    selectResult = [{ id: "row-1", status: "inativo", version: 5 }];
    await applyPushOperations("device-1", [
      makeOp({ payload: { intent: "remove_member", associacao_id: "assoc-456" } }),
    ]);
    expect(conflictLogCalls.length).toBeGreaterThan(0);
  });

  it("sets status ativo for respond_invite aceitar", async () => {
    selectResult = [{ id: "row-1", status: "convidado", version: 1 }];
    await applyPushOperations("device-1", [
      makeOp({
        payload: { intent: "respond_invite", associacao_id: "assoc-456", acao: "aceitar" },
      }),
    ]);
    expect(updateSetCalls).toContainEqual(
      expect.objectContaining({ status: "ativo", version: 2 }),
    );
  });

  it("sets status rejeitado for respond_invite recusar", async () => {
    selectResult = [{ id: "row-1", status: "convidado", version: 1 }];
    await applyPushOperations("device-1", [
      makeOp({
        payload: { intent: "respond_invite", associacao_id: "assoc-456", acao: "recusar" },
      }),
    ]);
    expect(updateSetCalls).toContainEqual(
      expect.objectContaining({ status: "rejeitado", version: 2 }),
    );
  });

  it("writes conflict for respond_invite when not convidado", async () => {
    selectResult = [{ id: "row-1", status: "ativo", version: 2 }];
    await applyPushOperations("device-1", [
      makeOp({
        payload: { intent: "respond_invite", associacao_id: "assoc-456", acao: "aceitar" },
      }),
    ]);
    expect(conflictLogCalls.length).toBeGreaterThan(0);
  });

  it("writes conflict for record not found", async () => {
    selectResult = [];
    await applyPushOperations("device-1", [makeOp()]);
    expect(conflictLogCalls.length).toBeGreaterThan(0);
  });
});
