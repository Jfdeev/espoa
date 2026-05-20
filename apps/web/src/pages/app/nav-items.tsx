import {
  LayoutDashboard,
  Leaf,
  Users,
  Wallet,
  BanknoteArrowUp,
  FileText,
  BarChart3,
  BookOpen,
  PieChart,
  Megaphone,
  Sparkles,
} from "lucide-react";

export interface NavItem {
  label: string;
  icon: React.ReactNode;
  href: string;
}

export const adminNavItems: NavItem[] = [
  {
    label: "Menu Principal",
    icon: <LayoutDashboard size={20} />,
    href: "/app",
  },
  { label: "Associados", icon: <Users size={20} />, href: "/app/associados" },
  { label: "Produção", icon: <Leaf size={20} />, href: "/app/colheitas" },
  {
    label: "Financeiro",
    icon: <Wallet size={20} />,
    href: "/app/financeiro/entrada",
  },
  { label: "Editais PNAE", icon: <FileText size={20} />, href: "/app/editais" },
  { label: "Atas", icon: <BookOpen size={20} />, href: "/app/atas" },
  { label: "Avisos", icon: <Megaphone size={20} />, href: "/app/avisos" },
  {
    label: "Mensalidades",
    icon: <BanknoteArrowUp size={20} />,
    href: "/app/mensalidades",
  },
  { label: "Relatórios", icon: <BarChart3 size={20} />, href: "/app/relatorios" },
  {
    label: "Inteligência",
    icon: <Sparkles size={20} />,
    href: "/app/inteligencia",
  },
  {
    label: "Assistente",
    icon: <Sparkles size={20} />,
    href: "/app/assistente",
  },
];

export const memberNavItems: NavItem[] = [
  { label: "Dashboard", icon: <LayoutDashboard size={20} />, href: "/app" },
  { label: "Produção", icon: <Leaf size={20} />, href: "/app/colheitas" },
  { label: "Atas", icon: <BookOpen size={20} />, href: "/app/atas" },
  {
    label: "Mensalidades",
    icon: <BanknoteArrowUp size={20} />,
    href: "/app/mensalidades",
  },
  {
    label: "Transparência",
    icon: <PieChart size={20} />,
    href: "/app/transparencia",
  },
  {
    label: "Assistente",
    icon: <Sparkles size={20} />,
    href: "/app/assistente",
  },
  {
    label: "Dicas",
    icon: <Sparkles size={20} />,
    href: "/app/dicas",
  },
];
