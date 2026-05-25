import api from "@/lib/api";
import { isOnline, isNetworkError } from "@/lib/network";
import { useAuthStore } from "@/store/auth.store";
import type { UsuarioPerfil } from "@/types/auth";

/**
 * Fila offline para atualização de perfil (PATCH /auth/profile).
 *
 * Optei por essa abordagem leve em localStorage em vez de integrar `usuario`
 * à sync_queue/sync push porque:
 *   - Edição de perfil é uma operação rara (não justifica ampliar o schema)
 *   - Authz no servidor é simples (próprio usuário só) — não precisa de Dexie
 *   - Reduz superfície de mudança no backend
 *
 * Fluxo:
 *   1. Usuário clica "Salvar" → enqueueProfileUpdate(patch)
 *      - Se online: faz PATCH direto e retorna { mode: "synced", perfil }
 *      - Se offline: salva no localStorage como pending e devolve patch otimista
 *   2. Quando o app voltar online (evento `online`), tryFlushProfileUpdate é
 *      chamado pelo bootstrap e envia o pending — limpando ao confirmar.
 *   3. `applyPendingProfileUpdate(perfil)` retorna o perfil mesclado com
 *      patches pendentes; usado pela UI para refletir mudanças mesmo antes
 *      do sync confirmar.
 */

const STORAGE_KEY = "espoa.profile.pending";

export interface ProfilePatch {
  nome?: string;
  telefone?: string;
  cpf?: string;
}

interface PendingPatch {
  patch: ProfilePatch;
  enqueuedAt: string;
}

function loadPending(): PendingPatch | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PendingPatch) : null;
  } catch {
    return null;
  }
}

function savePending(p: PendingPatch | null) {
  if (!p) localStorage.removeItem(STORAGE_KEY);
  else localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}

function mergePatch(base: PendingPatch | null, patch: ProfilePatch): PendingPatch {
  return {
    patch: { ...(base?.patch ?? {}), ...patch },
    enqueuedAt: base?.enqueuedAt ?? new Date().toISOString(),
  };
}

/**
 * Aplica patches pendentes ao perfil para exibição na UI.
 * Use isso ao ler o perfil em telas como ConfiguracoesPage/PerfilPage para que
 * o usuário veja imediatamente o que ele acabou de salvar (mesmo offline).
 */
export function applyPendingProfileUpdate(perfil: UsuarioPerfil | null): UsuarioPerfil | null {
  if (!perfil) return perfil;
  const pending = loadPending();
  if (!pending) return perfil;
  return {
    ...perfil,
    nome: pending.patch.nome ?? perfil.nome,
    telefone: pending.patch.telefone ?? perfil.telefone,
    cpf: pending.patch.cpf ?? perfil.cpf,
  };
}

export function hasPendingProfileUpdate(): boolean {
  return loadPending() !== null;
}

export interface EnqueueResult {
  mode: "synced" | "queued";
  perfil: UsuarioPerfil;
}

/**
 * Tenta aplicar o patch via API; em caso de offline ou erro de rede,
 * persiste no localStorage e retorna o perfil mesclado otimisticamente.
 */
export async function enqueueProfileUpdate(patch: ProfilePatch): Promise<EnqueueResult> {
  const auth = useAuthStore.getState();
  const perfilAtual = auth.perfil;
  if (!perfilAtual) throw new Error("Sem perfil ativo");

  if (isOnline()) {
    try {
      const { data } = await api.patch<{ usuario: UsuarioPerfil }>("/auth/profile", patch);
      // Sucesso real: limpa qualquer pending anterior
      savePending(null);
      auth.setPerfil(data.usuario, auth.vinculos);
      return { mode: "synced", perfil: data.usuario };
    } catch (err) {
      if (!isNetworkError(err)) {
        // erro não-rede (validação, conflito, etc.) — propaga
        throw err;
      }
      // erro de rede → cai no fluxo offline
    }
  }

  // Offline: salva pending + atualiza UI otimisticamente
  const merged = mergePatch(loadPending(), patch);
  savePending(merged);

  const perfilOtimista: UsuarioPerfil = {
    ...perfilAtual,
    nome: merged.patch.nome ?? perfilAtual.nome,
    telefone: merged.patch.telefone ?? perfilAtual.telefone,
    cpf: merged.patch.cpf ?? perfilAtual.cpf,
  };
  auth.setPerfil(perfilOtimista, auth.vinculos);
  return { mode: "queued", perfil: perfilOtimista };
}

/**
 * Tenta enviar o patch pendente. Usado pelo bootstrap ao voltar online.
 * Silencioso — não lança em caso de falha; tenta de novo no próximo flush.
 */
export async function tryFlushProfileUpdate(): Promise<boolean> {
  const pending = loadPending();
  if (!pending) return false;
  if (!isOnline()) return false;

  try {
    const { data } = await api.patch<{ usuario: UsuarioPerfil }>("/auth/profile", pending.patch);
    savePending(null);
    const auth = useAuthStore.getState();
    auth.setPerfil(data.usuario, auth.vinculos);
    return true;
  } catch (err) {
    if (!isNetworkError(err)) {
      // Erro não-rede (e.g., 400 validação): descarta para evitar loop infinito
      savePending(null);
    }
    return false;
  }
}
