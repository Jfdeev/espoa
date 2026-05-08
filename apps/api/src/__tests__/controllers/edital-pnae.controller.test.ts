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
  listarVinculosAssociacao: vi.fn(),
  alterarRoleVinculo: vi.fn(),
  convidarMembro: vi.fn(),
  responderConvite: vi.fn(),
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

vi.mock("../../services/edital-pnae.service", () => ({
  createEditalPnae: vi.fn(),
  listEditaisPnae: vi.fn(),
  getEditalPnae: vi.fn(),
  updateEditalPnae: vi.fn(),
  deleteEditalPnae: vi.fn(),
}));

import { app } from "../../create-app";
import {
  createEditalPnae,
  listEditaisPnae,
  getEditalPnae,
  updateEditalPnae,
  deleteEditalPnae,
} from "../../services/edital-pnae.service";

const mockCreate = vi.mocked(createEditalPnae);
const mockList = vi.mocked(listEditaisPnae);
const mockGet = vi.mocked(getEditalPnae);
const mockUpdate = vi.mocked(updateEditalPnae);
const mockDelete = vi.mocked(deleteEditalPnae);

const sampleEdital = {
  id: "ed-001",
  associacaoId: "assoc-001",
  titulo: "Chamada Pública 001/2026 — Itaú de Minas",
  numeroEdital: "001/2026",
  orgaoResponsavel: "Prefeitura Municipal",
  descricao: "Aquisição de hortaliças para alimentação escolar",
  municipio: "Itaú de Minas",
  estado: "MG",
  dataAbertura: "2026-04-01",
  dataLimite: "2026-05-15",
  valorTotalEstimado: 50000,
  linkOriginal: "https://example.gov.br/edital-001-2026.pdf",
  observacoesInternas: null,
  status: "aberto",
  createdBy: "test-user-id",
  createdAt: new Date("2026-04-02"),
  version: 1,
  updatedAt: new Date("2026-04-02"),
  deviceId: null,
  deletedAt: null,
};

describe("POST /manage/editais-pnae", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 when associacao_id is missing", async () => {
    const res = await request(app)
      .post("/manage/editais-pnae")
      .send({ titulo: "X", data_limite: "2026-05-15" });
    expect(res.status).toBe(400);
  });

  it("returns 400 when titulo is missing", async () => {
    const res = await request(app)
      .post("/manage/editais-pnae")
      .send({ associacao_id: "assoc-001", data_limite: "2026-05-15" });
    expect(res.status).toBe(400);
  });

  it("returns 400 when data_limite is missing", async () => {
    const res = await request(app)
      .post("/manage/editais-pnae")
      .send({ associacao_id: "assoc-001", titulo: "X" });
    expect(res.status).toBe(400);
  });

  it("returns 201 on success and returns body in snake_case", async () => {
    mockCreate.mockResolvedValue({ data: sampleEdital } as any);
    const res = await request(app)
      .post("/manage/editais-pnae")
      .send({
        associacao_id: "assoc-001",
        titulo: "Chamada Pública 001/2026 — Itaú de Minas",
        data_limite: "2026-05-15",
        municipio: "Itaú de Minas",
        estado: "MG",
      });
    expect(res.status).toBe(201);
    expect(res.body.titulo).toBe("Chamada Pública 001/2026 — Itaú de Minas");
    expect(res.body.associacao_id).toBe("assoc-001");
    expect(res.body.data_limite).toBe("2026-05-15");
  });

  it("captures createdBy from authenticated user", async () => {
    mockCreate.mockResolvedValue({ data: sampleEdital } as any);
    await request(app)
      .post("/manage/editais-pnae")
      .send({
        associacao_id: "assoc-001",
        titulo: "X",
        data_limite: "2026-05-15",
      });
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ createdBy: "test-user-id" }),
    );
  });
});

describe("GET /manage/editais-pnae", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns list of editais", async () => {
    mockList.mockResolvedValue([sampleEdital] as any);
    const res = await request(app).get("/manage/editais-pnae");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].titulo).toBe(
      "Chamada Pública 001/2026 — Itaú de Minas",
    );
  });

  it("forwards filters from querystring to service", async () => {
    mockList.mockResolvedValue([] as any);
    await request(app).get(
      "/manage/editais-pnae?associacao_id=assoc-001&status=aberto&municipio=Itaú%20de%20Minas",
    );
    expect(mockList).toHaveBeenCalledWith({
      associacaoId: "assoc-001",
      status: "aberto",
      municipio: "Itaú de Minas",
    });
  });

  it("calls service with empty filters when no querystring", async () => {
    mockList.mockResolvedValue([] as any);
    await request(app).get("/manage/editais-pnae");
    expect(mockList).toHaveBeenCalledWith({
      associacaoId: undefined,
      status: undefined,
      municipio: undefined,
    });
  });
});

describe("GET /manage/editais-pnae/:id", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 404 when not found", async () => {
    mockGet.mockResolvedValue(null);
    const res = await request(app).get("/manage/editais-pnae/ed-001");
    expect(res.status).toBe(404);
  });

  it("returns edital by id", async () => {
    mockGet.mockResolvedValue(sampleEdital as any);
    const res = await request(app).get("/manage/editais-pnae/ed-001");
    expect(res.status).toBe(200);
    expect(res.body.id).toBe("ed-001");
  });
});

describe("PUT /manage/editais-pnae/:id", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 404 when not found", async () => {
    mockUpdate.mockResolvedValue({ error: "not_found" });
    const res = await request(app)
      .put("/manage/editais-pnae/ed-001")
      .send({ status: "encerrado" });
    expect(res.status).toBe(404);
  });

  it("returns updated edital", async () => {
    mockUpdate.mockResolvedValue({
      data: { ...sampleEdital, status: "encerrado" },
    } as any);
    const res = await request(app)
      .put("/manage/editais-pnae/ed-001")
      .send({ status: "encerrado" });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("encerrado");
  });
});

describe("DELETE /manage/editais-pnae/:id", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 404 when not found", async () => {
    mockDelete.mockResolvedValue({ error: "not_found" });
    const res = await request(app).delete("/manage/editais-pnae/ed-001");
    expect(res.status).toBe(404);
  });

  it("returns deleted confirmation", async () => {
    mockDelete.mockResolvedValue({ data: sampleEdital } as any);
    const res = await request(app).delete("/manage/editais-pnae/ed-001");
    expect(res.status).toBe(200);
    expect(res.body.deleted).toBe(true);
    expect(res.body.id).toBe("ed-001");
  });
});
