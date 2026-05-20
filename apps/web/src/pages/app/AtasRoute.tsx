import { useAuthStore } from "@/store/auth.store";
import AtasPage from "./AtasPage";
import AtasMembroPage from "./AtasMembroPage";

/**
 * Rotea entre a tela administrativa de atas (CRUD completo) e a tela
 * read-only do membro (visualização + resumo IA).
 */
export default function AtasRoute() {
  const role = useAuthStore((s) => s.associacaoAtiva?.role);
  if (role === "adm") return <AtasPage />;
  return <AtasMembroPage />;
}
