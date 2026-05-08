import { useEffect, useRef, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import api from "@/lib/api";
import { isNetworkError, isOnline, useOnlineStatus } from "@/lib/network";
import { useAuthStore, isSessionStale } from "@/store/auth.store";
import { useSyncBootstrap } from "@/hooks/useSyncBootstrap";

/**
 * AuthGuard com suporte a sessão offline persistente.
 *
 * Regras:
 *  1. Sem token → redireciona para /login sempre.
 *  2. Token + perfil cacheado → renderiza imediatamente.
 *     - Se online e sessão venceu o TTL de 7 dias → revalida em background.
 *     - Se ficou online após offline → revalida em background silenciosamente.
 *  3. Token + sem perfil (e.g. primeira abertura após reinstalação):
 *     - Offline → renderiza sem perfil (degraded mode), banner gerenciado pelo app.
 *     - Online → chama /auth/me; sucesso → setPerfil; erro de rede → renderiza sem perfil;
 *               401 → limpar() + redirect (o interceptor já chama limpar, aqui só aguardamos).
 *  4. Nunca desloga em falha de rede — só em 401/403 explícito (tratado no interceptor).
 */
export default function AuthGuard() {
  const { token, perfil, lastVerifiedAt, setPerfil, limpar } = useAuthStore();
  const online = useOnlineStatus();

  // Inicia o ciclo de sync assim que o usuário estiver autenticado
  useSyncBootstrap();

  // true enquanto aguardamos /auth/me sem perfil cacheado (primeira abertura online)
  const [verificandoInicial, setVerificandoInicial] = useState(
    () => !!token && !perfil && isOnline(),
  );

  // Evita dupla chamada de revalidação
  const revalidating = useRef(false);

  /** Revalida o perfil em background (silencioso — não bloqueia a UI) */
  const revalidar = () => {
    if (revalidating.current || !token) return;
    revalidating.current = true;
    api
      .get("/auth/me")
      .then(({ data }) => {
        setPerfil(data.usuario, data.vinculos);
      })
      .catch((err) => {
        if (!isNetworkError(err)) {
          // 401/403 → o interceptor já chamou limpar(); apenas espelhamos aqui
          limpar();
        }
        // Erro de rede: sessão continua intacta
      })
      .finally(() => {
        revalidating.current = false;
        setVerificandoInicial(false);
      });
  };

  // Verificação inicial quando não há perfil cacheado
  useEffect(() => {
    if (!token || perfil) {
      setVerificandoInicial(false);
      return;
    }
    if (!isOnline()) {
      // Offline e sem perfil → degraded mode, não tenta chamada
      setVerificandoInicial(false);
      return;
    }
    revalidar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intencional: roda só uma vez no mount

  // Quando volta online: revalida em background (silencioso)
  useEffect(() => {
    if (!online || !token) return;
    revalidar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]); // intencional: dispara quando `online` muda de false → true

  // Sessão com TTL vencido e usuário online → revalida em background
  useEffect(() => {
    if (!token || !online) return;
    if (isSessionStale(lastVerifiedAt)) {
      revalidar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, online, lastVerifiedAt]);

  // Sem token → login
  if (!token) return <Navigate to="/login" replace />;

  // Aguardando verificação inicial (só quando estava online e sem perfil)
  if (verificandoInicial) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return <Outlet />;
}
