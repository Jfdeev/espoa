import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { TrendingUp, TrendingDown, Wallet, HeartHandshake } from "lucide-react";
import AppLayout from "./AppLayout";
import { memberNavItems } from "./nav-items";
import { useAuthStore } from "@/store/auth.store";
import {
  fetchTransparencia,
  type TransparenciaPeriodo,
  type TransparenciaResult,
} from "@/lib/transparencia-api";

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function formatDate(value: string) {
  const [y, m, d] = value.split("-");
  if (!y || !m || !d) return value;
  return `${d}/${m}/${y}`;
}

const periodOptions: { value: TransparenciaPeriodo; label: string }[] = [
  { value: "mensal", label: "Este mês" },
  { value: "anual", label: "Este ano" },
  { value: "semanal", label: "Últimos 7 dias" },
];

function SummaryCard({
  icon,
  label,
  value,
  hint,
  accent = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  accent?: "default" | "green" | "red" | "primary";
}) {
  const accentClasses = {
    default: "bg-white border-[#c1c8c4]/30",
    green: "bg-emerald-50 border-emerald-200/60",
    red: "bg-rose-50 border-rose-200/60",
    primary: "bg-[#1A3C34] text-white border-[#1A3C34]",
  }[accent];

  const labelClasses =
    accent === "primary" ? "text-white/70" : "text-[#414846]";
  const valueClasses =
    accent === "primary" ? "text-white" : "text-[#01261f]";
  const hintClasses =
    accent === "primary" ? "text-white/60" : "text-[#414846]/70";

  return (
    <div
      className={`rounded-xl border p-6 flex flex-col gap-3 ${accentClasses}`}
    >
      <div className="flex items-center gap-3">
        <span
          className={
            accent === "primary"
              ? "text-white/80"
              : "text-[#1A3C34]"
          }
        >
          {icon}
        </span>
        <span className={`font-label text-sm uppercase tracking-wider ${labelClasses}`}>
          {label}
        </span>
      </div>
      <div className={`font-headline text-2xl lg:text-3xl font-bold ${valueClasses}`}>
        {value}
      </div>
      {hint && <p className={`text-xs ${hintClasses}`}>{hint}</p>}
    </div>
  );
}

