import { Link, Navigate } from "react-router-dom";
import AppLayout from "./AppLayout";
import { adminNavItems } from "./nav-items";
import { useAuthStore } from "@/store/auth.store";
import { db } from "@/database/db";
import { useLiveQuery } from "@/hooks/useLiveQuery";

function formatCurrency(value: number) {
  return `R$ ${value.toLocaleString("pt-BR")}`;
}

export default function FinanceiroResumoPage() {
  const associacaoAtiva = useAuthStore((s) => s.associacaoAtiva);

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
      </div>
    </AppLayout>
  );
}
