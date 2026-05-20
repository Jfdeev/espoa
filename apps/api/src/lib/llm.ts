/**
 * Wrapper minimalista para o Google AI Studio (Gemini) via fetch.
 * Não adiciona dependência de SDK — duas funções só.
 *
 * Convenção: no-op (retorna null) se GOOGLE_API_KEY não estiver configurada
 * para que o app funcione em dev sem custo de IA.
 */

const GOOGLE_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = "gemini-2.5-flash";

export interface ChatParams {
  prompt: string;
  system?: string;
  maxTokens?: number;
  model?: string;
}

export interface ChatMessage {
  /**
   * Mantemos `user | assistant` na interface pública (mesma da Anthropic)
   * para compatibilidade com o resto do app. Conversão para o formato do
   * Google (`user | model`) acontece no momento da chamada.
   */
  role: "user" | "assistant";
  content: string;
}

export interface ChatHistoryParams {
  messages: ChatMessage[];
  system?: string;
  maxTokens?: number;
  model?: string;
}

export function isAiConfigured(): boolean {
  return Boolean(process.env.GOOGLE_API_KEY);
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  promptFeedback?: {
    blockReason?: string;
  };
}

function geminiUrl(model: string, apiKey: string): string {
  return `${GOOGLE_API_BASE}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
}

function toGeminiRole(role: ChatMessage["role"]): "user" | "model" {
  return role === "assistant" ? "model" : "user";
}

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  maxAttempts = 3,
): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url, init);
      if (!RETRYABLE_STATUS.has(res.status) || attempt === maxAttempts) {
        return res;
      }
      const delay = 1000 * 2 ** (attempt - 1); // 1s, 2s, 4s
      console.warn(`[llm] ${res.status} — retrying in ${delay}ms (attempt ${attempt}/${maxAttempts})`);
      await new Promise((r) => setTimeout(r, delay));
    } catch (err) {
      lastErr = err;
      if (attempt === maxAttempts) throw err;
      const delay = 1000 * 2 ** (attempt - 1);
      console.warn(`[llm] fetch error — retrying in ${delay}ms (attempt ${attempt}/${maxAttempts})`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

function parseGeminiText(data: GeminiResponse): string | null {
  const text = data.candidates
    ?.flatMap((c) => c.content?.parts ?? [])
    .map((p) => (typeof p.text === "string" ? p.text.trim() : ""))
    .filter(Boolean)
    .join("\n")
    .trim();

  return text && text.length > 0 ? text : null;
}

/**
 * Faz uma chamada single-turn ao Gemini e retorna o texto da resposta.
 * Retorna null em qualquer falha — o caller deve tratar mostrando fallback,
 * não como erro fatal.
 */
export async function generateText(
  params: ChatParams,
): Promise<string | null> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.warn("[llm] GOOGLE_API_KEY não configurada — pulando chamada");
    return null;
  }

  const model = params.model ?? DEFAULT_MODEL;
  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts: [{ text: params.prompt }] }],
    generationConfig: {
      maxOutputTokens: params.maxTokens ?? 512,
    },
  };
  if (params.system) {
    body.systemInstruction = { parts: [{ text: params.system }] };
  }

  try {
    const res = await fetchWithRetry(geminiUrl(model, apiKey), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("[llm] erro HTTP", res.status, errText.slice(0, 500));
      return null;
    }

    const data = (await res.json()) as GeminiResponse;

    if (data.promptFeedback?.blockReason) {
      console.warn("[llm] prompt bloqueado:", data.promptFeedback.blockReason);
      return null;
    }

    return parseGeminiText(data);
  } catch (err) {
    console.error("[llm] exceção:", err);
    return null;
  }
}

/**
 * Variante de {@link generateText} para conversas multi-turno.
 * Aceita um histórico de mensagens `[{ role, content }, ...]`.
 */
export async function generateChat(
  params: ChatHistoryParams,
): Promise<string | null> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.warn("[llm] GOOGLE_API_KEY não configurada — pulando chat");
    return null;
  }

  if (!params.messages.length) return null;

  const model = params.model ?? DEFAULT_MODEL;
  const body: Record<string, unknown> = {
    contents: params.messages.map((m) => ({
      role: toGeminiRole(m.role),
      parts: [{ text: m.content }],
    })),
    generationConfig: {
      maxOutputTokens: params.maxTokens ?? 512,
    },
  };
  if (params.system) {
    body.systemInstruction = { parts: [{ text: params.system }] };
  }

  try {
    const res = await fetchWithRetry(geminiUrl(model, apiKey), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("[llm] erro HTTP (chat)", res.status, errText.slice(0, 500));
      return null;
    }

    const data = (await res.json()) as GeminiResponse;

    if (data.promptFeedback?.blockReason) {
      console.warn(
        "[llm] prompt bloqueado (chat):",
        data.promptFeedback.blockReason,
      );
      return null;
    }

    return parseGeminiText(data);
  } catch (err) {
    console.error("[llm] exceção (chat):", err);
    return null;
  }
}
