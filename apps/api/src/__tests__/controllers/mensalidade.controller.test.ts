import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

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
}));

vi.mock("../../services/associacao.service", () => ({
  createAssociacao: vi.fn(),
  listAssociacoes: vi.fn(),
  getAssociacao: vi.fn(),
  updateAssociacao: vi.fn(),
  deleteAssociacao: vi.fn(),
}));

vi.mock("../../services/associado.service", () => ({
  createAssociado: vi.fn(),
  listAssociados: vi.fn(),
  getAssociado: vi.fn(),
  updateAssociado: vi.fn(),
  deleteAssociado: vi.fn(),
}));

vi.mock("../../services/mensalidade.service", () => ({
  createMensalidade: vi.fn(),
  listMensalidades: vi.fn(),
  getMensalidade: vi.fn(),
  updateMensalidade: vi.fn(),
  deleteMensalidade: vi.fn(),
}));

vi.mock("../../services/sync.service", () => ({
  runSync: vi.fn(),
}));

import { app } from "../../create-app";
import {
  createMensalidade,
  listMensalidades,
  getMensalidade,
  updateMensalidade,
  deleteMensalidade,
} from "../../services/mensalidade.service";

const mockCreate = vi.mocked(createMensalidade);
const mockList = vi.mocked(listMensalidades);
const mockGet = vi.mocked(getMensalidade);
const mockUpdate = vi.mocked(updateMensalidade);
const mockDelete = vi.mocked(deleteMensalidade);

const sampleMensalidade = {
  id: "mens-111",
  associadoId: "assoc-222",
  valor: 120.5,
  dataPagamento: "2024-01-15",
  formaPagamento: "pix",
  version: 1,
  updatedAt: new Date("2024-01-15"),
  deviceId: null,
  deletedAt: null,
};

describe("POST /mensalidades", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 when associado_id is missing", async () => {
    const res = await request(app).post("/mensalidades").send({ valor: 120.5 });
    expect(res.status).toBe(400);
  });

  it("returns 400 when valor is missing", async () => {
    const res = await request(app)
      .post("/mensalidades")
      .send({ associado_id: "assoc-222" });
    expect(res.status).toBe(400);
  });

  it("returns 400 when valor is null", async () => {
    const res = await request(app)
      .post("/mensalidades")
      .send({ associado_id: "assoc-222", valor: null });
    expect(res.status).toBe(400);
  });

  it("returns 400 when valor is not a finite number", async () => {
    const res = await request(app)
      .post("/mensalidades")
      .send({ associado_id: "assoc-222", valor: "not-a-number" });
    expect(res.status).toBe(400);
  });

  it("returns 400 when valor is Infinity", async () => {
    const res = await request(app)
      .post("/mensalidades")
      .send({ associado_id: "assoc-222", valor: Infinity });
    expect(res.status).toBe(400);
  });

  it("returns 400 when valor is NaN", async () => {
    const res = await request(app)
      .post("/mensalidades")
      .send({ associado_id: "assoc-222", valor: Number.NaN });
    expect(res.status).toBe(400);
  });

  it("returns 400 when associado is invalid", async () => {
    mockCreate.mockResolvedValue({ error: "associado_inexistente" });
    const res = await request(app)
      .post("/mensalidades")
      .send({ associado_id: "assoc-222", valor: 120.5 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("associado_inexistente");
  });

  it("returns 201 on success", async () => {
    mockCreate.mockResolvedValue({ data: sampleMensalidade } as any);
    const res = await request(app).post("/mensalidades").send({
      associado_id: "assoc-222",
      valor: 120.5,
      data_pagamento: "2024-01-15",
      forma_pagamento: "pix",
    });
    expect(res.status).toBe(201);
    expect(res.body.associado_id).toBe("assoc-222");
  });
});

describe("GET /mensalidades", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns list of mensalidades", async () => {
    mockList.mockResolvedValue([sampleMensalidade] as any);
    const res = await request(app).get("/mensalidades");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].associado_id).toBe("assoc-222");
  });
});

describe("GET /mensalidades/:id", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 404 when not found", async () => {
    mockGet.mockResolvedValue(null);
    const res = await request(app).get("/mensalidades/mens-111");
    expect(res.status).toBe(404);
  });

  it("returns mensalidade by id", async () => {
    mockGet.mockResolvedValue(sampleMensalidade as any);
    const res = await request(app).get("/mensalidades/mens-111");
    expect(res.status).toBe(200);
    expect(res.body.associado_id).toBe("assoc-222");
  });
});

describe("PUT /mensalidades/:id", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 404 when not found", async () => {
    mockUpdate.mockResolvedValue({ error: "not_found" });
    const res = await request(app)
      .put("/mensalidades/mens-111")
      .send({ valor: 140 });
    expect(res.status).toBe(404);
  });

  it("returns 400 when associado is invalid", async () => {
    mockUpdate.mockResolvedValue({ error: "associado_inexistente" });
    const res = await request(app)
      .put("/mensalidades/mens-111")
      .send({ associado_id: "assoc-999" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("associado_inexistente");
  });

  it("returns updated mensalidade", async () => {
    mockUpdate.mockResolvedValue({
      data: { ...sampleMensalidade, valor: 150 },
    } as any);
    const res = await request(app)
      .put("/mensalidades/mens-111")
      .send({ valor: 150 });
    expect(res.status).toBe(200);
    expect(res.body.valor).toBe(150);
  });
});

describe("DELETE /mensalidades/:id", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 404 when not found", async () => {
    mockDelete.mockResolvedValue({ error: "not_found" });
    const res = await request(app).delete("/mensalidades/mens-111");
    expect(res.status).toBe(404);
  });

  it("returns deleted confirmation", async () => {
    mockDelete.mockResolvedValue({ data: sampleMensalidade } as any);
    const res = await request(app).delete("/mensalidades/mens-111");
    expect(res.status).toBe(200);
    expect(res.body.deleted).toBe(true);
  });
});
