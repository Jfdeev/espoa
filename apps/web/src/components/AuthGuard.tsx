import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";

export default function AuthGuard() {
  const { token, perfil, setPerfil, limpar } = useAuthStore();
  const [verificando, setVerificando] = useState(() => !!token && !perfil);

  useEffect(() => {
    if (!token || perfil) return;
    api
      .get("/auth/me")
      .then(({ data }) => {
        setPerfil(data.usuario, data.vinculos);
        setVerificando(false);
      })
      .catch(() => {
        limpar();
        setVerificando(false);
      });
  }, [token, perfil, setPerfil, limpar]);

  if (verificando) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return token ? <Outlet /> : <Navigate to="/login" replace />;
}
