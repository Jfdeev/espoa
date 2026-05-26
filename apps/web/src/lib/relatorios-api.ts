import { db } from "@/database/db";
import { syncManager } from "@/sync/manager";
import { getDeviceId } from "@/lib/device-id";
import { isOnline } from "@/lib/network";
import { useAuthStore } from "@/store/auth.store";

// ── Tipos compartilhados ──────────────────────────────────────────────────────

export interface ReportMeta {
  tipo: string;
  associacaoId: string;
  periodo: { tipo: string; inicio: string; fim: string };
  geradoEm: string;
  geradoPor: string;
}

// ── Produção ──────────────────────────────────────────────────────────────────

export interface ProducaoDetalhe {
  id: string;
  associadoId: string;
  nomeAssociado: string;
  cultura: string;
  quantidade: number;
  data: string;
}

export interface RelatorioProducao {
  meta: ReportMeta;
  resumo: {
    quantidadeTotal: number;
    totalRegistros: number;
    associadosUnicos: number;
    culturasUnicas: number;
  };
  agregacoes: {
    porCultura: { cultura: string; quantidadeTotal: number; registros: number }[];
    porAssociado: { associadoId: string; nome: string; quantidadeTotal: number; registros: number }[];
    porMes: { mes: string; quantidadeTotal: number; registros: number }[];
  };
  detalhes: ProducaoDetalhe[];
}

// ── Financeiro ────────────────────────────────────────────────────────────────

export interface RelatorioFinanceiro {
  meta: ReportMeta;
  resumo: {
    saldoAtual: number;
    totalEntradas: number;
    totalSaidas: number;
    taxaInadimplencia: number;
  };
  agregacoes: {
    porMes: { month: string; entradas: number; saidas: number; saldo: number }[];
    porTipoSaida: Record<string, number>;
    porTipoEntrada?: Record<string, number>;
  };
  detalhes: {
    mensalidades: {
      totalAssociadosAtivos: number;
      pagas: number;
      pendentes: number;
      valorRecebido: number;
      valorEsperado: number;
      taxaInadimplencia: number;
    };
  };
}

// ── Mensalidades ──────────────────────────────────────────────────────────────

export interface MensalidadeInadimplente {
  associadoId: string | null;
  nome: string;
  cpf: string | null;
  valor: number;
}

export interface RelatorioMensalidades {
  meta: ReportMeta;
  resumo: {
    totalRegistros: number;
    totalPagas: number;
    totalPendentes: number;
    valorRecebido: number;
    valorPendente: number;
    taxaInadimplencia: number;
  };
  agregacoes: {
    pagasNoPeriodo: number;
    valorRecebidoNoPeriodo: number;
  };
  detalhes: {
    pendentes: MensalidadeInadimplente[];
  };
}

// ── Associados ────────────────────────────────────────────────────────────────

export interface AssociadoDetalhe {
  id: string;
  nome: string;
  cpf: string | null;
  comunidade: string | null;
  status: string;
  dataEntrada: string;
}

export interface RelatorioAssociados {
  meta: ReportMeta;
  resumo: {
    total: number;
    ativos: number;
    novosNoPeriodo: number;
  };
  agregacoes: {
    porStatus: { status: string; total: number }[];
    porComunidade: { comunidade: string; total: number }[];
  };
  detalhes: AssociadoDetalhe[];
}

// ── Tipo composto usado por RelatoriosPage e PDF ──────────────────────────────

export interface RelatoriosData {
  producao: RelatorioProducao;
  financeiro: RelatorioFinanceiro;
  mensalidades: RelatorioMensalidades;
  associados: RelatorioAssociados;
  areaPlantada: RelatorioAreaPlantada;
}

export type TabKey = "producao" | "financeiro" | "mensalidades" | "associados" | "area_plantada";

// ── Parâmetros de busca ───────────────────────────────────────────────────────

