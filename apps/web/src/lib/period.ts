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
 * Porta direta do helper do servidor (apps/api/src/utils/period.ts) — usa UTC
 * para manter consistência com os ranges salvos no banco.
 *
 * - "semanal"       → últimos 7 dias (incluindo hoje, em UTC)
 * - "mensal"        → mês corrente (do dia 1 ao último dia, em UTC)
 * - "anual"         → ano corrente (1 jan – 31 dez, em UTC)
 * - "personalizado" → requer `inicio` e `fim` em formato YYYY-MM-DD
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
      throw new Error("inicio e fim são obrigatórios para periodo=personalizado");
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(inicio) || !/^\d{4}-\d{2}-\d{2}$/.test(fim)) {
      throw new Error("inicio e fim devem estar no formato YYYY-MM-DD");
    }
    if (inicio > fim) {
      throw new Error("inicio deve ser anterior ou igual a fim");
    }
    return { tipo, inicio, fim };
  }

  throw new Error(`periodo inválido: "${tipo}"`);
}
