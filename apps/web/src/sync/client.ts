import type { SyncRequestBody, SyncResponseBody } from "./types";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

/**
 * Envia push e recebe pull do servidor de sincronização.
 * Usa fetch direto (não o axios compartilhado) para evitar o interceptor 401
 * que poderia deslogar o usuário em falhas de rede durante sync em background.
 */
export async function syncRequest(body: SyncRequestBody): Promise<SyncResponseBody> {
  const token = localStorage.getItem("espoa-token");

  const response = await fetch(`${API_BASE}/sync`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Sync falhou: ${response.status} ${text}`);
  }

  return response.json() as Promise<SyncResponseBody>;
}
