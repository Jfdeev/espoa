import { Plus, BanknoteArrowUp, Leaf, PieChart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/auth.store";
import { db } from "@/database/db";
import { useLiveQuery } from "@/hooks/useLiveQuery";
import { cn } from "@/lib/utils";
import { ResumoMesCard } from "@/components/ResumoMesCard";
import { AvisosMembroCard } from "@/components/AvisosMembroCard";

type CardVariant = "primary" | "default";

interface ActionCardData {
  id: string;
  icon: React.ReactNode;
  label: string;
  description: string;
  href: string;
  variant?: CardVariant;
  state?: Record<string, unknown>;
}

const actionCards: ActionCardData[] = [
  {
    id: "colheita",
    icon: <Plus size={28} />,
    label: "Registrar Produção",
    description: "Registre seus rendimentos e métricas mais recentes.",
    href: "/app/colheitas",
    state: { openForm: true },
    variant: "primary",
  },
  {
    id: "transparencia",
    icon: <PieChart size={28} />,
    label: "Para onde vai seu dinheiro",
    description: "Veja como a associação usa o que arrecada.",
    href: "/app/transparencia",
  },
  {
    id: "mensalidade",
    icon: <BanknoteArrowUp size={28} />,
    label: "Minhas Mensalidades",
    description: "Acompanhe pagamentos e status das suas mensalidades.",
    href: "/app/mensalidades",
  },
];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
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

function ActionCard({ card }: { card: ActionCardData }) {
  const navigate = useNavigate();
  const isPrimary = card.variant === "primary";
  return (
    <button
      type="button"
      onClick={() => navigate(card.href, card.state ? { state: card.state } : undefined)}
      className={cn(
        "group relative overflow-hidden rounded-xl p-8 flex flex-col items-center justify-center gap-6 min-h-[240px] hover:bg-[#f6f3ee] transition-colors duration-300 text-left w-full",
        isPrimary
          ? "bg-white shadow-[0_12px_40px_rgba(28,28,25,0.06)]"
          : "bg-white border border-[#c1c8c4]/30",
      )}
    >
      <div
        className={cn(
          "w-16 h-16 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300",
          isPrimary ? "bg-[#1a3c34] text-white" : "bg-[#ebe8e3] text-[#414846]",
        )}
      >
        {card.icon}
      </div>
      <div className="text-center">
        <h3 className="font-headline text-xl font-bold text-[#01261f] mb-2">{card.label}</h3>
        <p className="text-sm text-[#414846]">{card.description}</p>
      </div>
    </button>
  );
}

export default function MemberDashboard() {
  const perfil = useAuthStore((s) => s.perfil);
  const associacaoAtiva = useAuthStore((s) => s.associacaoAtiva);
  const firstName = perfil?.nome?.split(" ")[0] ?? "usuário";

  // Produções recentes — filtra pela associação ativa para não misturar dados
  const producaoRecente = useLiveQuery(async () => {
    if (!associacaoAtiva) return [];
    const ids = await db.associado
      .where("associacao_id").equals(associacaoAtiva.associacaoId)
      .filter((a) => !a.deleted_at)
      .primaryKeys() as string[];
    const items = await db.producao.filter((p) => !p.deleted_at && ids.includes(p.associado_id)).toArray();
    return items
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 5);
  }, [], [associacaoAtiva?.associacaoId]);

  return (
    <div className="flex justify-center items-start pt-8 pb-4 px-6">
      <div className="max-w-4xl w-full flex flex-col gap-12">
        {/* Greeting Hero */}
        <section className="text-center space-y-2">
          <h1 className="font-headline text-3xl lg:text-4xl font-bold text-[#01261f]">
            {getGreeting()}, {firstName}.
          </h1>
          <p className="text-[#414846]">Sua colheita está com boa perspectiva hoje.</p>
        </section>

        {/* Avisos da associação */}
        <AvisosMembroCard />

        {/* Resumo do mês gerado por IA — esconde silenciosamente se IA não configurada */}
        <ResumoMesCard />

        {/* Bento Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {actionCards.map((card) => (
            <ActionCard key={card.id} card={card} />
          ))}
        </section>

        {/* Produções recentes do Dexie — sem rede necessária */}
        <section className="rounded-xl bg-[#f6f3ee] p-8 border border-[#c1c8c4]/30">
          <h2 className="font-headline text-xl font-bold text-[#01261f] mb-6 pb-4 border-b border-[#c1c8c4]/30">
            Produções Recentes
          </h2>
          {producaoRecente.length === 0 ? (
            <p className="text-sm text-[#414846]">Nenhuma produção registrada ainda.</p>
          ) : (
            <div className="space-y-3">
              {producaoRecente.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 bg-white rounded-lg hover:bg-[#fcf9f4] transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-[#656461]">
                      <Leaf size={18} />
                    </span>
                    <div>
                      <p className="text-sm font-medium text-[#1c1c19]">{item.cultura}</p>
                      <p className="text-xs text-[#414846]">{item.quantidade} un.</p>
                    </div>
                  </div>
                  <span className="font-label text-xs text-[#414846] uppercase tracking-wider shrink-0 ml-4">
                    {timeAgo(item.updated_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
