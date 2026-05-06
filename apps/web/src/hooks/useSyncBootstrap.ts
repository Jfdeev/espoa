import { useEffect, useRef } from "react";
import { syncManager } from "@/sync/manager";
import { getDeviceId } from "@/lib/device-id";
import { isOnline } from "@/lib/network";
import { useAuthStore } from "@/store/auth.store";

const SYNC_INTERVAL_MS = 30_000; // 30 segundos entre ciclos
const BACKOFF_MIN_MS = 1_000;
const BACKOFF_MAX_MS = 60_000;

/**
 * Inicializa o ciclo de sincronização enquanto o usuário estiver autenticado.
 *
 * - Dispara sync imediatamente ao montar (se online).
 * - Re-dispara em evento `online` (voltou a ter rede).
 * - Re-dispara quando a aba fica visível novamente.
 * - Loop de 30s entre sincronizações bem-sucedidas.
 * - Backoff exponencial (1s → 2s → 4s … cap 60s) em falha.
 * - Cleanup completo ao deslogar (token = null).
 */
export function useSyncBootstrap() {
  const token = useAuthStore((s) => s.token);
  const backoffRef = useRef<number>(BACKOFF_MIN_MS);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    const clearTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const schedule = (delay: number) => {
      clearTimer();
      timerRef.current = setTimeout(() => {
        if (!cancelled) runSync();
      }, delay);
    };

    const runSync = () => {
      if (!isOnline() || cancelled) {
        // Sem rede — aguarda evento `online` para retomar
        return;
      }

      syncManager
        .run(getDeviceId())
        .then((result) => {
          if (result.status !== "already_running") {
            backoffRef.current = BACKOFF_MIN_MS; // reset em sucesso
          }
          if (!cancelled) schedule(SYNC_INTERVAL_MS);
        })
        .catch(() => {
          const next = Math.min(backoffRef.current * 2, BACKOFF_MAX_MS);
          backoffRef.current = next;
          if (!cancelled) schedule(next);
        });
    };

    // Disparo imediato
    runSync();

    const handleOnline = () => {
      if (!cancelled) {
        backoffRef.current = BACKOFF_MIN_MS;
        runSync();
      }
    };

    const handleVisibility = () => {
      if (!cancelled && document.visibilityState === "visible") {
        runSync();
      }
    };

    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelled = true;
      clearTimer();
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [token]);
}
