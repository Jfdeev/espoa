import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/auth.store";
import AppLayout, { adminNavItems, memberNavItems } from "./AppLayout";
import AdminDashboard from "./AdminDashboard";
import MemberDashboard from "./MemberDashboard";

export default function AppPage() {
  const associacaoAtiva = useAuthStore((s) => s.associacaoAtiva);

  if (!associacaoAtiva) {
    return <Navigate to="/solicitacoes" replace />;
  }

  if (associacaoAtiva.role === "adm") {
    return (
      <AppLayout navItems={adminNavItems} title="Portal do Admin">
        <AdminDashboard />
      </AppLayout>
    );
  }

  return (
    <AppLayout navItems={memberNavItems} title={associacaoAtiva.associacaoNome}>
      <MemberDashboard />
    </AppLayout>
  );
}
