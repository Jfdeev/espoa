import { describe, it, expect, vi, beforeEach } from "vitest";
import { runSync } from "../../services/sync.service";

vi.mock("../../services/sync-push.service", () => ({
  applyPushOperations: vi.fn(),
}));

vi.mock("../../services/sync-pull.service", () => ({
  pullRowsByTable: vi.fn(),
}));

import { applyPushOperations } from "../../services/sync-push.service";
import { pullRowsByTable } from "../../services/sync-pull.service";

const mockPulled = {
  associado: [{ id: "1", nome: "João" }],
  mensalidade: [],
  transacao_financeira: [],
  ata: [],
  producao: [],
};

describe("runSync", () => {
  beforeEach(() => {
    vi.mocked(applyPushOperations).mockResolvedValue(["op-1", "op-2"]);
    vi.mocked(pullRowsByTable).mockResolvedValue(mockPulled as any);
  });

  it("returns ackedOperationIds from applyPushOperations", async () => {
    const result = await runSync({
      deviceId: "device-1",
      push: [],
      lastPulledAt: null,
    });
    expect(result.ackedOperationIds).toEqual(["op-1", "op-2"]);
  });

  it("returns pulled data from pullRowsByTable", async () => {
    const result = await runSync({
      deviceId: "device-1",
      push: [],
      lastPulledAt: null,
    });
    expect(result.pulled).toEqual(mockPulled);
  });

  it("returns serverTime and nextPullCursor as valid ISO strings", async () => {
    const result = await runSync({
      deviceId: "device-1",
      push: [],
      lastPulledAt: null,
    });
    expect(new Date(result.serverTime).toISOString()).toBe(result.serverTime);
    expect(new Date(result.nextPullCursor).toISOString()).toBe(
      result.nextPullCursor
    );
  });

  it("passes deviceId and push array to applyPushOperations", async () => {
    const push = [
      {
        operationId: "op-1",
        tableName: "associado" as const,
        operation: "create" as const,
        recordId: "rec-1",
        payload: { nome: "Ana" },
      },
    ];
    await runSync({ deviceId: "device-42", push, lastPulledAt: null });
    expect(applyPushOperations).toHaveBeenCalledWith("device-42", push);
  });

  it("passes lastPulledAt to pullRowsByTable", async () => {
    const date = new Date("2024-06-01T00:00:00.000Z");
    await runSync({ deviceId: "d1", push: [], lastPulledAt: date });
    expect(pullRowsByTable).toHaveBeenCalledWith(date);
  });

  it("propagates errors thrown by applyPushOperations", async () => {
    vi.mocked(applyPushOperations).mockRejectedValue(new Error("push failed"));
    await expect(
      runSync({ deviceId: "d1", push: [], lastPulledAt: null })
    ).rejects.toThrow("push failed");
  });
});
