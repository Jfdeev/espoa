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

vi.mock("../../services/sync.service", () => ({
  runSync: vi.fn(),
}));

import { app } from "../../create-app";
import {
  createAssociacao,
  listAssociacoes,
  getAssociacao,
  updateAssociacao,
  deleteAssociacao,
} from "../../services/associacao.service";

const mockCreate = vi.mocked(createAssociacao);
const mockList = vi.mocked(listAssociacoes);
const mockGet = vi.mocked(getAssociacao);
const mockUpdate = vi.mocked(updateAssociacao);
const mockDelete = vi.mocked(deleteAssociacao);

const sampleAssociacao = {
  id: "bbb-222",
  nome: "Associação Rural Vale Verde",
  cnpj: "12.345.678/0001-99",
  municipio: "São Paulo",
  estado: "SP",
  endereco: "Rua Central, 100",
  telefone: "(11) 99999-0000",
  email: "contato@valeverde.org",
  status: "ativa",
  createdBy: "test-user-id",
  createdAt: new Date("2024-01-15"),
  version: 1,
  updatedAt: new Date("2024-01-15"),
  deviceId: null,
  deletedAt: null,
};

describe("POST /manage/associacoes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 when required fields are missing", async () => {
    const res = await request(app).post("/manage/associacoes").send({});
    expect(res.status).toBe(400);
  });

  it("returns 201 on success", async () => {
    mockCreate.mockResolvedValue({ data: sampleAssociacao } as any);
    const res = await request(app)
      .post("/manage/associacoes")
      .send({ nome: "Associação Rural Vale Verde", cnpj: "12.345.678/0001-99", municipio: "São Paulo", estado: "SP" });
    expect(res.status).toBe(201);
    expect(res.body.nome).toBe("Associação Rural Vale Verde");
  });

  it("returns 409 when CNPJ is duplicated", async () => {
    mockCreate.mockResolvedValue({ error: "cnpj_duplicado", existing: "bbb-222" });
    const res = await request(app)
      .post("/manage/associacoes")
      .send({ nome: "Dup", cnpj: "12.345.678/0001-99", municipio: "SP", estado: "SP" });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe("cnpj_duplicado");
  });
});

describe("GET /manage/associacoes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns list of associacoes", async () => {
    mockList.mockResolvedValue([sampleAssociacao] as any);
    const res = await request(app).get("/manage/associacoes");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].nome).toBe("Associação Rural Vale Verde");
  });
});

describe("GET /manage/associacoes/:id", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 404 when not found", async () => {
    mockGet.mockResolvedValue(null);
    const res = await request(app).get("/manage/associacoes/bbb-222");
    expect(res.status).toBe(404);
  });

  it("returns associacao by id", async () => {
    mockGet.mockResolvedValue(sampleAssociacao as any);
    const res = await request(app).get("/manage/associacoes/bbb-222");
    expect(res.status).toBe(200);
    expect(res.body.nome).toBe("Associação Rural Vale Verde");
  });
});

describe("PUT /manage/associacoes/:id", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 404 when not found", async () => {
    mockUpdate.mockResolvedValue({ error: "not_found" });
    const res = await request(app).put("/manage/associacoes/bbb-222").send({ nome: "Novo" });
    expect(res.status).toBe(404);
  });

  it("returns updated associacao", async () => {
    mockUpdate.mockResolvedValue({ data: { ...sampleAssociacao, nome: "Novo" } } as any);
    const res = await request(app).put("/manage/associacoes/bbb-222").send({ nome: "Novo" });
    expect(res.status).toBe(200);
    expect(res.body.nome).toBe("Novo");
  });

  it("returns 409 on CNPJ conflict during update", async () => {
    mockUpdate.mockResolvedValue({ error: "cnpj_duplicado", existing: "ccc-333" });
    const res = await request(app)
      .put("/manage/associacoes/bbb-222")
      .send({ cnpj: "00.000.000/0001-00" });
    expect(res.status).toBe(409);
  });
});

describe("DELETE /manage/associacoes/:id", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 404 when not found", async () => {
    mockDelete.mockResolvedValue({ error: "not_found" });
    const res = await request(app).delete("/manage/associacoes/bbb-222");
    expect(res.status).toBe(404);
  });

  it("returns deleted confirmation", async () => {
    mockDelete.mockResolvedValue({ data: sampleAssociacao } as any);
    const res = await request(app).delete("/manage/associacoes/bbb-222");
    expect(res.status).toBe(200);
    expect(res.body.deleted).toBe(true);
  });
});
