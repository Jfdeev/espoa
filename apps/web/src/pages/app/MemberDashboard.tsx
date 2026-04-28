import { Plus, BarChart3, Package, CloudSun, TriangleAlert } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "@/lib/utils";

type CardVariant = "primary" | "default";
type ActivityVariant = "default" | "warning";

interface ActionCardData {
  id: string;
  icon: React.ReactNode;
  label: string;
  description: string;
  href: string;
  variant?: CardVariant;
}

interface ActivityItemData {
  id: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  time: string;
  variant: ActivityVariant;
}

const actionCards: ActionCardData[] = [
  {
    id: "colheita",
    icon: <Plus size={28} />,
    label: "Registrar Colheita",
    description: "Registre seus rendimentos e métricas mais recentes.",
    href: "/app/colheitas/novo",
    variant: "primary",
  },
  {
    id: "pagamento",
    icon: <BarChart3 size={28} />,
    label: "Realizar Pagamento",
    description: "Analise o desempenho da temporada.",
    href: "/app/pagamentos",
  },
  {
    id: "inventario",
    icon: <Package size={28} />,
    label: "Inventário Coletivo",
    description: "Veja os produtos da associação que sobraram.",
    href: "/app/inventario",
  },
  {
    id: "clima",
    icon: <CloudSun size={28} />,
    label: "Clima Local",
    description: "Planeje em torno das condições climáticas futuras.",
    href: "/app/clima",
  },
];

const activityItems: ActivityItemData[] = [
  {
    id: "act-1",
    icon: <Package size={18} />,
    title: "Entrega de Fertilizante Recebida",
    subtitle: "Armazenamento Setor B",
    time: "2 h atrás",
    variant: "default",
  },
  {
    id: "act-2",
    icon: <TriangleAlert size={18} />,
    title: "Alerta de Irrigação",
    subtitle: "Pressão baixa na Bomba 3",
    time: "5 h atrás",
    variant: "warning",
  },
];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function ActionCard({ card }: { card: ActionCardData }) {
  const isPrimary = card.variant === "primary";
  return (
    <a
      href={card.href}
      className={cn(
        "group relative overflow-hidden rounded-xl p-8 flex flex-col items-center justify-center gap-6 min-h-[240px] hover:bg-[#f6f3ee] transition-colors duration-300",
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
    </a>
  );
}

export default function MemberDashboard() {
  const perfil = useAuthStore((s) => s.perfil);
  const firstName = perfil?.nome?.split(" ")[0] ?? "usuário";

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

        {/* Bento Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {actionCards.map((card) => (
            <ActionCard key={card.id} card={card} />
          ))}
        </section>

        {/* Recent Activity */}
        <section className="rounded-xl bg-[#f6f3ee] p-8 border border-[#c1c8c4]/30">
          <h2 className="font-headline text-xl font-bold text-[#01261f] mb-6 pb-4 border-b border-[#c1c8c4]/30">
            Atividades Recentes da Instituição
          </h2>
          <div className="space-y-3">
            {activityItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 bg-white rounded-lg hover:bg-[#fcf9f4] transition-colors"
              >
                <div className="flex items-center gap-4">
                  <span
                    className={item.variant === "warning" ? "text-[#E67E22]" : "text-[#656461]"}
                  >
                    {item.icon}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-[#1c1c19]">{item.title}</p>
                    <p className="text-xs text-[#414846]">{item.subtitle}</p>
                  </div>
                </div>
                <span className="font-label text-xs text-[#414846] uppercase tracking-wider shrink-0 ml-4">
                  {item.time}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
