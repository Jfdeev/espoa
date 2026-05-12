export type PeriodoTipo = "semanal" | "mensal" | "anual" | "personalizado";

export interface ResolvedPeriod {
  tipo: PeriodoTipo;
  /** YYYY-MM-DD */
  inicio: string;
  /** YYYY-MM-DD */
  fim: string;
}

interface PeriodInput {
  periodo?: string;
  inicio?: string;
  fim?: string;
}

function toISODate(d: Date): string {
  return d.toISOString().split("T")[0];
}

/**
 * Resolve a janela de datas a partir dos parâmetros de período.
 *
 * - "semanal"      → últimos 7 dias (incluindo hoje, em UTC)
 * - "mensal"       → mês corrente (do dia 1 ao último dia, em UTC)
 * - "anual"        → ano corrente (1 jan – 31 dez, em UTC)
 * - "personalizado" → requer `inicio` e `fim` em formato YYYY-MM-DD
 *
 * @throws Error com `error.code === "periodo_invalido"` em caso de entrada inválida
 */
export function resolvePeriod(input: PeriodInput): ResolvedPeriod {
  const tipo = (input.periodo ?? "mensal") as PeriodoTipo;
  const now = new Date();

  if (tipo === "semanal") {
    const fim = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const inicio = new Date(fim);
    inicio.setUTCDate(inicio.getUTCDate() - 6);
    return { tipo, inicio: toISODate(inicio), fim: toISODate(fim) };
  }

  if (tipo === "mensal") {
    const inicio = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const fim = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
    return { tipo, inicio: toISODate(inicio), fim: toISODate(fim) };
  }

  if (tipo === "anual") {
    const inicio = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    const fim = new Date(Date.UTC(now.getUTCFullYear(), 11, 31));
    return { tipo, inicio: toISODate(inicio), fim: toISODate(fim) };
  }

  if (tipo === "personalizado") {
    const { inicio, fim } = input;

    if (!inicio || !fim) {
      throw Object.assign(
        new Error("inicio e fim são obrigatórios para periodo=personalizado"),
        { code: "periodo_invalido" },
      );
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(inicio) || !/^\d{4}-\d{2}-\d{2}$/.test(fim)) {
      throw Object.assign(
        new Error("inicio e fim devem estar no formato YYYY-MM-DD"),
        { code: "periodo_invalido" },
      );
    }
    if (inicio > fim) {
      throw Object.assign(
        new Error("inicio deve ser anterior ou igual a fim"),
        { code: "periodo_invalido" },
      );
    }

    return { tipo, inicio, fim };
  }

  throw Object.assign(new Error(`periodo inválido: "${tipo}"`), { code: "periodo_invalido" });
}
