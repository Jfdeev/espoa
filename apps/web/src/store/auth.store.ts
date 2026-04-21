import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UsuarioPerfil, UsuarioVinculo } from "../types/auth";

interface AuthState {
  perfil: UsuarioPerfil | null;
  vinculos: UsuarioVinculo[];
  associacaoAtiva: UsuarioVinculo | null;
  carregando: boolean;

  setPerfil: (perfil: UsuarioPerfil, vinculos: UsuarioVinculo[]) => void;
  setAssociacaoAtiva: (vinculo: UsuarioVinculo) => void;
  limpar: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      perfil: null,
      vinculos: [],
      associacaoAtiva: null,
      carregando: false,

      setPerfil: (perfil, vinculos) => {
        const ativa = vinculos.find((v) => v.status === "ativo") ?? null;
        set({ perfil, vinculos, associacaoAtiva: ativa });
      },

      setAssociacaoAtiva: (vinculo) => set({ associacaoAtiva: vinculo }),

      limpar: () =>
        set({ perfil: null, vinculos: [], associacaoAtiva: null }),
    }),
    { name: "espoa-auth" },
  ),
);
