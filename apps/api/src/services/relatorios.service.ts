import { db, associado, mensalidade, producao, areaPlantada, usuarioAssociacao, usuario } from "@espoa/database";
import { and, eq, gte, inArray, isNull, lte } from "drizzle-orm";
import type { ResolvedPeriod } from "../utils/period";
import { buildFinancialSnapshot } from "./insights.service";

// ── Tipos internos ────────────────────────────────────────────────────────────

interface ReportMeta {
  tipo: string;
  associacaoId: string;
  periodo: ResolvedPeriod;
  geradoEm: string;
  geradoPor: string;
}

function makeMeta(
  tipo: string,
  associacaoId: string,
  periodo: ResolvedPeriod,
  userId: string,
): ReportMeta {
  return {
    tipo,
    associacaoId,
    periodo,
    geradoEm: new Date().toISOString(),
    geradoPor: userId,
  };
}

// ── Produção ─────────────────────────────────────────────────────────────────

/**
 * Relatório de produção agrícola por período.
 *
 * Agrega registros de `producao` filtrados pela associação e janela de datas.
 * Usa dois caminhos de busca para cobrir tanto registros legados (via
 * associado.associacao_id) quanto registros de associados vinculados via
 * usuario_id → usuario_associacao (fluxo principal do admin).
 */
export async function getRelatorioProducao({
  associacaoId,
  periodo,
  userId,
}: {
  associacaoId: string;
  periodo: ResolvedPeriod;
  userId: string;
}) {
  // Busca usuarioIds vinculados à associação (para path B)
  const vinculosUA = await db
    .select({ usuarioId: usuarioAssociacao.usuarioId })
    .from(usuarioAssociacao)
    .where(
      and(
        eq(usuarioAssociacao.associacaoId, associacaoId),
        eq(usuarioAssociacao.status, "ativo"),
      ),
    );
  const usuarioIdsAssoc = vinculosUA.map((v) => v.usuarioId);

  // Path A: associado com associacao_id direto (dados legados)
  const pathA = await db
    .select({
      id: producao.id,
      associadoId: producao.associadoId,
      nomeAssociado: associado.nome,
      cultura: producao.cultura,
      quantidade: producao.quantidade,
      data: producao.data,
    })
    .from(producao)
    .innerJoin(associado, eq(producao.associadoId, associado.id))
    .where(
      and(
        eq(associado.associacaoId, associacaoId),
        gte(producao.data, periodo.inicio),
        lte(producao.data, periodo.fim),
        isNull(producao.deletedAt),
        isNull(associado.deletedAt),
      ),
    )
    .orderBy(producao.data);

  // Path B: associado vinculado via usuario_id → usuario_associacao
  const pathB =
    usuarioIdsAssoc.length > 0
      ? await db
          .select({
            id: producao.id,
            associadoId: producao.associadoId,
            nomeAssociado: associado.nome,
            cultura: producao.cultura,
            quantidade: producao.quantidade,
            data: producao.data,
          })
          .from(producao)
          .innerJoin(associado, eq(producao.associadoId, associado.id))
          .where(
            and(
              inArray(associado.usuarioId, usuarioIdsAssoc),
              gte(producao.data, periodo.inicio),
              lte(producao.data, periodo.fim),
              isNull(producao.deletedAt),
              isNull(associado.deletedAt),
            ),
          )
          .orderBy(producao.data)
      : [];

  // Merge + deduplicate por id
  const seenIds = new Set<string>();
  const rows: typeof pathA = [];
  for (const row of [...pathA, ...pathB]) {
    if (!seenIds.has(row.id)) {
      seenIds.add(row.id);
      rows.push(row);
    }
  }
  rows.sort((a, b) => (a.data as string).localeCompare(b.data as string));

  // Agrega em JS seguindo o padrão de insights.service.ts
  let totalQuantidade = 0;
  const porCulturaMap = new Map<
    string,
    { cultura: string; quantidadeTotal: number; registros: number }
  >();
  const porAssociadoMap = new Map<
    string,
    { associadoId: string; nome: string; quantidadeTotal: number; registros: number }
  >();
  const porMesMap = new Map<
    string,
    { mes: string; quantidadeTotal: number; registros: number }
  >();

  for (const row of rows) {
    const quantidade = Number(row.quantidade) || 0;
    totalQuantidade += quantidade;

    const cultura = row.cultura ?? "não informada";
    const cultBucket = porCulturaMap.get(cultura) ?? {
      cultura,
      quantidadeTotal: 0,
      registros: 0,
    };
    cultBucket.quantidadeTotal += quantidade;
    cultBucket.registros += 1;
    porCulturaMap.set(cultura, cultBucket);

    const assocBucket = porAssociadoMap.get(row.associadoId) ?? {
      associadoId: row.associadoId,
      nome: row.nomeAssociado,
      quantidadeTotal: 0,
      registros: 0,
    };
    assocBucket.quantidadeTotal += quantidade;
    assocBucket.registros += 1;
    porAssociadoMap.set(row.associadoId, assocBucket);

    // data é string YYYY-MM-DD; extrai YYYY-MM
    const mes = (row.data as string).substring(0, 7);
    const mesBucket = porMesMap.get(mes) ?? { mes, quantidadeTotal: 0, registros: 0 };
    mesBucket.quantidadeTotal += quantidade;
    mesBucket.registros += 1;
    porMesMap.set(mes, mesBucket);
  }

  return {
    meta: makeMeta("producao", associacaoId, periodo, userId),
    resumo: {
      quantidadeTotal: totalQuantidade,
      totalRegistros: rows.length,
      associadosUnicos: porAssociadoMap.size,
      culturasUnicas: porCulturaMap.size,
    },
    agregacoes: {
      porCultura: Array.from(porCulturaMap.values()).sort(
        (a, b) => b.quantidadeTotal - a.quantidadeTotal,
      ),
      porAssociado: Array.from(porAssociadoMap.values()).sort(
        (a, b) => b.quantidadeTotal - a.quantidadeTotal,
      ),
      porMes: Array.from(porMesMap.values()).sort((a, b) => a.mes.localeCompare(b.mes)),
    },
    detalhes: rows,
  };
}

