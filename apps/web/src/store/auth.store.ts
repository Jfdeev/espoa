import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UsuarioPerfil, UsuarioVinculo } from "../types/auth";

const SESSION_TTL_DAYS = 7;
const SESSION_TTL_MS = SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;

interface AuthState {
  token: string | null;
  perfil: UsuarioPerfil | null;
  vinculos: UsuarioVinculo[];
  associacaoAtiva: UsuarioVinculo | null;
  lastVerifiedAt: string | null;

  setAuth: (token: string, perfil: UsuarioPerfil, vinculos: UsuarioVinculo[]) => void;
  setPerfil: (perfil: UsuarioPerfil, vinculos: UsuarioVinculo[]) => void;
  setAssociacaoAtiva: (vinculo: UsuarioVinculo) => void;
  markVerified: () => void;
  limpar: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      perfil: null,
      vinculos: [],
      associacaoAtiva: null,
      lastVerifiedAt: null,

      setAuth: (token, perfil, vinculos) => {
        localStorage.setItem("espoa-token", token);
        const ativa = vinculos.find((v) => v.status === "ativo") ?? null;
        set({
          token,
          perfil,
          vinculos,
          associacaoAtiva: ativa,
          lastVerifiedAt: new Date().toISOString(),
        });
      },

      setPerfil: (perfil, vinculos) => {
        const ativa = vinculos.find((v) => v.status === "ativo") ?? null;
        set({
          perfil,
          vinculos,
          associacaoAtiva: ativa,
          lastVerifiedAt: new Date().toISOString(),
        });
      },

      setAssociacaoAtiva: (vinculo) => set({ associacaoAtiva: vinculo }),

      markVerified: () => set({ lastVerifiedAt: new Date().toISOString() }),

      limpar: () => {
        localStorage.removeItem("espoa-token");
        set({
          token: null,
          perfil: null,
          vinculos: [],
          associacaoAtiva: null,
          lastVerifiedAt: null,
        });
      },
    }),
    { name: "espoa-auth" },
  ),
);

export function isSessionStale(lastVerifiedAt: string | null, ttlMs = SESSION_TTL_MS): boolean {
  if (!lastVerifiedAt) return false;
  const verified = new Date(lastVerifiedAt).getTime();
  if (Number.isNaN(verified)) return false;
  return Date.now() - verified > ttlMs;
}

export const SESSION_TTL = { days: SESSION_TTL_DAYS, ms: SESSION_TTL_MS };
