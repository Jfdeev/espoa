import { describe, it, expect } from "vitest";
import { generateSuggestions } from "../suggestion-analyzers";
import type { FinancialSnapshot, SuggestionsSnapshot } from "../types";

function financeiro(
  overrides: Partial<FinancialSnapshot> = {},
): FinancialSnapshot {
  return {
    associacaoId: "assoc-1",
    generatedAt: "2026-05-15T00:00:00.000Z",
    saldoAtual: 1000,
    totalEntradas: 5000,
    totalSaidas: 4000,
    porMes: [
      { month: "2026-03", entradas: 2000, saidas: 1000, saldo: 1000 },
      { month: "2026-04", entradas: 2000, saidas: 1500, saldo: 500 },
      { month: "2026-05", entradas: 1000, saidas: 1500, saldo: -500 },
    ],
    porTipoSaida: { manutencao: 2000, eventos: 2000 },
    mensalidades: {
      totalAssociadosAtivos: 20,
      pagas: 18,
      pendentes: 2,
      valorRecebido: 1800,
      valorEsperado: 2000,
      taxaInadimplencia: 0.1,
    },
    ...overrides,
  };
}

function snapshot(
  overrides: Partial<SuggestionsSnapshot> = {},
): SuggestionsSnapshot {
  return {
    associacaoId: "assoc-1",
    generatedAt: "2026-05-15T00:00:00.000Z",
    financeiro: financeiro(),
    ...overrides,
  };
}

describe("generateSuggestions — invariantes IA-03", () => {
  it("toda sugestão é apoio (nunca decisão automática) e há aviso", () => {
    const result = generateSuggestions(
      snapshot({ financeiro: financeiro({ saldoAtual: -500 }) }),
    );
    expect(result.aviso).toMatch(/decisao final/i);
    expect(result.sugestoes.length).toBeGreaterThan(0);
    for (const s of result.sugestoes) {
      expect(s.apoio).toBe(true);
      expect(s.recomendacao.length).toBeGreaterThan(0);
      expect(s.justificativa.length).toBeGreaterThan(0);
    }
  });

  it("sempre devolve ao menos a sugestão geral quando nada crítico", () => {
    const result = generateSuggestions(
      snapshot({
        financeiro: financeiro({
          porMes: [
            { month: "2026-03", entradas: 2000, saidas: 1500, saldo: 500 },
            { month: "2026-04", entradas: 2000, saidas: 1500, saldo: 500 },
            { month: "2026-05", entradas: 2000, saidas: 1500, saldo: 500 },
          ],
          porTipoSaida: { manutencao: 1500, eventos: 1500, transporte: 1500 },
        }),
      }),
    );
    expect(result.sugestoes.length).toBeGreaterThanOrEqual(1);
    expect(result.sugestoes.some((s) => s.area === "geral")).toBe(true);
  });

  it("ordena por prioridade (alta antes de média/baixa)", () => {
    const result = generateSuggestions(
      snapshot({
        financeiro: financeiro({
          saldoAtual: -500,
          porTipoSaida: { manutencao: 9000, eventos: 1000 },
          mensalidades: {
            totalAssociadosAtivos: 20,
            pagas: 8,
            pendentes: 12,
            valorRecebido: 800,
            valorEsperado: 2000,
            taxaInadimplencia: 0.6,
          },
        }),
      }),
    );
    const pesos = { alta: 0, media: 1, baixa: 2 };
    const seq = result.sugestoes.map((s) => pesos[s.prioridade]);
    const ordenado = [...seq].sort((a, b) => a - b);
    expect(seq).toEqual(ordenado);
  });
});

describe("generateSuggestions — regras financeiras", () => {
  it("sugere recompor o caixa quando o saldo é negativo", () => {
    const result = generateSuggestions(
      snapshot({ financeiro: financeiro({ saldoAtual: -300 }) }),
    );
    const s = result.sugestoes.find((x) => x.id === "fin_saldo_negativo");
    expect(s).toBeDefined();
    expect(s!.prioridade).toBe("alta");
    expect(s!.area).toBe("financeiro");
  });

  it("sugere revisar categoria de gasto concentrada", () => {
    const result = generateSuggestions(
      snapshot({
        financeiro: financeiro({
          porTipoSaida: { manutencao: 8000, eventos: 2000 },
        }),
      }),
    );
    expect(
      result.sugestoes.some((s) => s.id === "fin_gasto_concentrado"),
    ).toBe(true);
  });

  it("sugere rotina de cobrança em inadimplência alta", () => {
    const result = generateSuggestions(
      snapshot({
        financeiro: financeiro({
          mensalidades: {
            totalAssociadosAtivos: 20,
            pagas: 8,
            pendentes: 12,
            valorRecebido: 800,
            valorEsperado: 2000,
            taxaInadimplencia: 0.6,
          },
        }),
      }),
    );
    const s = result.sugestoes.find((x) => x.id === "mens_inadimplencia_alta");
    expect(s).toBeDefined();
    expect(s!.prioridade).toBe("alta");
  });
});

describe("generateSuggestions — regras de produção e PNAE", () => {
  it("sugere diversificar quando a produção é concentrada", () => {
    const result = generateSuggestions(
      snapshot({
        producao: {
          quantidadeTotal: 1000,
          totalRegistros: 10,
          associadosUnicos: 5,
          culturasUnicas: 1,
          porCultura: [
            { cultura: "Alface", quantidadeTotal: 1000, registros: 10 },
          ],
          porMes: [{ mes: "2026-04", quantidadeTotal: 1000, registros: 10 }],
        },
      }),
    );
    expect(result.sugestoes.some((s) => s.id === "prod_concentrada")).toBe(
      true,
    );
  });

  it("alerta quando há edital aberto mas nenhuma produção", () => {
    const result = generateSuggestions(
      snapshot({
        editaisAbertos: 3,
        producao: {
          quantidadeTotal: 0,
          totalRegistros: 0,
          associadosUnicos: 0,
          culturasUnicas: 0,
          porCultura: [],
          porMes: [],
        },
      }),
    );
    const s = result.sugestoes.find((x) => x.id === "pnae_sem_producao");
    expect(s).toBeDefined();
    expect(s!.area).toBe("pnae");
    expect(s!.prioridade).toBe("alta");
  });
});
