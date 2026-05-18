import { useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import AppLayout from "./AppLayout";
import { adminNavItems } from "./nav-items";
import { useAuthStore } from "@/store/auth.store";
import { db } from "@/database/db";
import { useLiveQuery } from "@/hooks/useLiveQuery";
import { Input } from "@/components/ui/input";
import { ArrowDownLeft, ArrowUpRight, BarChart3, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import {
  filterTransacoes,
  paginateTransacoes,
  parseDateOnly,
  sortTransacoes,
  summarizeTransacoes,
  type TipoFiltro,
} from "@/lib/financeiro";

const brlCurrencyFormatter = new Intl.NumberFormat("pt-BR", {
   style: "currency",
   currency: "BRL",
   minimumFractionDigits: 2,
   maximumFractionDigits: 2,
 });

function formatCurrency(value: number) {
  return brlCurrencyFormatter.format(value);
}

function formatDate(value: string) {
  const parsed = parseDateOnly(value) ?? new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function FinanceiroResumoPage() {
  const associacaoAtiva = useAuthStore((s) => s.associacaoAtiva);
  const [tipoFiltro, setTipoFiltro] = useState<TipoFiltro>("todas");
  const [busca, setBusca] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [pageState, setPageState] = useState({ key: "", page: 1 });
  const [transacaoExpandida, setTransacaoExpandida] = useState<string | null>(
    null,
  );
  const pageSize = 10;

  const transacoes = useLiveQuery(async () => {
    return db.transacao_financeira.filter((t) => !t.deleted_at).toArray();
  }, []);

  const resumo = useMemo(
    () => summarizeTransacoes(transacoes ?? []),
    [transacoes],
  );

  const transacoesFiltradas = useMemo(() => {
    const filtered = filterTransacoes(transacoes ?? [], {
      tipo: tipoFiltro,
      busca,
      dataInicio,
      dataFim,
    });
    return sortTransacoes(filtered);
  }, [busca, dataInicio, dataFim, tipoFiltro, transacoes]);

  const pageKey = useMemo(
    () =>
      `${busca}|${dataInicio}|${dataFim}|${tipoFiltro}|${transacoes?.length ?? 0}`,
    [busca, dataInicio, dataFim, tipoFiltro, transacoes?.length],
  );

  const currentPage = pageState.key === pageKey ? pageState.page : 1;

  const {
    totalPages: totalPaginas,
    safePage: paginaSegura,
    items: transacoesPaginadas,
  } = useMemo(
    () => paginateTransacoes(transacoesFiltradas, currentPage, pageSize),
    [currentPage, pageSize, transacoesFiltradas],
  );

  if (!associacaoAtiva) {
    return <Navigate to="/solicitacoes" replace />;
  }

  if (associacaoAtiva.role !== "adm") {
    return <Navigate to="/app" replace />;
  }

  return (
    <AppLayout navItems={adminNavItems} title="Financeiro">
      <div className="p-4 lg:p-8 max-w-4xl mx-auto space-y-6">
        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 p-1 bg-[#f6f3ee] rounded-xl w-fit">
          <Link
            to="/app/financeiro/entrada"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-[#414846] hover:bg-white/60 transition-colors"
          >
            <ArrowDownLeft size={16} />
            Entradas
          </Link>
          <Link
            to="/app/financeiro/saida"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-[#414846] hover:bg-white/60 transition-colors"
          >
            <ArrowUpRight size={16} />
            Saidas
          </Link>
          <span className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white shadow-sm text-sm font-semibold text-md-primary">
            <BarChart3 size={16} />
            Resumo
          </span>
        </nav>

        {/* Summary Cards */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-[#e5e2dd] shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-md-primary/10 flex items-center justify-center">
                <Wallet size={20} className="text-md-primary" />
              </div>
              <p className="text-xs font-medium text-[#6b7170] uppercase tracking-wider">Saldo</p>
            </div>
            <p className={`mt-3 font-headline text-2xl font-bold ${resumo.saldo >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
              {formatCurrency(resumo.saldo)}
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-[#e5e2dd] shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <TrendingUp size={20} className="text-emerald-600" />
              </div>
              <p className="text-xs font-medium text-[#6b7170] uppercase tracking-wider">Entradas</p>
            </div>
            <p className="mt-3 font-headline text-2xl font-bold text-emerald-700">
              {formatCurrency(resumo.entradas)}
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-[#e5e2dd] shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                <TrendingDown size={20} className="text-rose-600" />
              </div>
              <p className="text-xs font-medium text-[#6b7170] uppercase tracking-wider">Saidas</p>
            </div>
            <p className="mt-3 font-headline text-2xl font-bold text-rose-700">
              {formatCurrency(resumo.saidas)}
            </p>
          </div>
        </section>

        {/* Filters & Table */}
        <section className="space-y-4">
          <div className="bg-white rounded-2xl border border-[#e5e2dd] shadow-sm p-5 space-y-4">
            <div className="flex flex-col md:flex-row md:items-end gap-4">
              <div className="flex-1 space-y-1.5">
                <label className="text-xs font-medium text-[#6b7170] uppercase tracking-wider">
                  Buscar
                </label>
                <Input
                  placeholder="Descricao ou documento..."
                  className="h-10"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#6b7170] uppercase tracking-wider">
                  Tipo
                </label>
                <select
                  className="h-10 w-full rounded-xl border border-input bg-white px-3 py-2 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  value={tipoFiltro}
                  onChange={(e) =>
                    setTipoFiltro(e.target.value as typeof tipoFiltro)
                  }
                >
                  <option value="todas">Todas</option>
                  <option value="entradas">Entradas</option>
                  <option value="saidas">Saidas</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#6b7170] uppercase tracking-wider">
                  Data inicial
                </label>
                <Input
                  type="date"
                  className="h-10"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#6b7170] uppercase tracking-wider">
                  Data final
                </label>
                <Input
                  type="date"
                  className="h-10"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Transactions List */}
          <div className="bg-white rounded-2xl border border-[#e5e2dd] shadow-sm overflow-hidden">
            <div className="hidden md:grid grid-cols-5 gap-4 px-6 py-3 text-xs font-medium uppercase tracking-wider text-[#6b7170] border-b border-[#f0ede8] bg-[#fcfbf9]">
              <span>Data</span>
              <span>Tipo</span>
              <span className="col-span-2">Detalhes</span>
              <span className="text-right">Valor</span>
            </div>

            {transacoesFiltradas.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <p className="text-sm text-[#6b7170]">
                  Nenhuma transacao encontrada para os filtros atuais.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#f0ede8]">
                {transacoesPaginadas.map((t) => {
                  const isOpen = transacaoExpandida === t.id;
                  const isEntrada = t.tipo !== "despesa";
                  return (
                    <div key={t.id}>
                      <button
                        type="button"
                        onClick={() =>
                          setTransacaoExpandida((current) =>
                            current === t.id ? null : (t.id ?? null),
                          )
                        }
                        className="w-full grid grid-cols-1 md:grid-cols-5 gap-2 md:gap-4 px-6 py-4 text-sm text-[#1c1c19] text-left hover:bg-[#faf9f7] transition-colors"
                      >
                        <span className="text-[#6b7170] md:text-[#1c1c19]">{formatDate(t.data)}</span>
                        <span className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${isEntrada ? "bg-emerald-500" : "bg-rose-500"}`} />
                          <span className={isEntrada ? "text-emerald-700" : "text-rose-700"}>
                            {isEntrada ? "Entrada" : "Saida"}
                          </span>
                        </span>
                        <span className="md:col-span-2 text-[#6b7170] truncate">
                          {t.descricao || "Clique para ver detalhes"}
                        </span>
                        <span className={`text-right font-semibold ${isEntrada ? "text-emerald-700" : "text-rose-700"}`}>
                          {isEntrada ? "+" : "-"}{formatCurrency(t.valor)}
                        </span>
                      </button>
                      {isOpen && (
                        <div className="px-6 pb-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#faf9f7] border border-[#f0ede8] rounded-xl p-4">
                            <div>
                              <p className="text-xs font-medium text-[#6b7170] uppercase tracking-wider">
                                Descricao
                              </p>
                              <p className="mt-1 text-sm">{t.descricao ?? "-"}</p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-[#6b7170] uppercase tracking-wider">
                                Documento
                              </p>
                              <p className="mt-1 text-sm">{t.documento ?? "-"}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pagination */}
          {transacoesFiltradas.length > 0 && (
            <div className="flex flex-col gap-3 items-center justify-between text-sm text-[#6b7170] md:flex-row">
              <span>
                Mostrando {(paginaSegura - 1) * pageSize + 1}
                {"-"}
                {Math.min(
                  paginaSegura * pageSize,
                  transacoesFiltradas.length,
                )}{" "}
                de {transacoesFiltradas.length}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="h-9 px-4 rounded-lg border border-[#e5e2dd] text-sm font-medium hover:bg-[#f6f3ee] disabled:opacity-40 transition-colors"
                  onClick={() =>
                    setPageState({
                      key: pageKey,
                      page: Math.max(1, paginaSegura - 1),
                    })
                  }
                  disabled={paginaSegura === 1}
                >
                  Anterior
                </button>
                <span className="text-[#1c1c19] font-semibold px-2">
                  {paginaSegura} / {totalPaginas}
                </span>
                <button
                  type="button"
                  className="h-9 px-4 rounded-lg border border-[#e5e2dd] text-sm font-medium hover:bg-[#f6f3ee] disabled:opacity-40 transition-colors"
                  onClick={() =>
                    setPageState({
                      key: pageKey,
                      page: Math.min(totalPaginas, paginaSegura + 1),
                    })
                  }
                  disabled={paginaSegura === totalPaginas}
                >
                  Proxima
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  );
}