// ── Financeiro ───────────────────────────────────────────────────────────────

/**
 * Relatório financeiro por período.
 *
 * Reutiliza `buildFinancialSnapshot` (já consumido pelo módulo de IA) com
 * extensão de filtro por período. Retorna entradas, saídas, saldo, fluxo
 * mensal e resumo de mensalidades.
 *
 * ⚠️ Nota: `transacao_financeira` não possui `associacao_id` no schema atual,
 * portanto as transações não são filtradas por associação — apenas pelo período.
 * Uma migration de schema está prevista para fase futura.
 */
export async function getRelatorioFinanceiro({
  associacaoId,
  periodo,
  userId,
}: {
  associacaoId: string;
  periodo: ResolvedPeriod;
  userId: string;
}) {
  const snapshot = await buildFinancialSnapshot(associacaoId, {
    inicio: periodo.inicio,
    fim: periodo.fim,
  });

  return {
    meta: makeMeta("financeiro", associacaoId, periodo, userId),
    resumo: {
      saldoAtual: snapshot.saldoAtual,
      totalEntradas: snapshot.totalEntradas,
      totalSaidas: snapshot.totalSaidas,
      taxaInadimplencia: snapshot.mensalidades.taxaInadimplencia,
    },
    agregacoes: {
      porMes: snapshot.porMes,
      porTipoSaida: snapshot.porTipoSaida,
      porTipoEntrada: snapshot.porTipoEntrada,
    },
    detalhes: {
      mensalidades: snapshot.mensalidades,
    },
  };
}

// ── Mensalidades ─────────────────────────────────────────────────────────────

/**
 * Relatório de mensalidades da associação.
 *
 * Usa dois caminhos de busca para cobrir todos os registros:
 *   - Path A: via associado_id → associado.associacao_id (registros offline-sync legados)
 *   - Path B: via usuario_id → usuario_associacao (registros criados pelo admin)
 *
 * Status é inferido pela presença de `data_pagamento`:
 *   - preenchido → paga
 *   - null       → pendente
 */
