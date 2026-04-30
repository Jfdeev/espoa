import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.middleware";
import { getDashboardStats } from "../services/dashboard.service";

export async function getDashboard(req: AuthenticatedRequest, res: Response) {
  const associacaoId = req.query.associacao_id as string | undefined;

  if (!associacaoId) {
    return res.status(400).json({ error: "associacao_id is required" });
  }

  try {
    const stats = await getDashboardStats(associacaoId);
    return res.json(stats);
  } catch (error) {
    console.error("GET /dashboard error", error);
    return res.status(500).json({ error: "dashboard_failed" });
  }
}
