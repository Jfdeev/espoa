import type { Request, Response } from "express";
import { generateInsights } from "../analyzers";
import type { FinancialSnapshot, InsightsResponse } from "../types";

function isValidSnapshot(body: unknown): body is FinancialSnapshot {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.associacaoId === "string" &&
    typeof b.saldoAtual === "number" &&
    typeof b.totalEntradas === "number" &&
    typeof b.totalSaidas === "number" &&
    Array.isArray(b.porMes) &&
    typeof b.porTipoSaida === "object" &&
    b.porTipoSaida !== null &&
    typeof b.mensalidades === "object" &&
    b.mensalidades !== null
  );
}

export function postInsights(req: Request, res: Response) {
  if (!isValidSnapshot(req.body)) {
    return res.status(400).json({
      error: "invalid_snapshot",
      message: "Payload financeiro invalido. Verifique os campos enviados.",
    });
  }

  try {
    const insights = generateInsights(req.body);
    const response: InsightsResponse = {
      associacaoId: req.body.associacaoId,
      generatedAt: new Date().toISOString(),
      insights,
    };
    return res.json(response);
  } catch (error) {
    console.error("[ai] erro ao gerar insights", error);
    return res.status(500).json({
      error: "insights_failed",
      message: "Nao foi possivel gerar os insights agora. Tente novamente.",
    });
  }
}
