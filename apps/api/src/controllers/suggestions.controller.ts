import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.middleware";
import { ensureUserIsMember } from "../middleware/associacao.guard";
import { resolvePeriod } from "../utils/period";
import { getSuggestions } from "../services/suggestions.service";
import { isAiOfflineError } from "../services/ai-client";

export async function getSuggestionsHandler(
  req: AuthenticatedRequest,
  res: Response,
) {
  const associacaoId =
    typeof req.query.associacao_id === "string"
      ? req.query.associacao_id
      : undefined;

  if (!associacaoId) {
    return res.status(400).json({
      error: "associacao_id_obrigatorio",
      message: "O parâmetro associacao_id é obrigatório",
    });
  }

  let periodo;
  try {
    periodo = resolvePeriod({
      periodo:
        typeof req.query.periodo === "string" ? req.query.periodo : undefined,
      inicio:
        typeof req.query.inicio === "string" ? req.query.inicio : undefined,
      fim: typeof req.query.fim === "string" ? req.query.fim : undefined,
    });
  } catch (error: any) {
    return res.status(400).json({
      error: error.code ?? "periodo_invalido",
      message: error.message,
    });
  }

  const isMember = await ensureUserIsMember(req.userId!, associacaoId);
  if (!isMember) {
    return res.status(403).json({
      error: "acesso_negado",
      message: "Usuário não é membro ativo desta associação",
    });
  }

  try {
    const result = await getSuggestions({
      associacaoId,
      periodo,
      userId: req.userId!,
    });
    return res.json(result);
  } catch (error) {
    console.error("GET /suggestions error", error);
    if (isAiOfflineError(error)) {
      return res.status(503).json({
        error: "ai_offline",
        message:
          "Serviço de IA indisponível no momento. Verifique a conexão e tente novamente.",
      });
    }
    return res.status(500).json({
      error: "suggestions_failed",
      message: "Não foi possível gerar as sugestões agora.",
    });
  }
}
