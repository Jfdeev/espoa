import api from "@/lib/api";

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
}

export type TabKey = "producao" | "financeiro" | "mensalidades" | "associados";

// ── Parâmetros de busca ───────────────────────────────────────────────────────

export interface BuscarParams {
  associacao_id: string;
  periodo: string;
  inicio?: string;
  fim?: string;
}

// ── Funções de fetch ──────────────────────────────────────────────────────────

export async function buscarRelatorioProducao(p: BuscarParams): Promise<RelatorioProducao> {
  const { data } = await api.get<RelatorioProducao>("/relatorios/producao", { params: p });
  return data;
}

export async function buscarRelatorioFinanceiro(p: BuscarParams): Promise<RelatorioFinanceiro> {
  const { data } = await api.get<RelatorioFinanceiro>("/relatorios/financeiro", { params: p });
  return data;
}

export async function buscarRelatorioMensalidades(p: BuscarParams): Promise<RelatorioMensalidades> {
  const { data } = await api.get<RelatorioMensalidades>("/relatorios/mensalidades", { params: p });
  return data;
}

export async function buscarRelatorioAssociados(p: BuscarParams): Promise<RelatorioAssociados> {
  const { data } = await api.get<RelatorioAssociados>("/relatorios/associados", { params: p });
  return data;
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
  const periodoInicio = data[aba].meta.periodo.inicio;
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
