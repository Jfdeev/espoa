import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.middleware";
import { askAssistente } from "../services/assistente.service";
import type { ChatMessage } from "../lib/llm";

export async function postAssistenteController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: "nao_autenticado" });

    const { associacao_id, associacaoId, message, history } = (req.body ??
      {}) as {
      associacao_id?: string;
      associacaoId?: string;
      message?: string;
      history?: ChatMessage[];
    };

    const assocId = associacao_id ?? associacaoId;
    if (!assocId) {
      return res.status(400).json({ error: "associacao_id_obrigatorio" });
    }
    if (typeof message !== "string") {
      return res.status(400).json({ error: "message_obrigatorio" });
    }

    const result = await askAssistente({
      userId,
      associacaoId: assocId,
      message,
      history: Array.isArray(history) ? history : [],
    });

    if (!result.ok) {
      const status =
        result.reason === "acesso_negado_membro"
          ? 403
          : result.reason === "mensagem_vazia" ||
              result.reason === "mensagem_muito_longa"
            ? 400
            : 503;
      return res.status(status).json({ error: result.reason });
    }

    return res.json({ reply: result.reply });
  } catch (error) {
    console.error("POST /me/assistente error", error);
    return res.status(500).json({ error: "assistente_failed" });
  }
}
