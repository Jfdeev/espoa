import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

// ── Mocks globais ─────────────────────────────────────────────────────────────

vi.mock("../../middleware/auth.middleware", () => ({
  requireAuth: vi.fn((_req: any, _res: any, next: any) => {
    _req.userId = "test-user-id";
    _req.email = "test@test.com";
    next();
  }),
}));

vi.mock("../../middleware/associacao.guard", () => ({
  ensureUserIsMember: vi.fn().mockResolvedValue(true),
}));

vi.mock("../../services/pnae-report.service", () => ({
  getPnaeReport: vi.fn(),
}));

// Stubs dos demais módulos usados por create-app
vi.mock("../../controllers/auth.controller", () => ({
  register: vi.fn(),
  login: vi.fn(),
  googleAuth: vi.fn(),
  forgotPassword: vi.fn(),
  resetPassword: vi.fn(),
  verifyEmail: vi.fn(),
  getMe: vi.fn(),
  updateProfile: vi.fn(),
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

// ── Imports (após mocks) ──────────────────────────────────────────────────────

import { app } from "../../create-app";
import { ensureUserIsMember } from "../../middleware/associacao.guard";
import { getPnaeReport } from "../../services/pnae-report.service";

const mockGuard = vi.mocked(ensureUserIsMember);
const mockPnae = vi.mocked(getPnaeReport);

const ASSOC_ID = "assoc-uuid-001";
const EDITAL_ID = "edital-uuid-001";

function makeReport() {
  return {
    data: {
      associacaoId: ASSOC_ID,
      generatedAt: new Date().toISOString(),
      edital: { id: EDITAL_ID, titulo: "Chamada PNAE 2026" },
      resumoExecutivo: "Relatorio de apoio...",
      prontidao: {
        nivel: "media" as const,
        coberturaMedia: 0,
        produtosAtendidos: 0,
        produtosTotal: 0,
      },
      matching: [],
      secoes: [{ id: "x", titulo: "X", conteudo: "..." }],
      alertas: [],
      textoRelatorio: "RELATORIO DE APOIO PNAE",
      snapshot: {} as any,
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGuard.mockResolvedValue(true);
});

describe("GET /pnae-report", () => {
  it("retorna 400 quando associacao_id está ausente", async () => {
    const res = await request(app)
      .get("/pnae-report")
      .query({ edital_id: EDITAL_ID });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("associacao_id_obrigatorio");
  });

  it("retorna 400 quando edital_id está ausente", async () => {
    const res = await request(app)
      .get("/pnae-report")
      .query({ associacao_id: ASSOC_ID });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("edital_id_obrigatorio");
  });

  it("retorna 400 com periodo=personalizado sem datas", async () => {
    const res = await request(app)
      .get("/pnae-report")
      .query({
        associacao_id: ASSOC_ID,
        edital_id: EDITAL_ID,
        periodo: "personalizado",
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("periodo_invalido");
  });

  it("retorna 403 quando usuário não é membro", async () => {
    mockGuard.mockResolvedValue(false);
    const res = await request(app)
      .get("/pnae-report")
      .query({ associacao_id: ASSOC_ID, edital_id: EDITAL_ID });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("acesso_negado");
  });

  it("retorna 404 quando o edital não pertence à associação", async () => {
    mockPnae.mockResolvedValue({ error: "edital_nao_encontrado" } as any);
    const res = await request(app)
      .get("/pnae-report")
      .query({ associacao_id: ASSOC_ID, edital_id: EDITAL_ID });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("edital_nao_encontrado");
  });

  it("retorna 200 com o relatório de apoio", async () => {
    mockPnae.mockResolvedValue(makeReport() as any);
    const res = await request(app)
      .get("/pnae-report")
      .query({ associacao_id: ASSOC_ID, edital_id: EDITAL_ID });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("resumoExecutivo");
    expect(res.body).toHaveProperty("prontidao");
    expect(res.body).toHaveProperty("textoRelatorio");
  });

  it("retorna 503 quando o serviço de IA está offline", async () => {
    mockPnae.mockRejectedValue(new Error("fetch failed"));
    const res = await request(app)
      .get("/pnae-report")
      .query({ associacao_id: ASSOC_ID, edital_id: EDITAL_ID });
    expect(res.status).toBe(503);
    expect(res.body.error).toBe("ai_offline");
  });
});
