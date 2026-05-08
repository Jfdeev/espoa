import type { TransacaoFinanceira } from "@/database/types";

export type TipoFiltro = "todas" | "entradas" | "saidas";

export type FiltroTransacoes = {
  tipo: TipoFiltro;
  busca: string;
  dataInicio: string;
  dataFim: string;
};

export function parseDateOnly(value: string) {
  const match = /^\d{4}-\d{2}-\d{2}$/.exec(value);
  if (!match) return null;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function summarizeTransacoes(transacoes: TransacaoFinanceira[]) {
  let entradas = 0;
  let saidas = 0;

  for (const transacao of transacoes) {
    if (transacao.tipo === "despesa") {
      saidas += transacao.valor;
    } else {
      entradas += transacao.valor;
    }
  }

  return {
    entradas,
    saidas,
    saldo: entradas - saidas,
  };
}

export function filterTransacoes(
  transacoes: TransacaoFinanceira[],
  filtro: FiltroTransacoes,
) {
  const search = filtro.busca.trim().toLowerCase();
  const start = filtro.dataInicio ? new Date(filtro.dataInicio) : null;
  const end = filtro.dataFim ? new Date(filtro.dataFim) : null;

  return transacoes.filter((t) => {
    if (filtro.tipo === "entradas" && t.tipo === "despesa") return false;
    if (filtro.tipo === "saidas" && t.tipo !== "despesa") return false;

    if (search) {
      const descricao = t.descricao?.toLowerCase() ?? "";
      const documento = t.documento?.toLowerCase() ?? "";
      if (!descricao.includes(search) && !documento.includes(search)) {
        return false;
      }
    }

    if (start || end) {
      const data = parseDateOnly(t.data) ?? new Date(t.data);
      if (start && data < start) return false;
      if (end) {
        const endOfDay = new Date(end);
        endOfDay.setHours(23, 59, 59, 999);
        if (data > endOfDay) return false;
      }
    }

    return true;
  });
}

export function sortTransacoes(transacoes: TransacaoFinanceira[]) {
  return [...transacoes].sort((a, b) => {
    const dataB = (parseDateOnly(b.data) ?? new Date(b.data)).getTime();
    const dataA = (parseDateOnly(a.data) ?? new Date(a.data)).getTime();
    if (dataB !== dataA) return dataB - dataA;
    const updatedB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
    const updatedA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
    return updatedB - updatedA;
  });
}

export function paginateTransacoes(
  transacoes: TransacaoFinanceira[],
  page: number,
  pageSize: number,
) {
  const totalPages = Math.max(1, Math.ceil(transacoes.length / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    totalPages,
    safePage,
    items: transacoes.slice(start, start + pageSize),
  };
}
