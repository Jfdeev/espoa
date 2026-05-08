import { describe, it, expect } from "vitest";
import type { TransacaoFinanceira } from "../../database/types";
import {
  filterTransacoes,
  paginateTransacoes,
  summarizeTransacoes,
  sortTransacoes,
} from "../../lib/financeiro";

function makeTransacao(partial: Partial<TransacaoFinanceira>): TransacaoFinanceira {
  return {
    id: partial.id ?? crypto.randomUUID(),
    tipo: partial.tipo ?? "entrada",
    valor: partial.valor ?? 0,
    descricao: partial.descricao,
    documento: partial.documento,
    data: partial.data ?? "2024-01-01",
    version: partial.version ?? 1,
    updated_at: partial.updated_at ?? "2024-01-01T10:00:00.000Z",
    device_id: partial.device_id,
    deleted_at: partial.deleted_at,
  };
}

describe("summarizeTransacoes", () => {
  it("computes entradas, saidas, and saldo", () => {
    const transacoes = [
      makeTransacao({ tipo: "entrada", valor: 100 }),
      makeTransacao({ tipo: "despesa", valor: 40 }),
      makeTransacao({ tipo: "entrada", valor: 10 }),
    ];

    const resumo = summarizeTransacoes(transacoes);
    expect(resumo.entradas).toBe(110);
    expect(resumo.saidas).toBe(40);
    expect(resumo.saldo).toBe(70);
  });
});

describe("sortTransacoes", () => {
  it("sorts by data desc and updated_at desc", () => {
    const older = makeTransacao({
      id: "older",
      data: "2024-01-01",
      updated_at: "2024-01-01T08:00:00.000Z",
    });
    const sameDayOld = makeTransacao({
      id: "same-day-old",
      data: "2024-01-03",
      updated_at: "2024-01-03T08:00:00.000Z",
    });
    const sameDayNew = makeTransacao({
      id: "same-day-new",
      data: "2024-01-03",
      updated_at: "2024-01-03T12:00:00.000Z",
    });

    const sorted = sortTransacoes([sameDayOld, older, sameDayNew]);
    expect(sorted.map((t) => t.id)).toEqual([
      "same-day-new",
      "same-day-old",
      "older",
    ]);
  });
});

describe("filterTransacoes", () => {
  it("filters by tipo, search, and date range", () => {
    const transacoes = [
      makeTransacao({
        id: "entrada-1",
        tipo: "entrada",
        data: "2024-01-02",
        descricao: "Doacao",
      }),
      makeTransacao({
        id: "saida-1",
        tipo: "despesa",
        data: "2024-01-03",
        documento: "Boleto 123",
      }),
      makeTransacao({
        id: "entrada-2",
        tipo: "entrada",
        data: "2024-02-10",
        descricao: "Venda",
      }),
    ];

    const filtered = filterTransacoes(transacoes, {
      tipo: "entradas",
      busca: "doa",
      dataInicio: "2024-01-01",
      dataFim: "2024-01-31",
    });

    expect(filtered.map((t) => t.id)).toEqual(["entrada-1"]);
  });
});

describe("paginateTransacoes", () => {
  it("paginates and returns total pages", () => {
    const transacoes = Array.from({ length: 25 }, (_, idx) =>
      makeTransacao({ id: `id-${idx}` }),
    );

    const result = paginateTransacoes(transacoes, 2, 10);
    expect(result.totalPages).toBe(3);
    expect(result.safePage).toBe(2);
    expect(result.items).toHaveLength(10);
    expect(result.items[0].id).toBe("id-10");
  });
});
