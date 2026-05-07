import axios from "axios";
import { isNetworkError } from "./network";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:8080",
});

// Injeta o token JWT em todas as requisições
api.interceptors.request.use((config) => {
  if (!config.headers.Authorization) {
    const token = localStorage.getItem("espoa-token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Distingue erro de rede (sem resposta) de 401 explícito:
//   - NetworkError / timeout  → NÃO desloga (usuário está offline)
//   - 401 / 403 explícito     → desloga (token inválido ou revogado)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (isNetworkError(error)) {
      // Erro de rede: deixa o chamador decidir o que fazer
      return Promise.reject(error);
    }

    const status = error.response?.status;
    if (status === 401 || status === 403) {
      // Import dinâmico evita dependência circular na inicialização do módulo
      import("@/store/auth.store").then(({ useAuthStore }) => {
        useAuthStore.getState().limpar();
      });
    }

    return Promise.reject(error);
  },
);

export default api;
