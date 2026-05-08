import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.middleware";
import {
  buildFinancialSnapshot,
  getInsights,
} from "../services/insights.service";

function isOfflineError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes("fetch failed") ||
    msg.includes("econnrefused") ||
    msg.includes("enotfound") ||
    msg.includes("aborted")
  );
}

export async function getInsightsHandler(
  req: AuthenticatedRequest,
  res: Response,
) {
  const associacaoId = req.query.associacao_id as string | undefined;
  if (!associacaoId) {
    return res.status(400).json({ error: "associacao_id is required" });
  }

  try {
    const result = await getInsights(associacaoId);
    return res.json(result);
  } catch (error) {
    console.error("GET /insights error", error);
    if (isOfflineError(error)) {
      return res.status(503).json({
        error: "ai_offline",
        message:
          "Servico de IA indisponivel no momento. Verifique a conexao e tente novamente.",
      });
    }
    return res.status(500).json({
      error: "insights_failed",
      message: "Nao foi possivel gerar os insights agora.",
    });
  }
}

export async function getSnapshotHandler(
  req: AuthenticatedRequest,
  res: Response,
) {
  const associacaoId = req.query.associacao_id as string | undefined;
  if (!associacaoId) {
    return res.status(400).json({ error: "associacao_id is required" });
  }

  try {
    const snapshot = await buildFinancialSnapshot(associacaoId);
    return res.json(snapshot);
  } catch (error) {
    console.error("GET /insights/snapshot error", error);
    return res.status(500).json({
      error: "snapshot_failed",
      message: "Nao foi possivel consolidar os dados financeiros.",
    });
  }
}
