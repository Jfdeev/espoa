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

// Guard de membership — aprovado por padrão; sobrescrito em testes de 403
vi.mock("../../middleware/associacao.guard", () => ({
  ensureUserIsMember: vi.fn().mockResolvedValue(true),
}));

// Serviço de relatórios
vi.mock("../../services/relatorios.service", () => ({
  getRelatorioProducao: vi.fn(),
  getRelatorioFinanceiro: vi.fn(),
  getRelatorioMensalidades: vi.fn(),
  getRelatorioAssociados: vi.fn(),
}));

// Stubs dos demais serviços usados por create-app (necessários para montar a app)
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
import {
  getRelatorioProducao,
  getRelatorioFinanceiro,
  getRelatorioMensalidades,
  getRelatorioAssociados,
} from "../../services/relatorios.service";

const mockGuard = vi.mocked(ensureUserIsMember);
const mockProducao = vi.mocked(getRelatorioProducao);
const mockFinanceiro = vi.mocked(getRelatorioFinanceiro);
const mockMensalidades = vi.mocked(getRelatorioMensalidades);
const mockAssociados = vi.mocked(getRelatorioAssociados);

// ── Payload de exemplo ────────────────────────────────────────────────────────

const ASSOC_ID = "assoc-uuid-001";

function makeProducaoResult() {
  return {
    meta: {
      tipo: "producao",
      associacaoId: ASSOC_ID,
      periodo: { tipo: "mensal", inicio: "2026-05-01", fim: "2026-05-31" },
      geradoEm: new Date().toISOString(),
      geradoPor: "test-user-id",
    },
    resumo: { quantidadeTotal: 500, totalRegistros: 10, associadosUnicos: 4, culturasUnicas: 2 },
    agregacoes: { porCultura: [], porAssociado: [], porMes: [] },
    detalhes: [],
  };
}

// ── Testes ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockGuard.mockResolvedValue(true);
});

// ─── /relatorios/producao ───────────────────────────────────────────────────

