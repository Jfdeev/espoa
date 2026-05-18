import {
  db,
  associado,
  mensalidade,
  transacaoFinanceira,
  usuarioAssociacao,
  usuario,
  producao,
} from "@espoa/database";
import { and, count, desc, eq, gte, isNull, lte, sum } from "drizzle-orm";

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
  porTipoEntrada: Record<string, number>;
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

/**
 * Constrói um snapshot financeiro para a associação informada.
 *
 * @param associacaoId  - UUID da associação
 * @param periodo       - Janela de datas opcional para filtrar transações.
 *                        Quando ausente, retorna todos os registros (comportamento
 *                        original, mantendo compatibilidade com `getInsights`).
 *                        Filtro aplicado por `associacao_id` na `transacao_financeira`.
 */
export async function buildFinancialSnapshot(
  associacaoId: string,
  periodo?: { inicio?: string; fim?: string },
): Promise<FinancialSnapshot> {
  const [transacoes, mensPathA, mensPathB, [associadosAtivos]] = await Promise.all([
    db
      .select({
        tipo: transacaoFinanceira.tipo,
        valor: transacaoFinanceira.valor,
        data: transacaoFinanceira.data,
        descricao: transacaoFinanceira.descricao,
      })
      .from(transacaoFinanceira)
      .where(
        and(
          eq(transacaoFinanceira.associacaoId, associacaoId),
          isNull(transacaoFinanceira.deletedAt),
          periodo?.inicio ? gte(transacaoFinanceira.data, periodo.inicio) : undefined,
          periodo?.fim ? lte(transacaoFinanceira.data, periodo.fim) : undefined,
        ),
      )
      .orderBy(desc(transacaoFinanceira.data)),
    // Path A: via associado_id → associado.associacao_id (dados legados offline-sync)
    db
      .select({
        id: mensalidade.id,
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
    // Path B: via usuario_id → usuario_associacao (registros criados pelo admin)
    db
      .select({
        id: mensalidade.id,
        valor: mensalidade.valor,
        dataPagamento: mensalidade.dataPagamento,
      })
      .from(mensalidade)
      .innerJoin(usuarioAssociacao, eq(mensalidade.usuarioId, usuarioAssociacao.usuarioId))
      .where(
        and(
          eq(usuarioAssociacao.associacaoId, associacaoId),
          isNull(mensalidade.deletedAt),
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

  // Merge mensalidades — deduplicate por id para evitar dupla contagem
  const seenMensIds = new Set<string>();
  const mensalidades = [...mensPathA, ...mensPathB].filter((m) => {
    if (seenMensIds.has(m.id)) return false;
    seenMensIds.add(m.id);
    return true;
  });

  let totalEntradas = 0;
  let totalSaidas = 0;
  const porTipoSaida: Record<string, number> = {};
  const porTipoEntrada: Record<string, number> = {};
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
      const entradaLabel = (t.descricao ?? "").trim().toLowerCase() || "outros";
      porTipoEntrada[entradaLabel] = (porTipoEntrada[entradaLabel] ?? 0) + valor;
    } else {
      totalSaidas += valor;
      bucket.saidas += valor;
      const tipoLabel = (t.descricao ?? "").trim().toLowerCase() || "outros";
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
    porTipoEntrada,
    mensalidades: {
      totalAssociadosAtivos: associadosAtivos?.total ?? 0,
      pagas,
      pendentes,
      valorRecebido,
      valorEsperado,
      taxaInadimplencia,
    },
    producao: await buildProducaoSummary(associacaoId),
  };
}

async function buildProducaoSummary(associacaoId: string) {
  const registros = await db
    .select({
      cultura: producao.cultura,
      quantidade: producao.quantidade,
      data: producao.data,
    })
    .from(producao)
    .innerJoin(associado, eq(producao.associadoId, associado.id))
    .where(and(eq(associado.associacaoId, associacaoId), isNull(producao.deletedAt)));

  if (registros.length === 0) return undefined;

  let totalKg = 0;
  const porCultura: Record<string, number> = {};
  const porMesMap = new Map<string, { month: string; quantidade: number; colheitas: number }>();

  for (const r of registros) {
    const qtd = Number(r.quantidade) || 0;
    totalKg += qtd;

    const cult = r.cultura.trim().toLowerCase();
    porCultura[cult] = (porCultura[cult] ?? 0) + qtd;

    const key = monthKey(r.data);
    const bucket = porMesMap.get(key) ?? { month: key, quantidade: 0, colheitas: 0 };
    bucket.quantidade += qtd;
    bucket.colheitas += 1;
    porMesMap.set(key, bucket);
  }

  return {
    totalColheitas: registros.length,
    totalKg,
    porCultura,
    porMes: Array.from(porMesMap.values()).sort((a, b) => a.month.localeCompare(b.month)),
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
