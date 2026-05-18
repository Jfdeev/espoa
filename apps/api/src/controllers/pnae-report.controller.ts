import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.middleware";
import { ensureUserIsMember } from "../middleware/associacao.guard";
import { resolvePeriod } from "../utils/period";
import { getPnaeReport } from "../services/pnae-report.service";
import { isAiOfflineError } from "../services/ai-client";

export async function getPnaeReportHandler(
  req: AuthenticatedRequest,
  res: Response,
) {
  const associacaoId =
    typeof req.query.associacao_id === "string"
      ? req.query.associacao_id
      : undefined;
  const editalId =
    typeof req.query.edital_id === "string" ? req.query.edital_id : undefined;

  if (!associacaoId) {
    return res.status(400).json({
      error: "associacao_id_obrigatorio",
      message: "O parâmetro associacao_id é obrigatório",
    });
  }
  if (!editalId) {
    return res.status(400).json({
      error: "edital_id_obrigatorio",
      message: "O parâmetro edital_id é obrigatório",
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
    const result = await getPnaeReport({
      associacaoId,
      editalId,
      periodo,
      userId: req.userId!,
    });

    if ("error" in result) {
      return res.status(404).json({
        error: result.error,
        message: "Edital não encontrado para esta associação.",
      });
    }

    return res.json(result.data);
  } catch (error) {
    console.error("GET /pnae-report error", error);
    if (isAiOfflineError(error)) {
      return res.status(503).json({
        error: "ai_offline",
        message:
          "Serviço de IA indisponível no momento. Verifique a conexão e tente novamente.",
      });
    }
    return res.status(500).json({
      error: "pnae_report_failed",
      message: "Não foi possível gerar o relatório PNAE agora.",
    });
  }
}
