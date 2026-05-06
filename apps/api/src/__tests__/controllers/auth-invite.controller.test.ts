import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

// ─── Mock auth middleware ────────────────────────────────────────────────────
vi.mock("../../middleware/auth.middleware", () => ({
  requireAuth: vi.fn((_req: any, _res: any, next: any) => {
    _req.userId = "admin-user-id";
    _req.email = "admin@test.com";
    next();
  }),
}));

// ─── Mock @espoa/database ────────────────────────────────────────────────────

const mockSelectResult: any[] = [];
const mockInsertReturning = vi.fn().mockResolvedValue([]);
const mockUpdateReturning = vi.fn().mockResolvedValue([]);

const mockLimit = vi.fn(() => Promise.resolve(mockSelectResult));
const mockWhere = vi.fn(() => ({ limit: mockLimit }));
const mockFrom = vi.fn(() => ({ where: mockWhere }));
const mockSelect = vi.fn(() => ({ from: mockFrom }));

const mockInsertValues = vi.fn(() => ({ returning: mockInsertReturning }));
const mockInsert = vi.fn(() => ({ values: mockInsertValues }));

const mockUpdateWhere = vi.fn(() => ({ returning: mockUpdateReturning }));
const mockUpdateSet = vi.fn(() => ({ where: mockUpdateWhere }));
const mockUpdate = vi.fn(() => ({ set: mockUpdateSet }));

vi.mock("@espoa/database", () => ({
  db: {
    select: (...args: any[]) => mockSelect(...args),
    insert: (...args: any[]) => mockInsert(...args),
    update: (...args: any[]) => mockUpdate(...args),
  },
  usuario: {
    id: "id",
    email: "email",
    passwordHash: "password_hash",
    verificationToken: "verification_token",
    resetToken: "reset_token",
    resetTokenExpiresAt: "reset_token_expires_at",
  },
  associacao: { id: "id" },
  usuarioAssociacao: {
    id: "id",
    usuarioId: "usuario_id",
    associacaoId: "associacao_id",
    status: "status",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((a, b) => ({ eq: [a, b] })),
  and: vi.fn((...args: any[]) => ({ and: args })),
  ilike: vi.fn((a, b) => ({ ilike: [a, b] })),
  or: vi.fn((...args: any[]) => ({ or: args })),
}));

vi.mock("bcryptjs", () => ({
  default: { hash: vi.fn(), compare: vi.fn() },
}));

vi.mock("../../lib/jwt", () => ({
  signToken: vi.fn(() => "mock-token"),
}));

// Mock other services that create-app imports
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
vi.mock("../../services/dashboard.service", () => ({
  getDashboard: vi.fn(),
}));
vi.mock("../../services/mensalidade.service", () => ({
  createMensalidade: vi.fn(),
  listMensalidades: vi.fn(),
  getMensalidade: vi.fn(),
  updateMensalidade: vi.fn(),
  deleteMensalidade: vi.fn(),
}));

import { app } from "../../create-app";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Configure sequential select calls — each call to select() pops the first result */
function setupSelects(...results: any[][]) {
  const queue = [...results];
  mockSelect.mockImplementation(() => ({
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        limit: vi.fn(() => Promise.resolve(queue.shift() ?? [])),
      })),
    })),
  }));
}

// ─── POST /associacoes/:assocId/convidar ─────────────────────────────────────

