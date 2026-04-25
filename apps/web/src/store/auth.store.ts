import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UsuarioPerfil, UsuarioVinculo } from "../types/auth";

interface AuthState {
  token: string | null;
  perfil: UsuarioPerfil | null;
  vinculos: UsuarioVinculo[];
  associacaoAtiva: UsuarioVinculo | null;

  setAuth: (token: string, perfil: UsuarioPerfil, vinculos: UsuarioVinculo[]) => void;
  setPerfil: (perfil: UsuarioPerfil, vinculos: UsuarioVinculo[]) => void;
  setAssociacaoAtiva: (vinculo: UsuarioVinculo) => void;
  limpar: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      perfil: null,
      vinculos: [],
      associacaoAtiva: null,

      setAuth: (token, perfil, vinculos) => {
        localStorage.setItem("espoa-token", token);
        const ativa = vinculos.find((v) => v.status === "ativo") ?? null;
        set({ token, perfil, vinculos, associacaoAtiva: ativa });
      },

      setPerfil: (perfil, vinculos) => {
        const ativa = vinculos.find((v) => v.status === "ativo") ?? null;
        set({ perfil, vinculos, associacaoAtiva: ativa });
      },

      setAssociacaoAtiva: (vinculo) => set({ associacaoAtiva: vinculo }),

      limpar: () => {
        localStorage.removeItem("espoa-token");
        set({ token: null, perfil: null, vinculos: [], associacaoAtiva: null });
      },
    }),
    { name: "espoa-auth" },
  ),
);
