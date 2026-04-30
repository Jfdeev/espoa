import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

// Mock auth middleware to always pass through
vi.mock("../../middleware/auth.middleware", () => ({
  requireAuth: vi.fn((_req: any, _res: any, next: any) => {
    _req.userId = "test-user-id";
    _req.email = "test@test.com";
    next();
  }),
}));

vi.mock("../../controllers/auth.controller", () => ({
  register: vi.fn(),
  login: vi.fn(),
  googleAuth: vi.fn(),
  forgotPassword: vi.fn(),
  resetPassword: vi.fn(),
  verifyEmail: vi.fn(),
  getMe: vi.fn(),
  listarAssociacoes: vi.fn(),
  criarAssociacao: vi.fn(),
  solicitarVinculo: vi.fn(),
  gerenciarVinculo: vi.fn(),
  listarVinculosAssociacao: vi.fn(),
  alterarRoleVinculo: vi.fn(),
}));

vi.mock("../../services/sync.service", () => ({
  runSync: vi.fn(),
}));

vi.mock("../../services/associado.service", () => ({
  createAssociado: vi.fn(),
  listAssociados: vi.fn(),
  getAssociado: vi.fn(),
  updateAssociado: vi.fn(),
  deleteAssociado: vi.fn(),
}));

vi.mock("../../services/associacao.service", () => ({
  createAssociacao: vi.fn(),
  listAssociacoes: vi.fn(),
  getAssociacao: vi.fn(),
  updateAssociacao: vi.fn(),
  deleteAssociacao: vi.fn(),
}));

import { app } from "../../create-app";
import { runSync } from "../../services/sync.service";

const mockRunSync = vi.mocked(runSync);

const mockSyncResult = {
  ackedOperationIds: ["op-1"],
  pulled: {
    associado: [],
    associacao: [],
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
