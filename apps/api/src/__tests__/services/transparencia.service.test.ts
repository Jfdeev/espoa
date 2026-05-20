import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock @espoa/database para controlar o que cada select() retorna
const queryQueue: any[][] = [];

function nextResult() {
  return queryQueue.length > 0 ? queryQueue.shift() : [];
}

vi.mock("@espoa/database", () => {
  const db = {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => {
          const result = nextResult();
          // Suporta `.limit(1)` adicional em consultas pontuais (isMembroAtivo)
          const promise: any = Promise.resolve(result);
          promise.limit = vi.fn(() => Promise.resolve(result));
          return promise;
        }),
      })),
    })),
  };
  return {
    db,
    transacaoFinanceira: {
      tipo: "tipo",
      valor: "valor",
      descricao: "descricao",
      data: "data",
      associacaoId: "associacao_id",
      deletedAt: "deleted_at",
    },
    mensalidade: {
      valor: "valor",
      dataPagamento: "data_pagamento",
      usuarioId: "usuario_id",
      associadoId: "associado_id",
      deletedAt: "deleted_at",
    },
    usuarioAssociacao: {
      id: "id",
      usuarioId: "usuario_id",
      associacaoId: "associacao_id",
      status: "status",
    },
    associado: {
      id: "id",
      usuarioId: "usuario_id",
      deletedAt: "deleted_at",
    },
  };
});

vi.mock("drizzle-orm", () => ({
  and: vi.fn((...args: any[]) => ({ and: args })),
  eq: vi.fn((a, b) => ({ eq: [a, b] })),
  gte: vi.fn((a, b) => ({ gte: [a, b] })),
  lte: vi.fn((a, b) => ({ lte: [a, b] })),
  isNull: vi.fn((a) => ({ isNull: a })),
  inArray: vi.fn((a, b) => ({ inArray: [a, b] })),
  or: vi.fn((...args: any[]) => ({ or: args })),
}));

import { getTransparencia } from "../../services/transparencia.service";

const periodo = {
  tipo: "mensal" as const,
  inicio: "2026-05-01",
  fim: "2026-05-31",
};

describe("getTransparencia", () => {
  beforeEach(() => {
    queryQueue.length = 0;
  });

  it("agrega arrecadação e gastos a partir das transações", async () => {
    // 1ª query: transações financeiras
    queryQueue.push([
      { tipo: "entrada", valor: 500, descricao: "Mensalidades", data: "2026-05-02" },
      { tipo: "entrada", valor: 200, descricao: "Doação", data: "2026-05-03" },
      { tipo: "despesa", valor: 100, descricao: "Compra de sementes", data: "2026-05-04" },
      { tipo: "despesa", valor: 50, descricao: "Transporte", data: "2026-05-05" },
    ]);
    // 2ª query: associados do usuário (vazio = sem legado)
    queryQueue.push([]);
    // 3ª query: mensalidades do usuário
    queryQueue.push([{ valor: 50, dataPagamento: "2026-05-02" }]);

    const result = await getTransparencia({
      userId: "user-1",
      associacaoId: "assoc-1",
      periodo,
    });

    expect(result.resumo.totalArrecadado).toBe(700);
    expect(result.resumo.totalGasto).toBe(150);
    expect(result.resumo.saldoPeriodo).toBe(550);
    expect(result.resumo.suaContribuicao).toBe(50);
    expect(result.resumo.percentualContribuicao).toBeCloseTo(7.14, 1);
  });

  it("categoriza gastos por descrição", async () => {
    queryQueue.push([
      { tipo: "despesa", valor: 100, descricao: "Compra de adubo", data: "2026-05-02" },
      { tipo: "despesa", valor: 50, descricao: "Frete do mercado", data: "2026-05-03" },
      { tipo: "despesa", valor: 30, descricao: "Material de escritório", data: "2026-05-04" },
    ]);
    queryQueue.push([]);
    queryQueue.push([]);

    const result = await getTransparencia({
      userId: "user-1",
      associacaoId: "assoc-1",
      periodo,
    });

    const categorias = result.distribuicaoGastos.map((d) => d.categoria);
    expect(categorias).toContain("Materiais e insumos");
    expect(categorias).toContain("Transporte");
    // Ordenado por total desc
    expect(result.distribuicaoGastos[0].total).toBeGreaterThanOrEqual(
      result.distribuicaoGastos[1].total,
    );
  });

  it("inclui mensalidades legadas via associadoId do usuário", async () => {
    queryQueue.push([
      { tipo: "entrada", valor: 1000, descricao: "Mensalidades", data: "2026-05-02" },
    ]);
    // Associados vinculados ao usuário
    queryQueue.push([{ id: "assoc-rec-1" }]);
    // Mensalidades pagas (cobre ambos os caminhos)
    queryQueue.push([
      { valor: 50, dataPagamento: "2026-05-02" },
      { valor: 50, dataPagamento: "2026-05-15" },
    ]);

    const result = await getTransparencia({
      userId: "user-1",
      associacaoId: "assoc-1",
      periodo,
    });

    expect(result.resumo.suaContribuicao).toBe(100);
  });

  it("retorna resumo zerado quando não há transações", async () => {
    queryQueue.push([]); // transações
    queryQueue.push([]); // associados
    queryQueue.push([]); // mensalidades

    const result = await getTransparencia({
      userId: "user-1",
      associacaoId: "assoc-1",
      periodo,
    });

    expect(result.resumo.totalArrecadado).toBe(0);
    expect(result.resumo.totalGasto).toBe(0);
    expect(result.resumo.suaContribuicao).toBe(0);
    expect(result.resumo.percentualContribuicao).toBe(0);
    expect(result.distribuicaoGastos).toEqual([]);
    expect(result.ultimasSaidas).toEqual([]);
  });

  it("limita últimas saídas a 10 e ordena por data desc", async () => {
    const saidas = Array.from({ length: 15 }, (_, i) => ({
      tipo: "despesa",
      valor: 10,
      descricao: "Compra",
      data: `2026-05-${String(i + 1).padStart(2, "0")}`,
    }));
    queryQueue.push(saidas);
    queryQueue.push([]);
    queryQueue.push([]);

    const result = await getTransparencia({
      userId: "user-1",
      associacaoId: "assoc-1",
      periodo,
    });

    expect(result.ultimasSaidas).toHaveLength(10);
    expect(result.ultimasSaidas[0].data).toBe("2026-05-15");
    expect(result.ultimasSaidas[9].data).toBe("2026-05-06");
  });
});
