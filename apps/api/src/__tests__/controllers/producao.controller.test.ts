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

// Mock auth controller (imports @espoa/database directly)
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

vi.mock("../../services/producao.service", () => ({
  createProducao: vi.fn(),
  listProducoes: vi.fn(),
  getProducao: vi.fn(),
  updateProducao: vi.fn(),
  deleteProducao: vi.fn(),
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

vi.mock("../../services/sync.service", () => ({
  runSync: vi.fn(),
}));

import { app } from "../../create-app";
import {
  createProducao,
  listProducoes,
  getProducao,
  updateProducao,
  deleteProducao,
} from "../../services/producao.service";

const mockCreate = vi.mocked(createProducao);
const mockList = vi.mocked(listProducoes);
const mockGet = vi.mocked(getProducao);
const mockUpdate = vi.mocked(updateProducao);
const mockDelete = vi.mocked(deleteProducao);

const sampleProducao = {
  id: "ppp-111",
  associadoId: "aaa-111",
  cultura: "Milho",
  quantidade: 150.5,
  data: "2026-04-29",
  version: 1,
  updatedAt: new Date("2026-04-29"),
  deviceId: null,
  deletedAt: null,
};

const validBody = {
  associado_id: "aaa-111",
  cultura: "Milho",
  quantidade: 150.5,
  data: "2026-04-29",
};

describe("POST /producoes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 when associado_id is missing", async () => {
    const res = await request(app).post("/producoes").send({
      cultura: "Milho",
      quantidade: 150.5,
      data: "2026-04-29",
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 when cultura is missing", async () => {
    const res = await request(app).post("/producoes").send({
      associado_id: "aaa-111",
      quantidade: 150.5,
      data: "2026-04-29",
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 when quantidade is missing", async () => {
    const res = await request(app).post("/producoes").send({
      associado_id: "aaa-111",
      cultura: "Milho",
      data: "2026-04-29",
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 when data is missing", async () => {
    const res = await request(app).post("/producoes").send({
      associado_id: "aaa-111",
      cultura: "Milho",
      quantidade: 150.5,
    });
    expect(res.status).toBe(400);
  });

  it("returns 201 on success", async () => {
    mockCreate.mockResolvedValue({ data: sampleProducao } as any);
    const res = await request(app).post("/producoes").send(validBody);
    expect(res.status).toBe(201);
    expect(res.body.cultura).toBe("Milho");
    expect(res.body.associado_id).toBe("aaa-111");
  });

  it("returns 400 when quantidade is zero", async () => {
    const res = await request(app)
      .post("/producoes")
      .send({ ...validBody, quantidade: 0 });
    expect(res.status).toBe(400);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("returns 400 when quantidade is negative", async () => {
    const res = await request(app)
      .post("/producoes")
      .send({ ...validBody, quantidade: -5 });
    expect(res.status).toBe(400);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("returns 400 when quantidade is not a number", async () => {
    const res = await request(app)
      .post("/producoes")
      .send({ ...validBody, quantidade: "abc" });
    expect(res.status).toBe(400);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("returns 500 when service throws", async () => {
    mockCreate.mockRejectedValue(new Error("db error"));
    const res = await request(app).post("/producoes").send(validBody);
    expect(res.status).toBe(500);
    expect(res.body.error).toBe("create_failed");
  });
});

describe("GET /producoes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns list of producoes", async () => {
    mockList.mockResolvedValue([sampleProducao] as any);
    const res = await request(app).get("/producoes");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].cultura).toBe("Milho");
    expect(res.body[0].associado_id).toBe("aaa-111");
  });

  it("returns empty array when none exist", async () => {
    mockList.mockResolvedValue([] as any);
    const res = await request(app).get("/producoes");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe("GET /producoes/:id", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 404 when not found", async () => {
    mockGet.mockResolvedValue(null as any);
    const res = await request(app).get("/producoes/ppp-111");
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("not_found");
  });

  it("returns producao by id", async () => {
    mockGet.mockResolvedValue(sampleProducao as any);
    const res = await request(app).get("/producoes/ppp-111");
    expect(res.status).toBe(200);
    expect(res.body.id).toBe("ppp-111");
    expect(res.body.cultura).toBe("Milho");
  });
});

describe("PUT /producoes/:id", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 404 when not found", async () => {
    mockUpdate.mockResolvedValue({ error: "not_found" });
    const res = await request(app)
      .put("/producoes/ppp-111")
      .send({ quantidade: 200 });
    expect(res.status).toBe(404);
  });

  it("returns updated producao", async () => {
    mockUpdate.mockResolvedValue({
      data: { ...sampleProducao, quantidade: 200 },
    } as any);
    const res = await request(app)
      .put("/producoes/ppp-111")
      .send({ quantidade: 200 });
    expect(res.status).toBe(200);
    expect(res.body.quantidade).toBe(200);
  });
});

describe("DELETE /producoes/:id", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 404 when not found", async () => {
    mockDelete.mockResolvedValue({ error: "not_found" });
    const res = await request(app).delete("/producoes/ppp-111");
    expect(res.status).toBe(404);
  });

  it("returns deleted confirmation", async () => {
    mockDelete.mockResolvedValue({ data: sampleProducao } as any);
    const res = await request(app).delete("/producoes/ppp-111");
    expect(res.status).toBe(200);
    expect(res.body.deleted).toBe(true);
    expect(res.body.id).toBe("ppp-111");
  });
});
