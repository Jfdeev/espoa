/**
 * Cliente HTTP para o microsserviço de IA (`apps/ai`).
 *
 * Espelha o padrão de `fetchInsightsFromAi` em `insights.service.ts` (IA-01),
 * generalizado para os endpoints de IA-02 (`/pnae-report`) e IA-03
 * (`/suggestions`). O serviço de IA é stateless e não acessa o banco — este
 * cliente apenas envia o snapshot já consolidado e devolve a resposta.
 */

const AI_TIMEOUT_MS = 8000;

export async function callAiService<T>(
  path: string,
  payload: unknown,
): Promise<T> {
  const baseUrl = process.env.AI_SERVICE_URL || "http://localhost:8090";
  const url = `${baseUrl.replace(/\/$/, "")}${path}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`AI service respondeu ${response.status}`);
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Identifica falhas que indicam IA indisponível (offline / sem rota / timeout).
 * Mesma heurística usada pelo handler de insights (IA-01).
 */
export function isAiOfflineError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes("fetch failed") ||
    msg.includes("econnrefused") ||
    msg.includes("enotfound") ||
    msg.includes("aborted")
  );
}