export default function TransparenciaPage() {
  const associacaoAtiva = useAuthStore((s) => s.associacaoAtiva);
  const [periodo, setPeriodo] = useState<TransparenciaPeriodo>("mensal");
  const [data, setData] = useState<TransparenciaResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!associacaoAtiva) return;
    const assocAtiva = associacaoAtiva;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setErro(null);
      try {
        const r = await fetchTransparencia({
          associacaoId: assocAtiva.associacaoId,
          periodo,
        });
        if (!cancelled) setData(r);
      } catch (e) {
        if (cancelled) return;
        const err = e as { response?: { data?: { error?: string } }; message?: string };
        const message =
          err?.response?.data?.error ??
          err?.message ??
          "Não foi possível carregar a transparência.";
        setErro(String(message));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [associacaoAtiva, periodo]);

  const distribuicao = data?.distribuicaoGastos ?? [];
  const ultimasSaidas = data?.ultimasSaidas ?? [];

  const periodoTexto = useMemo(() => {
    if (!data) return "";
    const { inicio, fim } = data.meta.periodo;
    return `${formatDate(inicio)} a ${formatDate(fim)}`;
  }, [data]);

  if (!associacaoAtiva) {
    return <Navigate to="/solicitacoes" replace />;
  }

  return (
    <AppLayout
      navItems={memberNavItems}
      title={associacaoAtiva.associacaoNome}
    >
      <div className="flex justify-center items-start pt-8 pb-12 px-6">
        <div className="max-w-4xl w-full flex flex-col gap-8">
          {/* Cabeçalho */}
          <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1 className="font-headline text-3xl lg:text-4xl font-bold text-[#01261f]">
                Para onde vai seu dinheiro
              </h1>
              <p className="text-[#414846] mt-2 max-w-xl">
                Veja como a associação usa o que arrecada — incluindo sua contribuição.
              </p>
            </div>
            <div className="flex gap-2">
              {periodOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPeriodo(opt.value)}
                  className={`px-4 py-2 rounded-full text-sm font-label transition-colors ${
                    periodo === opt.value
                      ? "bg-[#1A3C34] text-white"
                      : "bg-white text-[#1A3C34] border border-[#1A3C34]/20 hover:bg-[#1A3C34]/5"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </header>

          {erro && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 p-4 text-sm text-rose-800">
              {erro}
            </div>
          )}

          {loading && !data && (
            <div className="rounded-lg bg-white border border-[#c1c8c4]/30 p-8 text-center text-[#414846]">
              Carregando dados de transparência…
            </div>
          )}

          {data && (
            <>
              {periodoTexto && (
                <p className="text-xs text-[#414846]/70 -mt-4">
                  Período: {periodoTexto}
                </p>
              )}

              {/* Cards de resumo */}
              <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <SummaryCard
                  icon={<TrendingUp size={20} />}
                  label="Arrecadado"
                  value={brl.format(data.resumo.totalArrecadado)}
                  accent="green"
                />
                <SummaryCard
                  icon={<TrendingDown size={20} />}
                  label="Gasto"
                  value={brl.format(data.resumo.totalGasto)}
                  accent="red"
                />
                <SummaryCard
                  icon={<Wallet size={20} />}
                  label="Saldo do período"
                  value={brl.format(data.resumo.saldoPeriodo)}
                />
                <SummaryCard
                  icon={<HeartHandshake size={20} />}
                  label="Sua contribuição"
                  value={brl.format(data.resumo.suaContribuicao)}
                  hint={
                    data.resumo.percentualContribuicao > 0
                      ? `Equivale a ${data.resumo.percentualContribuicao.toFixed(1)}% do que foi arrecadado.`
                      : "Você ainda não tem mensalidade registrada neste período."
                  }
                  accent="primary"
                />
              </section>

              {/* Distribuição de gastos */}
              <section className="rounded-xl bg-white border border-[#c1c8c4]/30 p-6">
                <h2 className="font-headline text-xl font-bold text-[#01261f] mb-4">
                  Onde o dinheiro foi gasto
                </h2>
                {distribuicao.length === 0 ? (
                  <p className="text-sm text-[#414846]">
                    Nenhum gasto registrado neste período.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {distribuicao.map((d) => (
                      <div key={d.categoria}>
                        <div className="flex items-baseline justify-between mb-1">
                          <span className="text-sm font-medium text-[#1c1c19]">
                            {d.categoria}
                          </span>
                          <span className="text-sm text-[#414846]">
                            {brl.format(d.total)}{" "}
                            <span className="text-xs text-[#414846]/70">
                              ({d.percentual.toFixed(1)}%)
                            </span>
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-[#ebe8e3] overflow-hidden">
                          <div
                            className="h-full bg-[#1A3C34]"
                            style={{ width: `${Math.min(d.percentual, 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Últimas saídas */}
              <section className="rounded-xl bg-white border border-[#c1c8c4]/30 p-6">
                <h2 className="font-headline text-xl font-bold text-[#01261f] mb-4">
                  Últimos gastos
                </h2>
                {ultimasSaidas.length === 0 ? (
                  <p className="text-sm text-[#414846]">
                    Nenhum gasto recente.
                  </p>
                ) : (
                  <ul className="divide-y divide-[#c1c8c4]/30">
                    {ultimasSaidas.map((s, i) => (
                      <li
                        key={`${s.data}-${i}`}
                        className="py-3 flex items-center justify-between gap-4"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[#1c1c19] truncate">
                            {s.descricao ?? s.categoria}
                          </p>
                          <p className="text-xs text-[#414846]/70">
                            {s.categoria} · {formatDate(s.data)}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-[#01261f] shrink-0">
                          {brl.format(s.valor)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
