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

function postMensalidade(payload: Record<string, unknown>) {
  return request(app).post("/mensalidades").send(payload);
}

function putMensalidade(id: string, payload: Record<string, unknown>) {
  return request(app).put(`/mensalidades/${id}`).send(payload);
}

function expectBadRequest(res: { status: number }) {
  expect(res.status).toBe(400);
}

function expectNotFound(res: { status: number }) {
  expect(res.status).toBe(404);
}

describe("mensalidades controller", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("POST /mensalidades", () => {
    const invalidCases = [
      { name: "associado_id is missing", payload: { valor: 120.5 } },
      { name: "valor is missing", payload: { associado_id: "assoc-222" } },
      {
        name: "valor is null",
        payload: { associado_id: "assoc-222", valor: null },
      },
      {
        name: "valor is not a finite number",
        payload: { associado_id: "assoc-222", valor: "not-a-number" },
      },
      {
        name: "valor is Infinity",
        payload: { associado_id: "assoc-222", valor: Infinity },
      },
      {
        name: "valor is NaN",
        payload: { associado_id: "assoc-222", valor: Number.NaN },
      },
    ];

    invalidCases.forEach(({ name, payload }) => {
      it(`returns 400 when ${name}`, async () => {
        const res = await postMensalidade(payload);
        expectBadRequest(res);
      });
    });

    it("returns 400 when associado is invalid", async () => {
      mockCreate.mockResolvedValue({ error: "associado_inexistente" });
      const res = await postMensalidade({
        associado_id: "assoc-222",
        valor: 120.5,
      });
      expectBadRequest(res);
      expect(res.body.error).toBe("associado_inexistente");
    });

    it("returns 201 on success", async () => {
      mockCreate.mockResolvedValue({ data: sampleMensalidade } as any);
      const res = await postMensalidade({
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
    it("returns list of mensalidades", async () => {
      mockList.mockResolvedValue([sampleMensalidade] as any);
      const res = await request(app).get("/mensalidades");
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].associado_id).toBe("assoc-222");
    });
  });

  describe("GET /mensalidades/:id", () => {
    it("returns 404 when not found", async () => {
      mockGet.mockResolvedValue(null);
      const res = await request(app).get("/mensalidades/mens-111");
      expectNotFound(res);
    });

    it("returns mensalidade by id", async () => {
      mockGet.mockResolvedValue(sampleMensalidade as any);
      const res = await request(app).get("/mensalidades/mens-111");
      expect(res.status).toBe(200);
      expect(res.body.associado_id).toBe("assoc-222");
    });
  });

  describe("PUT /mensalidades/:id", () => {
    it("returns 404 when not found", async () => {
      mockUpdate.mockResolvedValue({ error: "not_found" });
      const res = await putMensalidade("mens-111", { valor: 140 });
      expectNotFound(res);
    });

    it("returns 400 when associado is invalid", async () => {
      mockUpdate.mockResolvedValue({ error: "associado_inexistente" });
      const res = await putMensalidade("mens-111", {
        associado_id: "assoc-999",
      });
      expectBadRequest(res);
      expect(res.body.error).toBe("associado_inexistente");
    });

    it("returns updated mensalidade", async () => {
      mockUpdate.mockResolvedValue({
        data: { ...sampleMensalidade, valor: 150 },
      } as any);
      const res = await putMensalidade("mens-111", { valor: 150 });
      expect(res.status).toBe(200);
      expect(res.body.valor).toBe(150);
    });
  });

  describe("DELETE /mensalidades/:id", () => {
    it("returns 404 when not found", async () => {
      mockDelete.mockResolvedValue({ error: "not_found" });
      const res = await request(app).delete("/mensalidades/mens-111");
      expectNotFound(res);
    });

    it("returns deleted confirmation", async () => {
      mockDelete.mockResolvedValue({ data: sampleMensalidade } as any);
      const res = await request(app).delete("/mensalidades/mens-111");
      expect(res.status).toBe(200);
      expect(res.body.deleted).toBe(true);
    });
  });
});
