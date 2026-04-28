import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Leaf,
  Settings,
  Home,
  ClipboardList,
  User,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import type { NavItem } from "./nav-items";

interface AppLayoutProps {
  children: React.ReactNode;
  navItems: NavItem[];
  title?: string;
}

const bottomNavItems = [
  { id: "home", label: "Home", icon: <Home size={22} />, href: "/app" },
  { id: "colheitas", label: "Colheitas", icon: <Leaf size={22} />, href: "/app/colheitas" },
  { id: "solicitacoes", label: "Solicitações", icon: <ClipboardList size={22} />, href: "/solicitacoes" },
  { id: "conta", label: "Conta", icon: <User size={22} />, href: "/app/conta" },
];

// ── Shared sub-components ────────────────────────────────────────────────────

function ProfileAvatar({ url, size = "md" }: { url?: string; size?: "sm" | "md" }) {
  const isSmall = size === "sm";
  return (
    <div
      className={cn(
        "rounded-full bg-[#ebe8e3] overflow-hidden flex items-center justify-center flex-shrink-0",
        isSmall ? "w-9 h-9" : "w-12 h-12",
      )}
    >
      {url ? (
        <img src={url} alt="Foto de perfil" className="w-full h-full object-cover" />
      ) : (
        <User size={isSmall ? 18 : 24} className="text-[#1A3C34]/60" />
      )}
    </div>
  );
}

function NavList({
  items,
  currentPath,
  onNavigate,
}: {
  items: NavItem[];
  currentPath: string;
  onNavigate?: () => void;
}) {
  return (
    <ul className="flex-1 space-y-1 overflow-y-auto">
      {items.map((item) => {
        const isActive = currentPath === item.href;
        return (
          <li key={item.href}>
            <Link
              to={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 py-3 text-sm rounded-r-xl transition-all",
                isActive
                  ? "text-[#1A3C34] font-bold border-l-4 border-[#E67E22] pl-4 bg-[#1A3C34]/5"
                  : "text-[#1A3C34]/70 pl-5 hover:bg-[#1A3C34]/5",
              )}
            >
              {item.icon}
              <span className="font-label">{item.label}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function SettingsLink({ onClick }: { onClick?: () => void }) {
  return (
    <div className="pt-4 border-t border-[#1A3C34]/10">
      <Link
        to="/app/configuracoes"
        onClick={onClick}
        className="flex items-center gap-3 py-3 pl-5 text-sm text-[#1A3C34]/70 hover:bg-[#1A3C34]/5 rounded-xl transition-colors"
      >
        <Settings size={20} />
        <span className="font-label">Configurações</span>
      </Link>
    </div>
  );
}

function LogoutButton({ onClick }: { onClick?: () => void }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const limpar = useAuthStore((s) => s.limpar);

  const handleLogout = () => {
    setOpen(false);
    onClick?.();
    limpar();
    navigate("/login", { replace: true });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 py-3 pl-5 text-sm text-red-600/80 hover:bg-red-50 rounded-xl transition-colors"
      >
        <LogOut size={20} />
        <span className="font-label">Sair</span>
      </button>

      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Sair da conta</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja sair? Você precisará fazer login novamente.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Cancelar
          </DialogClose>
          <Button variant="destructive" onClick={handleLogout}>
            Sair
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main layout ──────────────────────────────────────────────────────────────

export default function AppLayout({ children, navItems, title }: AppLayoutProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();
  const perfil = useAuthStore((s) => s.perfil);
  const associacaoAtiva = useAuthStore((s) => s.associacaoAtiva);

  const appTitle = title ?? associacaoAtiva?.associacaoNome ?? "Espoa";
  const closeDrawer = () => setDrawerOpen(false);

  return (
    <div className="min-h-screen bg-[#fcf9f4] text-[#1c1c19] font-body antialiased">
      {/* ── Desktop Sidebar ─────────────────────────────────── */}
      <nav className="hidden lg:flex flex-col h-screen w-72 fixed left-0 top-0 bg-[#F5F2ED] border-r border-[#1A3C34]/10 z-50 p-6">
        <div className="flex items-center gap-4 mb-10">
          <ProfileAvatar url={perfil?.avatarUrl} />
          <div className="min-w-0">
            <h2 className="font-headline font-bold text-base text-[#1A3C34] leading-tight truncate">
              {appTitle}
            </h2>
            <p className="font-label text-sm text-[#1A3C34]/60 truncate">
              {perfil?.nome ?? ""}
            </p>
          </div>
        </div>

        <NavList items={navItems} currentPath={location.pathname} />
        <SettingsLink />
        <LogoutButton />
      </nav>

      {/* ── Mobile Header ───────────────────────────────────── */}
      <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-[#F5F2ED] border-b border-[#1A3C34]/10">
        <button
          onClick={() => setDrawerOpen(true)}
          className="p-2 rounded-full text-[#1A3C34] hover:bg-[#1A3C34]/5 transition-colors"
          aria-label="Abrir menu"
        >
          <Menu size={24} />
        </button>

        <span className="font-headline text-lg font-bold text-[#1A3C34] truncate max-w-[180px]">
          {appTitle}
        </span>

        <ProfileAvatar url={perfil?.avatarUrl} size="sm" />
      </header>

      {/* ── Mobile Drawer Overlay ────────────────────────────── */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={closeDrawer} />

          <div className="relative w-72 h-full bg-[#F5F2ED] flex flex-col p-6 shadow-xl">
            <div className="flex items-center justify-between mb-8">
              <h2 className="font-headline font-bold text-[#1A3C34]">{appTitle}</h2>
              <button
                onClick={closeDrawer}
                className="p-2 rounded-full hover:bg-[#1A3C34]/5 transition-colors"
                aria-label="Fechar menu"
              >
                <X size={20} className="text-[#1A3C34]" />
              </button>
            </div>

            <NavList items={navItems} currentPath={location.pathname} onNavigate={closeDrawer} />
            <SettingsLink onClick={closeDrawer} />
            <LogoutButton onClick={closeDrawer} />
          </div>
        </div>
      )}

      {/* ── Main Content ─────────────────────────────────────── */}
      <main className="lg:ml-72 pb-24 lg:pb-0">{children}</main>

      {/* ── Mobile Bottom Nav ────────────────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 left-0 w-full z-40 flex justify-around items-center px-4 pt-2 pb-6 bg-[#F5F2ED] border-t border-[#1A3C34]/10">
        {bottomNavItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.id}
              to={item.href}
              className="flex flex-col items-center gap-0.5 transition-colors"
            >
              <span
                className={cn(
                  "flex items-center justify-center w-14 h-9 rounded-2xl transition-colors",
                  isActive ? "bg-[#1A3C34] text-[#F5F2ED]" : "text-[#1A3C34]/60",
                )}
              >
                {item.icon}
              </span>
              <span className="font-label text-[10px] uppercase tracking-wider text-[#1A3C34]/60">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}


