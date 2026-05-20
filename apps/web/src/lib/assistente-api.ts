import api from "@/lib/api";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AssistenteResponse {
  reply: string;
}

export async function askAssistente(params: {
  associacaoId: string;
  message: string;
  history?: ChatMessage[];
}): Promise<AssistenteResponse> {
  const { data } = await api.post<AssistenteResponse>("/me/assistente", {
    associacao_id: params.associacaoId,
    message: params.message,
    history: params.history ?? [],
  });
  return data;
}
