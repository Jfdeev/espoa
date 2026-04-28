import {
  TrendingUp,
  TriangleAlert,
  Clock,
  UserPlus,
  FileText,
  Wallet,
  Calendar,
  Users,
  Banknote,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/auth.store";
import { useEffect, useState } from "react";
import api from "@/lib/api";

interface AtividadeRecente {
  id: string;
  tipo: string;
  descricao: string;
  data: string;
}

interface DashboardStats {
  totalAssociados: number;
  totalCaixa: number;
  mensalidadesPendentes: number;
  atividadesRecentes: AtividadeRecente[];
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Agora";
  if (minutes < 60) return `Há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Ontem";
  return `Há ${days} dias`;
}

interface QuickAction {
  id: string;
  icon: React.ReactNode;
  label: string;
  href?: string;
}

const quickActions: QuickAction[] = [
  { id: "novo-associado", icon: <UserPlus size={22} />, label: "Novo Associado", href: "/app/associados" },
  { id: "atas", icon: <FileText size={22} />, label: "Lançar Atas" },
  { id: "financeiro", icon: <Wallet size={22} />, label: "Financeiro" },
  { id: "reuniao", icon: <Calendar size={22} />, label: "Agendar Reunião" },
];



export default function AdminDashboard() {
  const navigate = useNavigate();
  const associacaoAtiva = useAuthStore((s) => s.associacaoAtiva);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!associacaoAtiva?.associacaoId) return;
    api
      .get("/dashboard", { params: { associacao_id: associacaoAtiva.associacaoId } })
      .then(({ data }) => setStats(data))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, [associacaoAtiva?.associacaoId]);

  const formatCurrency = (value: number) => {
    if (value >= 1000) return `R$ ${(value / 1000).toFixed(0)}k`;
    return `R$ ${value.toLocaleString("pt-BR")}`;
  };

  return (
    <div className="p-6 lg:p-12 max-w-7xl mx-auto space-y-12">
      {/* Hero */}
      <div>
        <h1 className="font-headline text-3xl lg:text-4xl font-bold text-[#01261f] mb-1">
          Visão Geral
        </h1>
        <p className="text-[#414846]">
          Acompanhe o desempenho da instituição{associacaoAtiva ? ` ${associacaoAtiva.associacaoNome}` : ""}.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Associados */}
        <div className="bg-white rounded-xl p-6 relative overflow-hidden group shadow-sm">
          <div
            aria-hidden="true"
            className="absolute top-0 right-0 w-32 h-32 bg-[#01261f]/5 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110"
          />
          <div className="flex items-start justify-between mb-8 relative z-10">
            <div>
              <p className="font-label text-xs text-[#414846] uppercase tracking-wider mb-1">
                Total Associados
              </p>
              <h3 className="font-headline text-4xl font-bold text-[#01261f]">
                {loading ? "..." : (stats?.totalAssociados.toLocaleString("pt-BR") ?? "0")}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-full bg-[#f6f3ee] flex items-center justify-center text-[#01261f]">
              <Users size={24} />
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-[#414846] relative z-10">
            <TrendingUp size={16} className="text-[#01261f]" />
            <span>associados ativos</span>
          </div>
        </div>

        {/* Total em Caixa */}
        <div
          className="rounded-xl p-6 relative overflow-hidden group shadow-[0_12px_40px_rgba(26,60,52,0.15)]"
          style={{ background: "linear-gradient(135deg, #01261f 0%, #1a3c34 100%)" }}
        >
          <div
            aria-hidden="true"
            className="absolute bottom-0 right-0 w-40 h-40 bg-white/5 rounded-tl-full -mr-10 -mb-10 transition-transform group-hover:scale-110"
          />
          <div className="flex items-start justify-between mb-8 relative z-10">
            <div>
              <p className="font-label text-xs text-white/80 uppercase tracking-wider mb-1">
                Total em Caixa
              </p>
              <h3 className="font-headline text-4xl font-bold text-white">
                {loading ? "..." : formatCurrency(stats?.totalCaixa ?? 0)}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white">
              <Banknote size={24} />
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-white/80 relative z-10">
            <TrendingUp size={16} className="text-[#aacec3]" />
            <span>total recebido</span>
          </div>
        </div>

        {/* Mensalidades Pendentes */}
        <div className="bg-[#f6f3ee] rounded-xl p-6 relative overflow-hidden group border border-[#c1c8c4]/30">
          <div className="flex items-start justify-between mb-8">
            <div>
              <p className="font-label text-xs text-[#414846] uppercase tracking-wider mb-1">
                Mensalidades Pendentes
              </p>
              <h3 className="font-headline text-4xl font-bold text-[#1c1c19]">
                {loading ? "..." : (stats?.mensalidadesPendentes ?? 0)}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-[#381800] shadow-sm">
              <Clock size={24} />
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-[#414846]">
            <TriangleAlert size={16} className="text-[#E67E22]" />
            <span className="font-medium text-[#E67E22]">Atenção Necessária</span>
          </div>
        </div>
      </div>

      {/* Actions + Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions */}
        <div className="lg:col-span-2">
          <h2 className="font-headline text-2xl font-bold text-[#01261f] mb-6">Ações Rápidas</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <button
                key={action.id}
                onClick={() => action.href && navigate(action.href)}
                className="bg-white hover:bg-[#f6f3ee] transition-colors rounded-xl p-4 flex flex-col items-center justify-center gap-3 border border-[#c1c8c4]/30 group"
              >
                <div className="w-12 h-12 rounded-full bg-[#01261f]/5 flex items-center justify-center text-[#01261f] group-hover:bg-[#01261f] group-hover:text-white transition-colors">
                  {action.icon}
                </div>
                <span className="font-label text-sm text-[#1c1c19] font-medium text-center">
                  {action.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Activities */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl p-6 border border-[#c1c8c4]/30 h-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-headline text-xl font-bold text-[#01261f]">
                Atividades Recentes
              </h2>
              <button className="text-sm font-label text-[#01261f] hover:underline">
                Ver todas
              </button>
            </div>

            <div className="space-y-6">
              {loading ? (
                <p className="text-sm text-[#414846]">Carregando...</p>
              ) : stats?.atividadesRecentes.length ? (
                stats.atividadesRecentes.map((item) => (
                  <div key={item.id} className="flex gap-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-[#f6f3ee] text-[#01261f]">
                      <UserPlus size={18} />
                    </div>
                    <div>
                      <p className="text-sm text-[#1c1c19]">
                        <span className="font-semibold">Novo associado</span>
                        {" cadastrado: "}{item.descricao}
                      </p>
                      <p className="text-xs text-[#414846] mt-1">{timeAgo(item.data)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[#414846]">Nenhuma atividade recente.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
