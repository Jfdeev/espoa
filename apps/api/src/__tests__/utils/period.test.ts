import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { resolvePeriod } from "../../utils/period";

const FIXED_DATE = new Date("2026-05-10T12:00:00.000Z");

describe("resolvePeriod", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_DATE);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("mensal (padrão)", () => {
    it("retorna o mês corrente sem parâmetro de período", () => {
      const result = resolvePeriod({});
      expect(result.tipo).toBe("mensal");
      expect(result.inicio).toBe("2026-05-01");
      expect(result.fim).toBe("2026-05-31");
    });

    it("retorna o mês corrente com periodo=mensal explícito", () => {
      const result = resolvePeriod({ periodo: "mensal" });
      expect(result.inicio).toBe("2026-05-01");
      expect(result.fim).toBe("2026-05-31");
    });
  });

  describe("semanal", () => {
    it("retorna os últimos 7 dias incluindo hoje", () => {
      const result = resolvePeriod({ periodo: "semanal" });
      expect(result.tipo).toBe("semanal");
      expect(result.inicio).toBe("2026-05-04");
      expect(result.fim).toBe("2026-05-10");
    });
  });

  describe("anual", () => {
    it("retorna o ano corrente inteiro", () => {
      const result = resolvePeriod({ periodo: "anual" });
      expect(result.tipo).toBe("anual");
      expect(result.inicio).toBe("2026-01-01");
      expect(result.fim).toBe("2026-12-31");
    });
  });

  describe("personalizado", () => {
    it("aceita datas válidas", () => {
      const result = resolvePeriod({
        periodo: "personalizado",
        inicio: "2026-01-15",
        fim: "2026-03-20",
      });
      expect(result.tipo).toBe("personalizado");
      expect(result.inicio).toBe("2026-01-15");
      expect(result.fim).toBe("2026-03-20");
    });

    it("aceita inicio === fim", () => {
      const result = resolvePeriod({
        periodo: "personalizado",
        inicio: "2026-03-01",
        fim: "2026-03-01",
      });
      expect(result.inicio).toBe("2026-03-01");
      expect(result.fim).toBe("2026-03-01");
    });

    it("lança erro quando inicio está ausente", () => {
      expect(() =>
        resolvePeriod({ periodo: "personalizado", fim: "2026-03-01" }),
      ).toThrowError(/obrigatórios/);
    });

    it("lança erro quando fim está ausente", () => {
      expect(() =>
        resolvePeriod({ periodo: "personalizado", inicio: "2026-01-01" }),
      ).toThrowError(/obrigatórios/);
    });

    it("lança erro com código periodo_invalido quando inicio > fim", () => {
      let caught: any;
      try {
        resolvePeriod({ periodo: "personalizado", inicio: "2026-05-10", fim: "2026-01-01" });
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeDefined();
      expect(caught.code).toBe("periodo_invalido");
      expect(caught.message).toMatch(/anterior/);
    });

    it("lança erro com formato inválido", () => {
      expect(() =>
        resolvePeriod({ periodo: "personalizado", inicio: "10/01/2026", fim: "2026-03-01" }),
      ).toThrowError(/YYYY-MM-DD/);
    });
  });

  describe("tipo inválido", () => {
    it("lança erro com código periodo_invalido", () => {
      let caught: any;
      try {
        resolvePeriod({ periodo: "quinzenal" });
      } catch (e) {
        caught = e;
      }
      expect(caught?.code).toBe("periodo_invalido");
    });
  });
});