describe("GET /relatorios/producao", () => {
  it("retorna 400 quando associacao_id está ausente", async () => {
    const res = await request(app).get("/relatorios/producao");
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("associacao_id_obrigatorio");
  });

  it("retorna 400 quando periodo=personalizado sem datas", async () => {
    const res = await request(app)
      .get("/relatorios/producao")
      .query({ associacao_id: ASSOC_ID, periodo: "personalizado" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("periodo_invalido");
  });

  it("retorna 403 quando usuário não é membro", async () => {
    mockGuard.mockResolvedValue(false);
    const res = await request(app)
      .get("/relatorios/producao")
      .query({ associacao_id: ASSOC_ID });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("acesso_negado");
  });

  it("retorna 200 com payload estruturado", async () => {
    const resultado = makeProducaoResult();
    mockProducao.mockResolvedValue(resultado as any);

    const res = await request(app)
      .get("/relatorios/producao")
      .query({ associacao_id: ASSOC_ID, periodo: "mensal" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("meta");
    expect(res.body).toHaveProperty("resumo");
    expect(res.body).toHaveProperty("agregacoes");
    expect(res.body).toHaveProperty("detalhes");
    expect(res.body.meta.tipo).toBe("producao");
  });

  it("retorna 200 com periodo=personalizado e datas válidas", async () => {
    mockProducao.mockResolvedValue(makeProducaoResult() as any);

    const res = await request(app).get("/relatorios/producao").query({
      associacao_id: ASSOC_ID,
      periodo: "personalizado",
      inicio: "2026-01-01",
      fim: "2026-04-30",
    });

    expect(res.status).toBe(200);
    expect(mockProducao).toHaveBeenCalledWith(
      expect.objectContaining({
        associacaoId: ASSOC_ID,
        periodo: expect.objectContaining({ tipo: "personalizado" }),
      }),
    );
  });
});

// ─── /relatorios/financeiro ─────────────────────────────────────────────────

describe("GET /relatorios/financeiro", () => {
  const mockResult = {
    meta: { tipo: "financeiro" },
    resumo: { saldoAtual: 0, totalEntradas: 0, totalSaidas: 0, taxaInadimplencia: 0 },
    agregacoes: { porMes: [], porTipoSaida: {} },
    detalhes: { mensalidades: {} },
  };

  it("retorna 400 sem associacao_id", async () => {
    const res = await request(app).get("/relatorios/financeiro");
    expect(res.status).toBe(400);
  });

  it("retorna 400 com periodo=personalizado sem datas", async () => {
    const res = await request(app)
      .get("/relatorios/financeiro")
      .query({ associacao_id: ASSOC_ID, periodo: "personalizado" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("periodo_invalido");
  });

  it("retorna 403 quando não é membro", async () => {
    mockGuard.mockResolvedValue(false);
    const res = await request(app)
      .get("/relatorios/financeiro")
      .query({ associacao_id: ASSOC_ID });
    expect(res.status).toBe(403);
  });

  it("retorna 200 com payload financeiro", async () => {
    mockFinanceiro.mockResolvedValue(mockResult as any);
    const res = await request(app)
      .get("/relatorios/financeiro")
      .query({ associacao_id: ASSOC_ID });
    expect(res.status).toBe(200);
    expect(res.body.meta.tipo).toBe("financeiro");
  });
});

// ─── /relatorios/mensalidades ───────────────────────────────────────────────

describe("GET /relatorios/mensalidades", () => {
  const mockResult = {
    meta: { tipo: "mensalidades" },
    resumo: { totalRegistros: 5, totalPagas: 3, totalPendentes: 2, taxaInadimplencia: 0.4 },
    agregacoes: { pagasNoPeriodo: 2, valorRecebidoNoPeriodo: 200 },
    detalhes: { pendentes: [] },
  };

  it("retorna 400 sem associacao_id", async () => {
    const res = await request(app).get("/relatorios/mensalidades");
    expect(res.status).toBe(400);
  });

  it("retorna 403 quando não é membro", async () => {
    mockGuard.mockResolvedValue(false);
    const res = await request(app)
      .get("/relatorios/mensalidades")
      .query({ associacao_id: ASSOC_ID });
    expect(res.status).toBe(403);
  });

  it("retorna 200 com resumo de inadimplência", async () => {
    mockMensalidades.mockResolvedValue(mockResult as any);
    const res = await request(app)
      .get("/relatorios/mensalidades")
      .query({ associacao_id: ASSOC_ID });
    expect(res.status).toBe(200);
    expect(res.body.resumo).toHaveProperty("taxaInadimplencia");
  });
});

// ─── /relatorios/associados ─────────────────────────────────────────────────

describe("GET /relatorios/associados", () => {
  const mockResult = {
    meta: { tipo: "associados" },
    resumo: { total: 10, ativos: 8, novosNoPeriodo: 2 },
    agregacoes: { porStatus: [], porComunidade: [] },
    detalhes: [],
  };

  it("retorna 400 sem associacao_id", async () => {
    const res = await request(app).get("/relatorios/associados");
    expect(res.status).toBe(400);
  });

  it("retorna 403 quando não é membro", async () => {
    mockGuard.mockResolvedValue(false);
    const res = await request(app)
      .get("/relatorios/associados")
      .query({ associacao_id: ASSOC_ID });
    expect(res.status).toBe(403);
  });

  it("retorna 200 com resumo de associados", async () => {
    mockAssociados.mockResolvedValue(mockResult as any);
    const res = await request(app)
      .get("/relatorios/associados")
      .query({ associacao_id: ASSOC_ID });
    expect(res.status).toBe(200);
    expect(res.body.resumo.total).toBe(10);
    expect(res.body.resumo.ativos).toBe(8);
  });
});