export async function getRelatorioMensalidades({
  associacaoId,
  periodo,
  userId,
}: {
  associacaoId: string;
  periodo: ResolvedPeriod;
  userId: string;
}) {
  type MensRow = {
    id: string;
    associadoId: string | null;
    nome: string | null;
    cpf: string | null;
    valor: number | null;
    dataPagamento: string | null;
    formaPagamento: string | null;
  };

  // Path A: via associado_id → associado.associacao_id (dados legados)
  const pathA: MensRow[] = await db
    .select({
      id: mensalidade.id,
      associadoId: mensalidade.associadoId,
      nome: associado.nome,
      cpf: associado.cpf,
      valor: mensalidade.valor,
      dataPagamento: mensalidade.dataPagamento,
      formaPagamento: mensalidade.formaPagamento,
    })
    .from(mensalidade)
    .innerJoin(associado, eq(mensalidade.associadoId, associado.id))
    .where(
      and(
        eq(associado.associacaoId, associacaoId),
        isNull(mensalidade.deletedAt),
        isNull(associado.deletedAt),
      ),
    );

  // Path B: via usuario_id → usuario_associacao → usuario (nome/cpf)
  const pathB: MensRow[] = await db
    .select({
      id: mensalidade.id,
      associadoId: mensalidade.associadoId,
      nome: usuario.nome,
      cpf: usuario.cpf,
      valor: mensalidade.valor,
      dataPagamento: mensalidade.dataPagamento,
      formaPagamento: mensalidade.formaPagamento,
    })
    .from(mensalidade)
    .innerJoin(usuarioAssociacao, eq(mensalidade.usuarioId, usuarioAssociacao.usuarioId))
    .innerJoin(usuario, eq(usuarioAssociacao.usuarioId, usuario.id))
    .where(
      and(
        eq(usuarioAssociacao.associacaoId, associacaoId),
        isNull(mensalidade.deletedAt),
      ),
    );

  // Merge + deduplicate por id
  const seenIds = new Set<string>();
  const todasMensalidades: MensRow[] = [];
  for (const row of [...pathA, ...pathB]) {
    if (!seenIds.has(row.id)) {
      seenIds.add(row.id);
      todasMensalidades.push(row);
    }
  }

  const pagasNoPeriodo = todasMensalidades.filter(
    (m) =>
      m.dataPagamento != null &&
      m.dataPagamento >= periodo.inicio &&
      m.dataPagamento <= periodo.fim,
  );

  const pendentes = todasMensalidades.filter((m) => m.dataPagamento == null);

  let valorRecebido = 0;
  let valorPendente = 0;

  for (const m of todasMensalidades) {
    const valor = Number(m.valor) || 0;
    if (m.dataPagamento) {
      valorRecebido += valor;
    } else {
      valorPendente += valor;
    }
  }

  const totalRegistros = todasMensalidades.length;
  const totalPagas = totalRegistros - pendentes.length;
  const taxaInadimplencia = totalRegistros > 0 ? pendentes.length / totalRegistros : 0;

  return {
    meta: makeMeta("mensalidades", associacaoId, periodo, userId),
    resumo: {
      totalRegistros,
      totalPagas,
      totalPendentes: pendentes.length,
      valorRecebido,
      valorPendente,
      taxaInadimplencia,
    },
    agregacoes: {
      pagasNoPeriodo: pagasNoPeriodo.length,
      valorRecebidoNoPeriodo: pagasNoPeriodo.reduce(
        (s, m) => s + (Number(m.valor) || 0),
        0,
      ),
    },
    detalhes: {
      pendentes: pendentes.map((m) => ({
        associadoId: m.associadoId,
        nome: m.nome,
        cpf: m.cpf,
        valor: Number(m.valor) || 0,
      })),
    },
  };
}

// ── Associados ───────────────────────────────────────────────────────────────

/**
 * Relatório de associados da organização.
 *
 * Usa dois caminhos de busca:
 *   - Path A: associados com associacao_id direto (dados legados offline-sync)
 *   - Path B: membros via usuario_associacao + usuario (fluxo principal do admin)
 *
 * Deduplicação por usuario_id para evitar contagem dupla de membros que existem
 * em ambas as tabelas. Novos no período usa dataEntrada (path A) ou joinedAt (path B).
 */
