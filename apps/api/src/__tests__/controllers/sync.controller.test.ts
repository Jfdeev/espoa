import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../create-app";

// Mock the entire service chain so @espoa/database is never loaded
vi.mock("../../services/sync.service", () => ({
  runSync: vi.fn(),
}));

import { runSync } from "../../services/sync.service";

const mockRunSync = vi.mocked(runSync);

const mockSyncResult = {
  ackedOperationIds: ["op-1"],
  pulled: {
    associado: [],
    mensalidade: [],
    transacao_financeira: [],
    ata: [],
    producao: [],
  },
  serverTime: "2024-01-01T00:00:00.000Z",
  nextPullCursor: "2024-01-01T00:00:00.000Z",
};

describe("GET /health", () => {
  it("returns 200 with status ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});

describe("POST /sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when deviceId is absent", async () => {
    const res = await request(app).post("/sync").send({});
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "deviceId is required" });
  });

  it("returns 200 with sync result on success", async () => {
    mockRunSync.mockResolvedValue(mockSyncResult);
    const res = await request(app)
      .post("/sync")
      .send({ deviceId: "device-1" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ackedOperationIds: ["op-1"] });
  });

  it("defaults push to [] when not an array", async () => {
    mockRunSync.mockResolvedValue(mockSyncResult);
    await request(app)
      .post("/sync")
      .send({ deviceId: "d1", push: "invalid" });
    expect(mockRunSync).toHaveBeenCalledWith(
      expect.objectContaining({ push: [] })
    );
  });

  it("defaults lastPulledAt to null for an unparseable date string", async () => {
    mockRunSync.mockResolvedValue(mockSyncResult);
    await request(app)
      .post("/sync")
      .send({ deviceId: "d1", lastPulledAt: "not-a-date" });
    expect(mockRunSync).toHaveBeenCalledWith(
      expect.objectContaining({ lastPulledAt: null })
    );
  });

  it("defaults lastPulledAt to null when omitted", async () => {
    mockRunSync.mockResolvedValue(mockSyncResult);
    await request(app).post("/sync").send({ deviceId: "d1" });
    expect(mockRunSync).toHaveBeenCalledWith(
      expect.objectContaining({ lastPulledAt: null })
    );
  });

  it("parses a valid ISO lastPulledAt into a Date", async () => {
    mockRunSync.mockResolvedValue(mockSyncResult);
    const iso = "2024-06-01T00:00:00.000Z";
    await request(app)
      .post("/sync")
      .send({ deviceId: "d1", lastPulledAt: iso });
    expect(mockRunSync).toHaveBeenCalledWith(
      expect.objectContaining({ lastPulledAt: expect.any(Date) })
    );
  });

  it("returns 500 when runSync throws", async () => {
    mockRunSync.mockRejectedValue(new Error("DB exploded"));
    const res = await request(app).post("/sync").send({ deviceId: "d1" });
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "sync_failed" });
  });
});
