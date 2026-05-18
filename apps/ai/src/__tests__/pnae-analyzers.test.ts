import { describe, it, expect } from "vitest";
import { generatePnaeReport } from "../pnae-analyzers";
import type { PnaeReportSnapshot } from "../types";

function baseSnapshot(
  overrides: Partial<PnaeReportSnapshot> = {},
): PnaeReportSnapshot {
  return {
    associacaoId: "assoc-1",
    generatedAt: "2026-05-15T00:00:00.000Z",
    edital: {
      id: "ed-1",
      titulo: "Chamada PNAE 2026",
      dataLimite: "2026-12-31",
      status: "aberto",
      produtos: [
        { produto: "Alface", quantidade: 100, unidade: "kg", precoReferencia: 5 },
        { produto: "Tomate", quantidade: 200, unidade: "kg" },
        { produto: "Cenoura", quantidade: 50, unidade: "kg" },
      ],
    },
    periodo: { inicio: "2026-01-01", fim: "2026-05-15" },
    producao: {
      quantidadeTotal: 230,
      totalRegistros: 12,
      associadosUnicos: 4,
      culturasUnicas: 2,
      porCultura: [
        { cultura: "Alface", quantidadeTotal: 150, registros: 8 },
        { cultura: "Tomate", quantidadeTotal: 80, registros: 4 },
      ],
    },
    ...overrides,
  };
}

describe("generatePnaeReport — matching produção × demanda", () => {
  it("classifica atende / parcial / sem_producao corretamente", () => {
    const report = generatePnaeReport(baseSnapshot());
    const byProduto = Object.fromEntries(
      report.matching.map((m) => [m.produto, m]),
    );

    expect(byProduto["Alface"].status).toBe("atende");
    expect(byProduto["Alface"].surplus).toBe(50);
    expect(byProduto["Tomate"].status).toBe("parcial");
    expect(byProduto["Tomate"].gap).toBe(120);
    expect(byProduto["Cenoura"].status).toBe("sem_producao");
  });

  it("casa culturas ignorando acentos e caixa", () => {
    const report = generatePnaeReport(
      baseSnapshot({
        edital: {
          id: "ed-1",
          titulo: "x",
          dataLimite: "2026-12-31",
          produtos: [{ produto: "ALFACE", quantidade: 100 }],
        },
        producao: {
          quantidadeTotal: 150,
          totalRegistros: 8,
          associadosUnicos: 4,
          culturasUnicas: 1,
          porCultura: [{ cultura: "alface", quantidadeTotal: 150, registros: 8 }],
        },
      }),
    );
    expect(report.matching[0].status).toBe("atende");
  });

  it("calcula valorEstimado como min(demanda, disponivel) × preço", () => {
    const report = generatePnaeReport(baseSnapshot());
    const alface = report.matching.find((m) => m.produto === "Alface")!;
    // demanda 100, disponivel 150, preço 5 → 100 * 5
    expect(alface.valorEstimado).toBe(500);
    const tomate = report.matching.find((m) => m.produto === "Tomate")!;
    expect(tomate.valorEstimado).toBeNull();
  });

  it("computa prontidão a partir da cobertura média", () => {
    const report = generatePnaeReport(baseSnapshot());
    expect(report.prontidao.produtosTotal).toBe(3);
    expect(report.prontidao.produtosAtendidos).toBe(1);
    expect(report.prontidao.coberturaMedia).toBeGreaterThan(0);
    expect(report.prontidao.coberturaMedia).toBeLessThanOrEqual(1);
    expect(["alta", "media", "baixa"]).toContain(report.prontidao.nivel);
  });
});

describe("generatePnaeReport — sem demanda detalhada", () => {
  it("ainda organiza a produção e não quebra sem produtos", () => {
    const report = generatePnaeReport(
      baseSnapshot({
        edital: {
          id: "ed-1",
          titulo: "Edital sem produtos",
          dataLimite: "2026-12-31",
          produtos: [],
        },
      }),
    );
    expect(report.matching).toEqual([]);
    expect(report.prontidao.nivel).toBe("media");
    expect(report.secoes.length).toBeGreaterThan(0);
    expect(report.textoRelatorio).toContain("RELATORIO DE APOIO PNAE");
  });

  it("prontidão baixa quando não há produção alguma", () => {
    const report = generatePnaeReport(
      baseSnapshot({
        edital: {
          id: "ed-1",
          titulo: "x",
          dataLimite: "2026-12-31",
          produtos: [],
        },
        producao: {
          quantidadeTotal: 0,
          totalRegistros: 0,
          associadosUnicos: 0,
          culturasUnicas: 0,
          porCultura: [],
        },
      }),
    );
    expect(report.prontidao.nivel).toBe("baixa");
    expect(report.alertas.join(" ")).toContain("Nenhuma producao");
  });
});

describe("generatePnaeReport — alertas de prazo", () => {
  it("alerta quando o prazo já venceu", () => {
    const report = generatePnaeReport(
      baseSnapshot({
        edital: {
          id: "ed-1",
          titulo: "x",
          dataLimite: "2020-01-01",
          produtos: [],
        },
      }),
    );
    expect(report.alertas.some((a) => a.includes("venceu"))).toBe(true);
  });

  it("sempre devolve o texto final pronto para o relatorio", () => {
    const report = generatePnaeReport(baseSnapshot());
    expect(report.textoRelatorio).toContain("RESUMO EXECUTIVO");
    expect(report.textoRelatorio).toContain("decisao final e da associacao");
  });
});
