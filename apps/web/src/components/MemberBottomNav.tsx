import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  BanknoteArrowUp,
  BookOpen,
  PieChart,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomNavItem {
  label: string;
  icon: React.ReactNode;
  href: string;
}

const items: BottomNavItem[] = [
  { label: "Início", icon: <LayoutDashboard size={22} />, href: "/app" },
  {
    label: "Mensal.",
    icon: <BanknoteArrowUp size={22} />,
    href: "/app/mensalidades",
  },
  { label: "Atas", icon: <BookOpen size={22} />, href: "/app/atas" },
  {
    label: "Onde vai",
    icon: <PieChart size={22} />,
    href: "/app/transparencia",
  },
  {
    label: "Assistente",
    icon: <Sparkles size={22} />,
    href: "/app/assistente",
  },
];

/**
 * Tab bar fixa no rodapé para o perfil Associado em mobile.
 * Cumpre FUND-04 (navegação dedicada do agricultor).
 * Esconde em desktop (substituída pela sidebar).
 */
export function MemberBottomNav() {
  const location = useLocation();

  return (
    <nav
      aria-label="Navegação principal"
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-[#1A3C34]/10 shadow-[0_-4px_12px_rgba(28,28,25,0.04)]"
    >
      <ul className="grid grid-cols-5">
        {items.map((item) => {
          const isActive =
            item.href === "/app"
              ? location.pathname === "/app"
              : location.pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                to={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-label transition-colors",
                  isActive
                    ? "text-[#1A3C34]"
                    : "text-[#414846]/70 hover:text-[#1A3C34]",
                )}
              >
                <span
                  className={cn(
                    "p-1.5 rounded-full transition-colors",
                    isActive && "bg-[#1A3C34]/10",
                  )}
                >
                  {item.icon}
                </span>
                <span className="truncate max-w-[60px]">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
