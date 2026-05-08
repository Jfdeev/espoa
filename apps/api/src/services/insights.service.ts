import {
  db,
  associado,
  mensalidade,
  transacaoFinanceira,
  usuarioAssociacao,
} from "@espoa/database";
import { and, count, desc, eq, isNull, sum } from "drizzle-orm";

interface MonthlyAggregate {
  month: string;
  entradas: number;
  saidas: number;
  saldo: number;
}

interface MensalidadeSummary {
  totalAssociadosAtivos: number;
  pagas: number;
  pendentes: number;
  valorRecebido: number;
  valorEsperado: number;
  taxaInadimplencia: number;
}

export interface FinancialSnapshot {
  associacaoId: string;
  generatedAt: string;
  saldoAtual: number;
  totalEntradas: number;
  totalSaidas: number;
  porMes: MonthlyAggregate[];
  porTipoSaida: Record<string, number>;
  mensalidades: MensalidadeSummary;
}

const ENTRADA_TIPOS = new Set(["entrada", "receita", "deposito", "doacao"]);

function classifyTipo(tipo: string): "entrada" | "saida" {
  const t = tipo.trim().toLowerCase();
  if (ENTRADA_TIPOS.has(t)) return "entrada";
  return "saida";
}

function monthKey(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export async function buildFinancialSnapshot(
  associacaoId: string,
): Promise<FinancialSnapshot> {
  const [transacoes, mensalidades, [associadosAtivos]] = await Promise.all([
    db
      .select({
        tipo: transacaoFinanceira.tipo,
        valor: transacaoFinanceira.valor,
        data: transacaoFinanceira.data,
      })
      .from(transacaoFinanceira)
      .where(isNull(transacaoFinanceira.deletedAt))
      .orderBy(desc(transacaoFinanceira.data)),
    db
      .select({
        valor: mensalidade.valor,
        dataPagamento: mensalidade.dataPagamento,
      })
      .from(mensalidade)
      .innerJoin(associado, eq(mensalidade.associadoId, associado.id))
      .where(
        and(
          eq(associado.associacaoId, associacaoId),
          isNull(mensalidade.deletedAt),
          isNull(associado.deletedAt),
        ),
      ),
    db
      .select({ total: count() })
      .from(usuarioAssociacao)
      .where(
        and(
          eq(usuarioAssociacao.associacaoId, associacaoId),
          eq(usuarioAssociacao.status, "ativo"),
        ),
      ),
  ]);

  let totalEntradas = 0;
  let totalSaidas = 0;
  const porTipoSaida: Record<string, number> = {};
  const porMesMap = new Map<string, MonthlyAggregate>();

  for (const t of transacoes) {
    const valor = Number(t.valor) || 0;
    const key = monthKey(t.data);
    const bucket =
      porMesMap.get(key) ??
      ({ month: key, entradas: 0, saidas: 0, saldo: 0 } as MonthlyAggregate);

    if (classifyTipo(t.tipo) === "entrada") {
      totalEntradas += valor;
      bucket.entradas += valor;
    } else {
      totalSaidas += valor;
      bucket.saidas += valor;
      const tipoLabel = t.tipo.trim().toLowerCase() || "outros";
      porTipoSaida[tipoLabel] = (porTipoSaida[tipoLabel] ?? 0) + valor;
    }
    bucket.saldo = bucket.entradas - bucket.saidas;
    porMesMap.set(key, bucket);
  }

  let valorRecebido = 0;
  let valorEsperado = 0;
  let pagas = 0;
  let pendentes = 0;

  for (const m of mensalidades) {
    const valor = Number(m.valor) || 0;
    valorEsperado += valor;
    if (m.dataPagamento) {
      pagas += 1;
      valorRecebido += valor;
    } else {
      pendentes += 1;
    }
  }

  const total = pagas + pendentes;
  const taxaInadimplencia = total > 0 ? pendentes / total : 0;

  const porMes = Array.from(porMesMap.values()).sort((a, b) =>
    a.month.localeCompare(b.month),
  );

  return {
    associacaoId,
    generatedAt: new Date().toISOString(),
    saldoAtual: totalEntradas - totalSaidas + valorRecebido,
    totalEntradas: totalEntradas + valorRecebido,
    totalSaidas,
    porMes,
    porTipoSaida,
    mensalidades: {
      totalAssociadosAtivos: associadosAtivos?.total ?? 0,
      pagas,
      pendentes,
      valorRecebido,
      valorEsperado,
      taxaInadimplencia,
    },
  };
}

interface AiInsightsResponse {
  associacaoId: string;
  generatedAt: string;
  insights: Array<{
    id: string;
    categoria: string;
    severidade: string;
    titulo: string;
    mensagem: string;
  }>;
}

export async function fetchInsightsFromAi(
  snapshot: FinancialSnapshot,
): Promise<AiInsightsResponse> {
  const baseUrl = process.env.AI_SERVICE_URL || "http://localhost:8090";
  const url = `${baseUrl.replace(/\/$/, "")}/insights`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(snapshot),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`AI service respondeu ${response.status}`);
    }

    return (await response.json()) as AiInsightsResponse;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getInsights(associacaoId: string) {
  const snapshot = await buildFinancialSnapshot(associacaoId);
  const result = await fetchInsightsFromAi(snapshot);
  return {
    ...result,
    snapshot,
  };
}
