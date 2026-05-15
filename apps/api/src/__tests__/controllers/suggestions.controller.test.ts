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

vi.mock("../../services/suggestions.service", () => ({
  getSuggestions: vi.fn(),
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
import { getSuggestions } from "../../services/suggestions.service";

const mockGuard = vi.mocked(ensureUserIsMember);
const mockSuggestions = vi.mocked(getSuggestions);

const ASSOC_ID = "assoc-uuid-001";

function makeResult() {
  return {
    associacaoId: ASSOC_ID,
    generatedAt: new Date().toISOString(),
    aviso: "Estas sao sugestoes de apoio... a decisao final e sempre da associacao.",
    sugestoes: [
      {
        id: "fin_saldo_negativo",
        area: "financeiro",
        prioridade: "alta",
        titulo: "Recompor o caixa",
        recomendacao: "Considere priorizar a cobranca...",
        justificativa: "O saldo atual esta negativo.",
        apoio: true as const,
      },
    ],
    snapshot: {} as any,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGuard.mockResolvedValue(true);
});

describe("GET /suggestions", () => {
  it("retorna 400 quando associacao_id está ausente", async () => {
    const res = await request(app).get("/suggestions");
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("associacao_id_obrigatorio");
  });

  it("retorna 400 com periodo=personalizado sem datas", async () => {
    const res = await request(app)
      .get("/suggestions")
      .query({ associacao_id: ASSOC_ID, periodo: "personalizado" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("periodo_invalido");
  });

  it("retorna 403 quando usuário não é membro", async () => {
    mockGuard.mockResolvedValue(false);
    const res = await request(app)
      .get("/suggestions")
      .query({ associacao_id: ASSOC_ID });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("acesso_negado");
  });

  it("retorna 200 com sugestões de apoio (aviso + apoio:true)", async () => {
    mockSuggestions.mockResolvedValue(makeResult() as any);
    const res = await request(app)
      .get("/suggestions")
      .query({ associacao_id: ASSOC_ID });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("aviso");
    expect(Array.isArray(res.body.sugestoes)).toBe(true);
    expect(res.body.sugestoes[0].apoio).toBe(true);
  });

  it("retorna 503 quando o serviço de IA está offline", async () => {
    mockSuggestions.mockRejectedValue(new Error("ECONNREFUSED"));
    const res = await request(app)
      .get("/suggestions")
      .query({ associacao_id: ASSOC_ID });
    expect(res.status).toBe(503);
    expect(res.body.error).toBe("ai_offline");
  });
});
