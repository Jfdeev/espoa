import { LayoutDashboard, Wheat, Leaf, Users } from "lucide-react";

export interface NavItem {
  label: string;
  icon: React.ReactNode;
  href: string;
}

export const adminNavItems: NavItem[] = [
  { label: "Menu Principal", icon: <LayoutDashboard size={20} />, href: "/app" },
  { label: "Propriedades", icon: <Wheat size={20} />, href: "/app/propriedades" },
  { label: "Colheitas", icon: <Leaf size={20} />, href: "/app/colheitas" },
  { label: "Associados", icon: <Users size={20} />, href: "/app/associados" },
];

export const memberNavItems: NavItem[] = [
  { label: "Dashboard", icon: <LayoutDashboard size={20} />, href: "/app" },
  { label: "Propriedades", icon: <Wheat size={20} />, href: "/app/propriedades" },
  { label: "Colheita", icon: <Leaf size={20} />, href: "/app/colheitas" },
  { label: "Associações", icon: <Users size={20} />, href: "/app/associacoes" },
];