export interface BuscarParams {
  associacao_id: string;
  periodo: string;
  inicio?: string;
  fim?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function monthKey(data: string): string {
  // data está em YYYY-MM-DD; basta pegar o prefixo
  return data.substring(0, 7);
}

function classifyTipo(tipo: string): "entrada" | "saida" {
  return tipo === "despesa" ? "saida" : "entrada";
}

function resolvePeriodoFromParams(p: BuscarParams): { tipo: string; inicio: string; fim: string } {
  // Aproveita o resolvePeriod do helper de período; sem importar para evitar ciclos
  // de import, replicamos a lógica simples aqui.
  const tipo = p.periodo || "mensal";
  const now = new Date();
  if (tipo === "semanal") {
    const fim = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const inicio = new Date(fim);
    inicio.setUTCDate(inicio.getUTCDate() - 6);
    return { tipo, inicio: toISO(inicio), fim: toISO(fim) };
  }
  if (tipo === "anual") {
    const inicio = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    const fim = new Date(Date.UTC(now.getUTCFullYear(), 11, 31));
    return { tipo, inicio: toISO(inicio), fim: toISO(fim) };
  }
  if (tipo === "personalizado") {
    if (!p.inicio || !p.fim) {
      throw new Error("inicio e fim são obrigatórios para periodo=personalizado");
    }
    return { tipo, inicio: p.inicio, fim: p.fim };
  }
  // mensal (default)
  const inicio = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const fim = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
  return { tipo: "mensal", inicio: toISO(inicio), fim: toISO(fim) };
}

function toISO(d: Date): string {
  return d.toISOString().split("T")[0];
}

function makeMeta(tipo: string, params: BuscarParams, periodo: { tipo: string; inicio: string; fim: string }): ReportMeta {
  return {
    tipo,
    associacaoId: params.associacao_id,
    periodo,
    geradoEm: new Date().toISOString(),
    geradoPor: useAuthStore.getState().perfil?.id ?? "local",
  };
}

async function refreshIfOnline() {
  if (isOnline()) {
    syncManager.run(getDeviceId()).catch(() => {/* offline ou erro */});
  }
}

// ── Produção ──────────────────────────────────────────────────────────────────

export async function buscarRelatorioProducao(p: BuscarParams): Promise<RelatorioProducao> {
  await refreshIfOnline();
  const periodo = resolvePeriodoFromParams(p);

  // Path A: associados com associacao_id direto
  const pathA = await db.associado
    .where("associacao_id").equals(p.associacao_id)
    .filter((a) => !a.deleted_at)
    .toArray();

  // Path B: associados cujo usuario_id pertence à associação via usuario_associacao
  // (cobre o caso onde o associado.associacao_id está nulo/divergente no Dexie
  // mas o usuário tem vínculo ativo na associação — espelha a query do servidor).
  const vinculosAtivos = await db.usuario_associacao
    .where("associacao_id").equals(p.associacao_id)
    .filter((v) => v.status === "ativo")
    .toArray();
  const usuarioIdsAssoc = new Set(vinculosAtivos.map((v) => v.usuario_id));

  const pathB = usuarioIdsAssoc.size > 0
    ? await db.associado
        .filter((a) => !a.deleted_at && !!a.usuario_id && usuarioIdsAssoc.has(a.usuario_id))
        .toArray()
    : [];

  // Merge dedup por id
  const associadosMap = new Map<string, typeof pathA[number]>();
  for (const a of pathA) if (a.id) associadosMap.set(a.id, a);
  for (const a of pathB) if (a.id) associadosMap.set(a.id, a);
  const associados = Array.from(associadosMap.values());

  const nomePorAssociado = new Map(associados.map((a) => [a.id!, a.nome]));
  const associadoIdsAssoc = new Set(associados.map((a) => a.id).filter(Boolean) as string[]);

  const producoes = await db.producao
    .filter((prod) => {
      if (prod.deleted_at) return false;
      if (prod.data < periodo.inicio || prod.data > periodo.fim) return false;
      return associadoIdsAssoc.has(prod.associado_id);
    })
    .toArray();

  producoes.sort((a, b) => a.data.localeCompare(b.data));

  const rows: ProducaoDetalhe[] = producoes.map((prod) => ({
    id: prod.id!,
    associadoId: prod.associado_id,
    nomeAssociado: nomePorAssociado.get(prod.associado_id) ?? prod.associado_id.slice(0, 8),
    cultura: prod.cultura,
    quantidade: prod.quantidade,
    data: prod.data,
  }));

  let totalQuantidade = 0;
  const porCulturaMap = new Map<string, { cultura: string; quantidadeTotal: number; registros: number }>();
  const porAssociadoMap = new Map<string, { associadoId: string; nome: string; quantidadeTotal: number; registros: number }>();
  const porMesMap = new Map<string, { mes: string; quantidadeTotal: number; registros: number }>();

  for (const row of rows) {
    const quantidade = Number(row.quantidade) || 0;
    totalQuantidade += quantidade;

    const cultura = row.cultura ?? "não informada";
    const cultBucket = porCulturaMap.get(cultura) ?? { cultura, quantidadeTotal: 0, registros: 0 };
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

    const mes = monthKey(row.data);
    const mesBucket = porMesMap.get(mes) ?? { mes, quantidadeTotal: 0, registros: 0 };
    mesBucket.quantidadeTotal += quantidade;
    mesBucket.registros += 1;
    porMesMap.set(mes, mesBucket);
  }

  return {
    meta: makeMeta("producao", p, periodo),
    resumo: {
      quantidadeTotal: totalQuantidade,
      totalRegistros: rows.length,
      associadosUnicos: porAssociadoMap.size,
      culturasUnicas: porCulturaMap.size,
    },
    agregacoes: {
      porCultura: Array.from(porCulturaMap.values()).sort((a, b) => b.quantidadeTotal - a.quantidadeTotal),
      porAssociado: Array.from(porAssociadoMap.values()).sort((a, b) => b.quantidadeTotal - a.quantidadeTotal),
      porMes: Array.from(porMesMap.values()).sort((a, b) => a.mes.localeCompare(b.mes)),
    },
    detalhes: rows,
  };
}

// ── Financeiro ────────────────────────────────────────────────────────────────

export async function buscarRelatorioFinanceiro(p: BuscarParams): Promise<RelatorioFinanceiro> {
  await refreshIfOnline();
  const periodo = resolvePeriodoFromParams(p);

  const [transacoes, vinculosAtivos] = await Promise.all([
    db.transacao_financeira
      .where("associacao_id").equals(p.associacao_id)
      .filter(
        (t) =>
          !t.deleted_at &&
          t.data >= periodo.inicio &&
          t.data <= periodo.fim,
      )
      .toArray(),
    db.usuario_associacao
      .where("associacao_id").equals(p.associacao_id)
      .filter((v) => v.status === "ativo")
      .toArray(),
  ]);

  // Mensalidades — todas da associação (path A via associado, path B via usuario_associacao)
  const usuarioIdsAssoc = new Set(vinculosAtivos.map((v) => v.usuario_id));
  const pathAAssoc = await db.associado
    .where("associacao_id").equals(p.associacao_id)
    .filter((a) => !a.deleted_at)
    .toArray();
  const pathBAssoc = usuarioIdsAssoc.size > 0
    ? await db.associado
        .filter((a) => !a.deleted_at && !!a.usuario_id && usuarioIdsAssoc.has(a.usuario_id))
        .toArray()
    : [];
  const associadoMap = new Map<string, typeof pathAAssoc[number]>();
  for (const a of pathAAssoc) if (a.id) associadoMap.set(a.id, a);
  for (const a of pathBAssoc) if (a.id) associadoMap.set(a.id, a);
  const associadoIds = new Set(Array.from(associadoMap.keys()));

  const todasMensalidades = await db.mensalidade
    .filter((m) => {
      if (m.deleted_at) return false;
      if (m.associado_id && associadoIds.has(m.associado_id)) return true;
      if (m.usuario_id && usuarioIdsAssoc.has(m.usuario_id)) return true;
      return false;
    })
    .toArray();

  let totalEntradas = 0;
  let totalSaidas = 0;
  const porTipoSaida: Record<string, number> = {};
  const porTipoEntrada: Record<string, number> = {};
  const porMesMap = new Map<string, { month: string; entradas: number; saidas: number; saldo: number }>();

  for (const t of transacoes) {
    const valor = Number(t.valor) || 0;
    const key = monthKey(t.data);
    const bucket = porMesMap.get(key) ?? { month: key, entradas: 0, saidas: 0, saldo: 0 };

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

  for (const m of todasMensalidades) {
    const valor = Number(m.valor) || 0;
    valorEsperado += valor;
    if (m.data_pagamento) {
      pagas += 1;
      valorRecebido += valor;
    } else {
      pendentes += 1;
    }
  }

  const totalMens = pagas + pendentes;
  const taxaInadimplencia = totalMens > 0 ? pendentes / totalMens : 0;
  const porMes = Array.from(porMesMap.values()).sort((a, b) => a.month.localeCompare(b.month));

  return {
    meta: makeMeta("financeiro", p, periodo),
    resumo: {
      saldoAtual: totalEntradas - totalSaidas + valorRecebido,
      totalEntradas: totalEntradas + valorRecebido,
      totalSaidas,
      taxaInadimplencia,
    },
    agregacoes: {
      porMes,
      porTipoSaida,
      porTipoEntrada,
    },
    detalhes: {
      mensalidades: {
        totalAssociadosAtivos: vinculosAtivos.length,
        pagas,
        pendentes,
        valorRecebido,
        valorEsperado,
        taxaInadimplencia,
      },
    },
  };
}

// ── Mensalidades ──────────────────────────────────────────────────────────────

export async function buscarRelatorioMensalidades(p: BuscarParams): Promise<RelatorioMensalidades> {
  await refreshIfOnline();
  const periodo = resolvePeriodoFromParams(p);

  // Path A: associados com associacao_id direto
  const pathA = await db.associado
    .where("associacao_id").equals(p.associacao_id)
    .filter((a) => !a.deleted_at)
    .toArray();

  const vinculosAtivos = await db.usuario_associacao
    .where("associacao_id").equals(p.associacao_id)
    .filter((v) => v.status === "ativo")
    .toArray();
  const usuarioIdsAssoc = new Set(vinculosAtivos.map((v) => v.usuario_id));

  // Path B: associados cujo usuario_id está nos vínculos da associação
  // (necessário porque mensalidade.associado_id pode apontar para um associado
  // cujo associacao_id no Dexie está nulo/divergente — mas que pertence
  // logicamente à associação via usuario_associacao).
  const pathB = usuarioIdsAssoc.size > 0
    ? await db.associado
        .filter((a) => !a.deleted_at && !!a.usuario_id && usuarioIdsAssoc.has(a.usuario_id))
        .toArray()
    : [];

  const associadosMap = new Map<string, typeof pathA[number]>();
  for (const a of pathA) if (a.id) associadosMap.set(a.id, a);
  for (const a of pathB) if (a.id) associadosMap.set(a.id, a);
  const associados = Array.from(associadosMap.values());

  const associadoIds = new Set(associados.map((a) => a.id).filter(Boolean) as string[]);
  const associadoPorId = new Map(associados.map((a) => [a.id!, a]));
  const associadoPorUsuarioId = new Map<string, typeof associados[number]>();
  for (const a of associados) {
    if (a.usuario_id) associadoPorUsuarioId.set(a.usuario_id, a);
  }

  const perfilLogado = useAuthStore.getState().perfil;

  type MensRow = {
    id: string;
    associadoId: string | null;
    nome: string;
    cpf: string | null;
    valor: number;
    dataPagamento: string | null;
  };

  const mensalidades = await db.mensalidade
    .filter((m) => {
      if (m.deleted_at) return false;
      if (m.associado_id && associadoIds.has(m.associado_id)) return true;
      if (m.usuario_id && usuarioIdsAssoc.has(m.usuario_id)) return true;
      return false;
    })
    .toArray();

  const rows: MensRow[] = mensalidades.map((m) => {
    let nome = "Membro";
    let cpf: string | null = null;
    let associadoIdResolvido: string | null = m.associado_id ?? null;

    if (m.associado_id) {
      const a = associadoPorId.get(m.associado_id);
      if (a) {
        nome = a.nome;
        cpf = a.cpf ?? null;
      }
    } else if (m.usuario_id) {
      const a = associadoPorUsuarioId.get(m.usuario_id);
      if (a) {
        nome = a.nome;
        cpf = a.cpf ?? null;
        associadoIdResolvido = a.id ?? null;
      } else if (m.usuario_id === perfilLogado?.id) {
        nome = perfilLogado?.nome ?? "Você";
        cpf = perfilLogado?.cpf ?? null;
      } else {
        nome = m.usuario_id.slice(0, 8);
      }
    }

    return {
      id: m.id!,
      associadoId: associadoIdResolvido,
      nome,
      cpf,
      valor: Number(m.valor) || 0,
      dataPagamento: m.data_pagamento ?? null,
    };
  });

  const pagasNoPeriodo = rows.filter(
    (m) =>
      m.dataPagamento != null &&
      m.dataPagamento >= periodo.inicio &&
      m.dataPagamento <= periodo.fim,
  );
  const pendentes = rows.filter((m) => m.dataPagamento == null);

  let valorRecebido = 0;
  let valorPendente = 0;
  for (const m of rows) {
    if (m.dataPagamento) valorRecebido += m.valor;
    else valorPendente += m.valor;
  }

  const totalRegistros = rows.length;
  const totalPagas = totalRegistros - pendentes.length;
  const taxaInadimplencia = totalRegistros > 0 ? pendentes.length / totalRegistros : 0;

  return {
    meta: makeMeta("mensalidades", p, periodo),
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
      valorRecebidoNoPeriodo: pagasNoPeriodo.reduce((s, m) => s + m.valor, 0),
    },
    detalhes: {
      pendentes: pendentes.map((m) => ({
        associadoId: m.associadoId,
        nome: m.nome,
        cpf: m.cpf,
        valor: m.valor,
      })),
    },
  };
}

// ── Associados ────────────────────────────────────────────────────────────────

export async function buscarRelatorioAssociados(p: BuscarParams): Promise<RelatorioAssociados> {
  await refreshIfOnline();
  const periodo = resolvePeriodoFromParams(p);

  const associados = await db.associado
    .where("associacao_id").equals(p.associacao_id)
    .filter((a) => !a.deleted_at)
    .toArray();

  const vinculosAtivos = await db.usuario_associacao
    .where("associacao_id").equals(p.associacao_id)
    .filter((v) => v.status === "ativo")
    .toArray();

  const perfilLogado = useAuthStore.getState().perfil;
  const pathAUsuarioIds = new Set(
    associados.flatMap((a) => (a.usuario_id ? [a.usuario_id] : [])),
  );

  const todos: AssociadoDetalhe[] = associados.map((a) => ({
    id: a.id!,
    nome: a.nome,
    cpf: a.cpf ?? null,
    comunidade: a.comunidade ?? null,
    status: a.status,
    dataEntrada: a.data_entrada,
  }));

  // Path B: vínculos ativos sem associado correspondente — usa perfil próprio ou placeholder
  for (const v of vinculosAtivos) {
    if (pathAUsuarioIds.has(v.usuario_id)) continue;
    const isMe = v.usuario_id === perfilLogado?.id;
    todos.push({
      id: v.usuario_id,
      nome: isMe ? (perfilLogado?.nome ?? "Você") : v.usuario_id.slice(0, 8),
      cpf: isMe ? (perfilLogado?.cpf ?? null) : null,
      comunidade: null,
      status: v.status,
      dataEntrada: v.joined_at?.substring(0, 10) ?? v.requested_at.substring(0, 10),
    });
  }

  todos.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  const porStatusMap = new Map<string, number>();
  const porComunidadeMap = new Map<string, number>();
  for (const a of todos) {
    porStatusMap.set(a.status, (porStatusMap.get(a.status) ?? 0) + 1);
    const com = a.comunidade ?? "não informada";
    porComunidadeMap.set(com, (porComunidadeMap.get(com) ?? 0) + 1);
  }

  const novosNoPeriodo = todos.filter(
    (a) => a.dataEntrada >= periodo.inicio && a.dataEntrada <= periodo.fim,
  );

  return {
    meta: makeMeta("associados", p, periodo),
    resumo: {
      total: todos.length,
      ativos: porStatusMap.get("ativo") ?? 0,
      novosNoPeriodo: novosNoPeriodo.length,
    },
    agregacoes: {
      porStatus: Array.from(porStatusMap.entries()).map(([status, total]) => ({ status, total })),
      porComunidade: Array.from(porComunidadeMap.entries())
        .map(([comunidade, total]) => ({ comunidade, total }))
        .sort((a, b) => b.total - a.total),
    },
    detalhes: todos,
  };
}

// ── Área Plantada ─────────────────────────────────────────────────────────────

export interface AreaPlantadaDetalhe {
  id: string;
  associadoId: string;
  nomeAssociado: string;
  cultura: string;
  areaHa: number;
  dataReferencia: string;
  observacao?: string | null;
}

export interface RelatorioAreaPlantada {
  meta: ReportMeta;
  resumo: {
    totalHa: number;
    totalRegistros: number;
    associadosUnicos: number;
    culturasUnicas: number;
  };
  agregacoes: {
    porCultura: { cultura: string; totalHa: number; registros: number }[];
    porAssociado: { associadoId: string; nome: string; totalHa: number; registros: number }[];
    porMes: { mes: string; totalHa: number; registros: number }[];
  };
  detalhes: AreaPlantadaDetalhe[];
}

// ── Exportar CSV ──────────────────────────────────────────────────────────────

/** Separador `;` + BOM para compatibilidade com Excel PT-BR */
function buildCSV(rows: (string | number | null | undefined)[][]): Blob {
  const csv = rows
    .map((row) =>
      row.map((cell) => (cell == null ? "" : String(cell).replace(/;/g, ","))).join(";"),
    )
    .join("\n");
  // BOM (U+FEFF) garante que acentos apareçam corretamente no Excel
  return new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportarCSV(aba: TabKey, data: RelatoriosData): void {
  const metaByTab = {
    producao: data.producao.meta,
    financeiro: data.financeiro.meta,
    mensalidades: data.mensalidades.meta,
    associados: data.associados.meta,
    area_plantada: data.areaPlantada.meta,
  };
  const periodoInicio = metaByTab[aba].periodo.inicio;
  let rows: (string | number | null | undefined)[][];

  if (aba === "producao") {
    rows = [
      ["Associado", "Cultura", "Quantidade", "Data"],
      ...data.producao.detalhes.map((r) => [r.nomeAssociado, r.cultura, r.quantidade, r.data]),
    ];
  } else if (aba === "financeiro") {
    rows = [
      ["Mês", "Entradas (R$)", "Saídas (R$)", "Saldo (R$)"],
      ...data.financeiro.agregacoes.porMes.map((r) => [r.month, r.entradas, r.saidas, r.saldo]),
    ];
  } else if (aba === "mensalidades") {
    rows = [
      ["Nome", "CPF", "Valor Pendente (R$)"],
      ...data.mensalidades.detalhes.pendentes.map((r) => [r.nome, r.cpf ?? "", r.valor]),
    ];
  } else if (aba === "area_plantada") {
    rows = [
      ["Associado", "Cultura", "Área (ha)", "Data Referência"],
      ...data.areaPlantada.detalhes.map((r) => [
        r.nomeAssociado,
        r.cultura,
        r.areaHa,
        r.dataReferencia,
      ]),
    ];
  } else {
    rows = [
      ["Nome", "CPF", "Comunidade", "Status", "Data de Entrada"],
      ...data.associados.detalhes.map((r) => [
        r.nome,
        r.cpf ?? "",
        r.comunidade ?? "Não informada",
        r.status,
        r.dataEntrada,
      ]),
    ];
  }

  downloadBlob(buildCSV(rows), `relatorio-${aba}-${periodoInicio}.csv`);
}

export async function buscarRelatorioAreaPlantada(p: BuscarParams): Promise<RelatorioAreaPlantada> {
  await refreshIfOnline();
  const periodo = resolvePeriodoFromParams(p);

  // Path A: associados com associacao_id direto
  const pathA = await db.associado
    .where("associacao_id").equals(p.associacao_id)
    .filter((a) => !a.deleted_at)
    .toArray();

  // Path B: associados via usuario_id → usuario_associacao
  const vinculosAtivos = await db.usuario_associacao
    .where("associacao_id").equals(p.associacao_id)
    .filter((v) => v.status === "ativo")
    .toArray();
  const usuarioIdsAssoc = new Set(vinculosAtivos.map((v) => v.usuario_id));

  const pathB = usuarioIdsAssoc.size > 0
    ? await db.associado
        .filter((a) => !a.deleted_at && !!a.usuario_id && usuarioIdsAssoc.has(a.usuario_id))
        .toArray()
    : [];

  const associadosMap = new Map<string, typeof pathA[number]>();
  for (const a of pathA) if (a.id) associadosMap.set(a.id, a);
  for (const a of pathB) if (a.id) associadosMap.set(a.id, a);
  const associados = Array.from(associadosMap.values());

  const nomePorAssociado = new Map(associados.map((a) => [a.id!, a.nome]));
  const associadoIdsAssoc = new Set(associados.map((a) => a.id).filter(Boolean) as string[]);

  const registros = await db.area_plantada
    .filter((r) => {
      if (r.deleted_at) return false;
      if (r.data_referencia < periodo.inicio || r.data_referencia > periodo.fim) return false;
      return associadoIdsAssoc.has(r.associado_id);
    })
    .toArray();

  registros.sort((a, b) => a.data_referencia.localeCompare(b.data_referencia));

  const rows: AreaPlantadaDetalhe[] = registros.map((r) => ({
    id: r.id!,
    associadoId: r.associado_id,
    nomeAssociado: nomePorAssociado.get(r.associado_id) ?? r.associado_id.slice(0, 8),
    cultura: r.cultura,
    areaHa: r.area_ha,
    dataReferencia: r.data_referencia,
    observacao: r.observacao,
  }));

  let totalHa = 0;
  const porCulturaMap = new Map<string, { cultura: string; totalHa: number; registros: number }>();
  const porAssociadoMap = new Map<string, { associadoId: string; nome: string; totalHa: number; registros: number }>();
  const porMesMap = new Map<string, { mes: string; totalHa: number; registros: number }>();

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

    const mes = monthKey(row.dataReferencia);
    const mesBucket = porMesMap.get(mes) ?? { mes, totalHa: 0, registros: 0 };
    mesBucket.totalHa += ha;
    mesBucket.registros += 1;
    porMesMap.set(mes, mesBucket);
  }

  return {
    meta: makeMeta("area_plantada", p, periodo),
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
