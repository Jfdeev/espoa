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
  createAssociado,
  listAssociados,
  getAssociado,
  updateAssociado,
  deleteAssociado,
} from "../../services/associado.service";

const mockCreate = vi.mocked(createAssociado);
const mockList = vi.mocked(listAssociados);
const mockGet = vi.mocked(getAssociado);
const mockUpdate = vi.mocked(updateAssociado);
const mockDelete = vi.mocked(deleteAssociado);

const sampleAssociado = {
  id: "aaa-111",
  associacaoId: null,
  nome: "João Silva",
  cpf: "123.456.789-00",
  caf: null,
  telefone: null,
  endereco: null,
  comunidade: null,
  contato: null,
  dataEntrada: "2024-01-15",
  status: "ativo",
  version: 1,
  updatedAt: new Date("2024-01-15"),
  deviceId: null,
  deletedAt: null,
};

describe("POST /associados", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 when nome is missing", async () => {
    const res = await request(app).post("/associados").send({});
    expect(res.status).toBe(400);
  });

  it("returns 400 when data_entrada is missing", async () => {
    const res = await request(app).post("/associados").send({ nome: "Test" });
    expect(res.status).toBe(400);
  });

  it("returns 201 on success", async () => {
    mockCreate.mockResolvedValue({ data: sampleAssociado } as any);
    const res = await request(app)
      .post("/associados")
      .send({ nome: "João Silva", data_entrada: "2024-01-15", cpf: "123.456.789-00" });
    expect(res.status).toBe(201);
    expect(res.body.nome).toBe("João Silva");
  });

  it("returns 409 when CPF is duplicated", async () => {
    mockCreate.mockResolvedValue({ error: "cpf_duplicado", existing: "aaa-111" });
    const res = await request(app)
      .post("/associados")
      .send({ nome: "Dup", data_entrada: "2024-01-15", cpf: "123.456.789-00" });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe("cpf_duplicado");
  });
});

describe("GET /associados", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns list of associados", async () => {
    mockList.mockResolvedValue([sampleAssociado] as any);
    const res = await request(app).get("/associados");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].nome).toBe("João Silva");
  });
});

describe("GET /associados/:id", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 404 when not found", async () => {
    mockGet.mockResolvedValue(null);
    const res = await request(app).get("/associados/aaa-111");
    expect(res.status).toBe(404);
  });

  it("returns associado by id", async () => {
    mockGet.mockResolvedValue(sampleAssociado as any);
    const res = await request(app).get("/associados/aaa-111");
    expect(res.status).toBe(200);
    expect(res.body.nome).toBe("João Silva");
  });
});

describe("PUT /associados/:id", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 404 when not found", async () => {
    mockUpdate.mockResolvedValue({ error: "not_found" });
    const res = await request(app).put("/associados/aaa-111").send({ nome: "Novo" });
    expect(res.status).toBe(404);
  });

  it("returns updated associado", async () => {
    mockUpdate.mockResolvedValue({ data: { ...sampleAssociado, nome: "Novo" } } as any);
    const res = await request(app).put("/associados/aaa-111").send({ nome: "Novo" });
    expect(res.status).toBe(200);
    expect(res.body.nome).toBe("Novo");
  });

  it("returns 409 on CPF conflict during update", async () => {
    mockUpdate.mockResolvedValue({ error: "cpf_duplicado", existing: "bbb-222" });
    const res = await request(app)
      .put("/associados/aaa-111")
      .send({ cpf: "999.999.999-99" });
    expect(res.status).toBe(409);
  });
});

describe("DELETE /associados/:id", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 404 when not found", async () => {
    mockDelete.mockResolvedValue({ error: "not_found" });
    const res = await request(app).delete("/associados/aaa-111");
    expect(res.status).toBe(404);
  });

  it("returns deleted confirmation", async () => {
    mockDelete.mockResolvedValue({ data: sampleAssociado } as any);
    const res = await request(app).delete("/associados/aaa-111");
    expect(res.status).toBe(200);
    expect(res.body.deleted).toBe(true);
  });
});
