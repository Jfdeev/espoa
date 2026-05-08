import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import AppLayout from "./AppLayout";
import { adminNavItems } from "./nav-items";
import { useAuthStore } from "@/store/auth.store";
import { db } from "@/database/db";
import { useLiveQuery } from "@/hooks/useLiveQuery";
import { Input } from "@/components/ui/input";

function formatCurrency(value: number) {
  return `R$ ${value.toLocaleString("pt-BR")}`;
}

function parseDateOnly(value: string) {
  const match = /^\d{4}-\d{2}-\d{2}$/.exec(value);
  if (!match) return null;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
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
  const [tipoFiltro, setTipoFiltro] = useState<"todas" | "entradas" | "saidas">(
    "todas",
  );
  const [busca, setBusca] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [transacaoExpandida, setTransacaoExpandida] = useState<string | null>(
    null,
  );
  const pageSize = 10;

  const resumo = useLiveQuery(
    async () => {
      const transacoes = await db.transacao_financeira
        .filter((t) => !t.deleted_at)
        .toArray();

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
    },
    { entradas: 0, saidas: 0, saldo: 0 },
  );

  const transacoes = useLiveQuery(async () => {
    return db.transacao_financeira.filter((t) => !t.deleted_at).toArray();
  }, []);

  const transacoesFiltradas = useMemo(() => {
    const search = busca.trim().toLowerCase();
    const start = dataInicio ? new Date(dataInicio) : null;
    const end = dataFim ? new Date(dataFim) : null;

    return (transacoes ?? [])
      .filter((t) => {
        if (tipoFiltro === "entradas" && t.tipo === "despesa") return false;
        if (tipoFiltro === "saidas" && t.tipo !== "despesa") return false;

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
      })
      .sort((a, b) => {
        const dataB = (parseDateOnly(b.data) ?? new Date(b.data)).getTime();
        const dataA = (parseDateOnly(a.data) ?? new Date(a.data)).getTime();
        if (dataB !== dataA) return dataB - dataA;
        const updatedB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
        const updatedA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
        return updatedB - updatedA;
      });
  }, [busca, dataInicio, dataFim, tipoFiltro, transacoes]);

  useEffect(() => {
    setPaginaAtual(1);
  }, [busca, dataInicio, dataFim, tipoFiltro]);

  const totalPaginas = Math.max(
    1,
    Math.ceil(transacoesFiltradas.length / pageSize),
  );

  const paginaSegura = Math.min(paginaAtual, totalPaginas);

  const transacoesPaginadas = useMemo(() => {
    const start = (paginaSegura - 1) * pageSize;
    return transacoesFiltradas.slice(start, start + pageSize);
  }, [paginaSegura, transacoesFiltradas]);

  if (!associacaoAtiva) {
    return <Navigate to="/solicitacoes" replace />;
  }

  if (associacaoAtiva.role !== "adm") {
    return <Navigate to="/app" replace />;
  }

  return (
    <AppLayout navItems={adminNavItems} title="Financeiro">
      <div className="p-6 lg:p-12 max-w-4xl mx-auto space-y-8">
        <header className="space-y-2">
          <h1 className="font-headline text-3xl font-bold text-md-primary">
            Resumo financeiro
          </h1>
          <p className="text-[#414846]">
            Acompanhe saldo e totais da associacao.
          </p>
          <div className="flex items-center gap-3 text-sm">
            <Link
              to="/app/financeiro/entrada"
              className="text-[#414846] hover:text-md-primary"
            >
              Entradas
            </Link>
            <span className="text-[#c1c8c4]">|</span>
            <Link
              to="/app/financeiro/saida"
              className="text-[#414846] hover:text-md-primary"
            >
              Saidas
            </Link>
            <span className="text-[#c1c8c4]">|</span>
            <span className="font-semibold text-md-primary">Resumo</span>
          </div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-6 border border-[#c1c8c4]/30">
            <p className="text-xs uppercase tracking-wider text-[#414846]">
              Saldo atual
            </p>
            <p className="mt-4 font-headline text-3xl font-bold text-md-primary">
              {formatCurrency(resumo.saldo)}
            </p>
          </div>

          <div className="bg-[#f6f3ee] rounded-2xl p-6 border border-[#c1c8c4]/30">
            <p className="text-xs uppercase tracking-wider text-[#414846]">
              Total de entradas
            </p>
            <p className="mt-4 font-headline text-3xl font-bold text-[#1c1c19]">
              {formatCurrency(resumo.entradas)}
            </p>
          </div>

          <div className="bg-[#f6f3ee] rounded-2xl p-6 border border-[#c1c8c4]/30">
            <p className="text-xs uppercase tracking-wider text-[#414846]">
              Total de saidas
            </p>
            <p className="mt-4 font-headline text-3xl font-bold text-[#1c1c19]">
              {formatCurrency(resumo.saidas)}
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex flex-col gap-4 rounded-2xl border border-[#c1c8c4]/30 bg-white p-6">
            <div className="flex flex-col md:flex-row md:items-end gap-4">
              <div className="flex-1 space-y-2">
                <label className="text-xs uppercase tracking-wider text-[#414846]">
                  Buscar
                </label>
                <Input
                  placeholder="Descricao ou documento"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-[#414846]">
                  Tipo
                </label>
                <select
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
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
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-[#414846]">
                  Data inicial
                </label>
                <Input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-[#414846]">
                  Data final
                </label>
                <Input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#c1c8c4]/30 bg-white">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 px-6 py-4 text-xs uppercase tracking-wider text-[#414846] border-b border-[#c1c8c4]/30">
              <span>Data</span>
              <span>Tipo</span>
              <span className="md:col-span-2">Detalhes</span>
              <span className="text-right">Valor</span>
            </div>

            {transacoesFiltradas.length === 0 ? (
              <div className="px-6 py-6 text-sm text-[#414846]">
                Nenhuma transacao encontrada para os filtros atuais.
              </div>
            ) : (
              <div className="divide-y divide-[#c1c8c4]/30">
                {transacoesPaginadas.map((t) => {
                  const isOpen = transacaoExpandida === t.id;
                  return (
                    <div key={t.id}>
                      <button
                        type="button"
                        onClick={() =>
                          setTransacaoExpandida((current) =>
                            current === t.id ? null : (t.id ?? null),
                          )
                        }
                        className="w-full grid grid-cols-1 md:grid-cols-5 gap-4 px-6 py-4 text-sm text-[#1c1c19] text-left hover:bg-[#f6f3ee] transition-colors"
                      >
                        <span>{formatDate(t.data)}</span>
                        <span
                          className={
                            t.tipo === "despesa"
                              ? "text-red-700"
                              : "text-md-primary"
                          }
                        >
                          {t.tipo === "despesa" ? "Saida" : "Entrada"}
                        </span>
                        <span className="md:col-span-2 text-[#414846]">
                          Clique para ver detalhes
                        </span>
                        <span className="text-right font-semibold">
                          {formatCurrency(t.valor)}
                        </span>
                      </button>
                      {isOpen && (
                        <div className="px-6 pb-5 text-sm text-[#1c1c19]">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#fcf9f4] border border-[#e5e2dd] rounded-xl p-4">
                            <div>
                              <p className="text-xs uppercase tracking-wider text-[#414846]">
                                Descricao
                              </p>
                              <p className="mt-1">{t.descricao ?? "-"}</p>
                            </div>
                            <div>
                              <p className="text-xs uppercase tracking-wider text-[#414846]">
                                Documento
                              </p>
                              <p className="mt-1">{t.documento ?? "-"}</p>
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

          {transacoesFiltradas.length > 0 && (
            <div className="flex flex-col gap-3 items-center justify-between text-sm text-[#414846] md:flex-row">
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
                  className="h-8 px-3 rounded-lg border border-[#c1c8c4]/50 disabled:opacity-50"
                  onClick={() => setPaginaAtual((p) => Math.max(1, p - 1))}
                  disabled={paginaSegura === 1}
                >
                  Anterior
                </button>
                <span className="text-[#1c1c19] font-semibold">
                  Pagina {paginaSegura} de {totalPaginas}
                </span>
                <button
                  type="button"
                  className="h-8 px-3 rounded-lg border border-[#c1c8c4]/50 disabled:opacity-50"
                  onClick={() =>
                    setPaginaAtual((p) => Math.min(totalPaginas, p + 1))
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
