import { describe, it, expect, vi, beforeEach } from "vitest";
import { isValidOperation } from "../../services/sync-push.service";

// Prevent @espoa/database from trying to connect to a real DB
vi.mock("@espoa/database", () => ({
  db: {},
  syncQueue: {},
  associado: {},
  ata: {},
  mensalidade: {},
  producao: {},
  transacaoFinanceira: {},
}));

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
});
