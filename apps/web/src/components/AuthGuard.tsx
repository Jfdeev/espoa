import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";

export default function AuthGuard() {
  const [verificando, setVerificando] = useState(true);
  const [autenticado, setAutenticado] = useState(false);
  const setPerfil = useAuthStore((s) => s.setPerfil);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const me = await api.get("/auth/me");
          setPerfil(me.data.usuario, me.data.vinculos);
          setAutenticado(true);
        } catch {
          setAutenticado(false);
        }
      } else {
        setAutenticado(false);
      }
      setVerificando(false);
    });
    return () => unsubscribe();
  }, [setPerfil]);

  if (verificando) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return autenticado ? <Outlet /> : <Navigate to="/login" replace />;
}