export async function getRelatorioAssociados({
  associacaoId,
  periodo,
  userId,
}: {
  associacaoId: string;
  periodo: ResolvedPeriod;
  userId: string;
}) {
  type AssocRow = {
    id: string;
    nome: string | null;
    cpf: string | null;
    comunidade: string | null;
    status: string | null;
    dataEntrada: string | null;
  };

  // Path A: associado com associacao_id direto (dados legados)
  const rawPathA = await db
    .select({
      id: associado.id,
      usuarioId: associado.usuarioId,
      nome: associado.nome,
      cpf: associado.cpf,
      comunidade: associado.comunidade,
      status: associado.status,
      dataEntrada: associado.dataEntrada,
    })
    .from(associado)
    .where(
      and(
        eq(associado.associacaoId, associacaoId),
        isNull(associado.deletedAt),
      ),
    )
    .orderBy(associado.nome);

  // Track usuarioIds já cobertos pelo path A (para deduplicação)
  const pathAUsuarioIds = new Set(
    rawPathA.flatMap((r) => (r.usuarioId ? [r.usuarioId] : [])),
  );

  // Path B: membros via usuario_associacao + usuario
  const rawPathB = await db
    .select({
      usuarioId: usuarioAssociacao.usuarioId,
      nome: usuario.nome,
      cpf: usuario.cpf,
      status: usuarioAssociacao.status,
      joinedAt: usuarioAssociacao.joinedAt,
    })
    .from(usuarioAssociacao)
    .innerJoin(usuario, eq(usuarioAssociacao.usuarioId, usuario.id))
    .where(
      and(
        eq(usuarioAssociacao.associacaoId, associacaoId),
        eq(usuarioAssociacao.status, "ativo"),
      ),
    )
    .orderBy(usuario.nome);

  // Construir lista unificada
  const todosAssociados: AssocRow[] = rawPathA.map((r) => ({
    id: r.id,
    nome: r.nome,
    cpf: r.cpf,
    comunidade: r.comunidade,
    status: r.status,
    dataEntrada: r.dataEntrada,
  }));

  const seenUsuarioIds = new Set(pathAUsuarioIds);
  for (const r of rawPathB) {
    if (seenUsuarioIds.has(r.usuarioId)) continue;
    seenUsuarioIds.add(r.usuarioId);
    const dataEntrada = r.joinedAt
      ? new Date(r.joinedAt as unknown as string | Date).toISOString().substring(0, 10)
      : null;
    todosAssociados.push({
      id: r.usuarioId,
      nome: r.nome,
      cpf: r.cpf,
      comunidade: null,
      status: r.status,
      dataEntrada,
    });
  }

  todosAssociados.sort((a, b) => (a.nome ?? "").localeCompare(b.nome ?? ""));

  const porStatusMap = new Map<string, number>();
  const porComunidadeMap = new Map<string, number>();

  for (const a of todosAssociados) {
    const status = a.status ?? "desconhecido";
    porStatusMap.set(status, (porStatusMap.get(status) ?? 0) + 1);

    const comunidade = a.comunidade ?? "não informada";
    porComunidadeMap.set(comunidade, (porComunidadeMap.get(comunidade) ?? 0) + 1);
  }

  const novosNoPeriodo = todosAssociados.filter(
    (a) =>
      a.dataEntrada != null &&
      a.dataEntrada >= periodo.inicio &&
      a.dataEntrada <= periodo.fim,
  );

  return {
    meta: makeMeta("associados", associacaoId, periodo, userId),
    resumo: {
      total: todosAssociados.length,
      ativos: porStatusMap.get("ativo") ?? 0,
      novosNoPeriodo: novosNoPeriodo.length,
    },
    agregacoes: {
      porStatus: Array.from(porStatusMap.entries()).map(([status, total]) => ({
        status,
        total,
      })),
      porComunidade: Array.from(porComunidadeMap.entries())
        .map(([comunidade, total]) => ({ comunidade, total }))
        .sort((a, b) => b.total - a.total),
    },
    detalhes: todosAssociados,
  };
}

// ── Área Plantada ─────────────────────────────────────────────────────────────

/**
 * Relatório de área plantada por período.
 *
 * Usa o mesmo padrão dual-path de `getRelatorioProducao` para cobrir
 * registros legados e registros via usuario_id → usuario_associacao.
 */