describe("POST /associacoes/:assocId/convidar", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 when email is missing", async () => {
    const res = await request(app)
      .post("/associacoes/assoc-1/convidar")
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/e-mail/i);
  });

  it("returns 400 when email is invalid", async () => {
    const res = await request(app)
      .post("/associacoes/assoc-1/convidar")
      .send({ email: "not-an-email" });
    expect(res.status).toBe(400);
  });

  it("returns 403 when caller is not admin", async () => {
    // select 1: vinculoAdm → not admin
    setupSelects([{ role: "associado", status: "ativo" }]);

    const res = await request(app)
      .post("/associacoes/assoc-1/convidar")
      .send({ email: "target@test.com" });
    expect(res.status).toBe(403);
  });

  it("returns 403 when caller is admin but not ativo", async () => {
    setupSelects([{ role: "adm", status: "pendente" }]);

    const res = await request(app)
      .post("/associacoes/assoc-1/convidar")
      .send({ email: "target@test.com" });
    expect(res.status).toBe(403);
  });

  it("returns 404 when target user not found", async () => {
    setupSelects(
      [{ role: "adm", status: "ativo" }], // caller is admin
      [],                                   // target user not found
    );

    const res = await request(app)
      .post("/associacoes/assoc-1/convidar")
      .send({ email: "nobody@test.com" });
    expect(res.status).toBe(404);
  });

  it("returns 409 when target is already ativo", async () => {
    setupSelects(
      [{ role: "adm", status: "ativo" }],           // caller is admin
      [{ id: "target-id" }],                          // target user exists
      [{ id: "v-1", status: "ativo" }],               // existing vinculo
    );

    const res = await request(app)
      .post("/associacoes/assoc-1/convidar")
      .send({ email: "target@test.com" });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/membro ativo/i);
  });

  it("returns 409 when target already invited", async () => {
    setupSelects(
      [{ role: "adm", status: "ativo" }],
      [{ id: "target-id" }],
      [{ id: "v-1", status: "convidado" }],
    );

    const res = await request(app)
      .post("/associacoes/assoc-1/convidar")
      .send({ email: "target@test.com" });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/convidado/i);
  });

  it("reactivates an inativo vinculo as convidado", async () => {
    const reactivated = { id: "v-1", status: "convidado" };
    setupSelects(
      [{ role: "adm", status: "ativo" }],
      [{ id: "target-id" }],
      [{ id: "v-1", status: "inativo" }],
    );
    mockUpdateReturning.mockResolvedValue([reactivated]);

    const res = await request(app)
      .post("/associacoes/assoc-1/convidar")
      .send({ email: "target@test.com" });
    expect(res.status).toBe(200);
    expect(res.body.reconvidado).toBe(true);
  });

  it("creates new invitation when no existing vinculo", async () => {
    const newVinculo = { id: "v-new", status: "convidado", role: "associado" };
    setupSelects(
      [{ role: "adm", status: "ativo" }],
      [{ id: "target-id" }],
      [],  // no existing vinculo
    );
    mockInsertReturning.mockResolvedValue([newVinculo]);

    const res = await request(app)
      .post("/associacoes/assoc-1/convidar")
      .send({ email: "target@test.com" });
    expect(res.status).toBe(201);
    expect(res.body.vinculo.status).toBe("convidado");
  });
});

// ─── POST /associacoes/:assocId/responder-convite ────────────────────────────

describe("POST /associacoes/:assocId/responder-convite", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 when acao is missing", async () => {
    const res = await request(app)
      .post("/associacoes/assoc-1/responder-convite")
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/acao/i);
  });

  it("returns 400 when acao is invalid", async () => {
    const res = await request(app)
      .post("/associacoes/assoc-1/responder-convite")
      .send({ acao: "maybe" });
    expect(res.status).toBe(400);
  });

  it("returns 404 when invite not found", async () => {
    setupSelects([]);

    const res = await request(app)
      .post("/associacoes/assoc-1/responder-convite")
      .send({ acao: "aceitar" });
    expect(res.status).toBe(404);
  });

  it("accepts invite and sets status ativo", async () => {
    const atualizado = { id: "v-1", status: "ativo" };
    setupSelects([{ id: "v-1", status: "convidado" }]);
    mockUpdateReturning.mockResolvedValue([atualizado]);

    const res = await request(app)
      .post("/associacoes/assoc-1/responder-convite")
      .send({ acao: "aceitar" });
    expect(res.status).toBe(200);
    expect(res.body.vinculo.status).toBe("ativo");
  });

  it("rejects invite and sets status rejeitado", async () => {
    const atualizado = { id: "v-1", status: "rejeitado" };
    setupSelects([{ id: "v-1", status: "convidado" }]);
    mockUpdateReturning.mockResolvedValue([atualizado]);

    const res = await request(app)
      .post("/associacoes/assoc-1/responder-convite")
      .send({ acao: "recusar" });
    expect(res.status).toBe(200);
    expect(res.body.vinculo.status).toBe("rejeitado");
  });
});