export async function getRelatorioAreaPlantada({
  associacaoId,
  periodo,
  userId,
}: {
  associacaoId: string;
  periodo: ResolvedPeriod;
  userId: string;
}) {
  const vinculosUA = await db
    .select({ usuarioId: usuarioAssociacao.usuarioId })
    .from(usuarioAssociacao)
    .where(
      and(
        eq(usuarioAssociacao.associacaoId, associacaoId),
        eq(usuarioAssociacao.status, "ativo"),
      ),
    );
  const usuarioIdsAssoc = vinculosUA.map((v) => v.usuarioId);

  const selectFields = {
    id: areaPlantada.id,
    associadoId: areaPlantada.associadoId,
    nomeAssociado: associado.nome,
    cultura: areaPlantada.cultura,
    areaHa: areaPlantada.areaHa,
    dataReferencia: areaPlantada.dataReferencia,
    observacao: areaPlantada.observacao,
  } as const;

  const pathA = await db
    .select(selectFields)
    .from(areaPlantada)
    .innerJoin(associado, eq(areaPlantada.associadoId, associado.id))
    .where(
      and(
        eq(associado.associacaoId, associacaoId),
        gte(areaPlantada.dataReferencia, periodo.inicio),
        lte(areaPlantada.dataReferencia, periodo.fim),
        isNull(areaPlantada.deletedAt),
        isNull(associado.deletedAt),
      ),
    )
    .orderBy(areaPlantada.dataReferencia);

  const pathB =
    usuarioIdsAssoc.length > 0
      ? await db
          .select(selectFields)
          .from(areaPlantada)
          .innerJoin(associado, eq(areaPlantada.associadoId, associado.id))
          .where(
            and(
              inArray(associado.usuarioId, usuarioIdsAssoc),
              gte(areaPlantada.dataReferencia, periodo.inicio),
              lte(areaPlantada.dataReferencia, periodo.fim),
              isNull(areaPlantada.deletedAt),
              isNull(associado.deletedAt),
            ),
          )
          .orderBy(areaPlantada.dataReferencia)
      : [];

  const seenIds = new Set<string>();
  const rows: typeof pathA = [];
  for (const row of [...pathA, ...pathB]) {
    if (!seenIds.has(row.id)) {
      seenIds.add(row.id);
      rows.push(row);
    }
  }
  rows.sort((a, b) =>
    (a.dataReferencia as string).localeCompare(b.dataReferencia as string),
  );

  let totalHa = 0;
  const porCulturaMap = new Map<
    string,
    { cultura: string; totalHa: number; registros: number }
  >();
  const porAssociadoMap = new Map<
    string,
    { associadoId: string; nome: string; totalHa: number; registros: number }
  >();
  const porMesMap = new Map<
    string,
    { mes: string; totalHa: number; registros: number }
  >();

  for (const row of rows) {
    const ha = Number(row.areaHa) || 0;
    totalHa += ha;

    const cultura = row.cultura ?? "não informada";
    const cultBucket = porCulturaMap.get(cultura) ?? { cultura, totalHa: 0, registros: 0 };
    cultBucket.totalHa += ha;
    cultBucket.registros += 1;
    porCulturaMap.set(cultura, cultBucket);

    const assocBucket = porAssociadoMap.get(row.associadoId) ?? {
      associadoId: row.associadoId,
      nome: row.nomeAssociado,
      totalHa: 0,
      registros: 0,
    };
    assocBucket.totalHa += ha;
    assocBucket.registros += 1;
    porAssociadoMap.set(row.associadoId, assocBucket);

    const mes = (row.dataReferencia as string).substring(0, 7);
    const mesBucket = porMesMap.get(mes) ?? { mes, totalHa: 0, registros: 0 };
    mesBucket.totalHa += ha;
    mesBucket.registros += 1;
    porMesMap.set(mes, mesBucket);
  }

  return {
    meta: makeMeta("area_plantada", associacaoId, periodo, userId),
    resumo: {
      totalHa,
      totalRegistros: rows.length,
      associadosUnicos: porAssociadoMap.size,
      culturasUnicas: porCulturaMap.size,
    },
    agregacoes: {
      porCultura: Array.from(porCulturaMap.values()).sort((a, b) => b.totalHa - a.totalHa),
      porAssociado: Array.from(porAssociadoMap.values()).sort((a, b) => b.totalHa - a.totalHa),
      porMes: Array.from(porMesMap.values()).sort((a, b) => a.mes.localeCompare(b.mes)),
    },
    detalhes: rows,
  };
}
