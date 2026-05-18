import type { Request, Response } from "express";
import { generatePnaeReport } from "../pnae-analyzers";
import type { PnaeReportSnapshot } from "../types";

function isValidPnaeSnapshot(body: unknown): body is PnaeReportSnapshot {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  const edital = b.edital as Record<string, unknown> | undefined;
  const producao = b.producao as Record<string, unknown> | undefined;
  return (
    typeof b.associacaoId === "string" &&
    !!edital &&
    typeof edital.id === "string" &&
    typeof edital.titulo === "string" &&
    typeof edital.dataLimite === "string" &&
    !!producao &&
    typeof producao.quantidadeTotal === "number" &&
    Array.isArray(producao.porCultura)
  );
}

export function postPnaeReport(req: Request, res: Response) {
  if (!isValidPnaeSnapshot(req.body)) {
    return res.status(400).json({
      error: "invalid_snapshot",
      message:
        "Payload do relatorio PNAE invalido. Verifique edital e producao.",
    });
  }

  try {
    const report = generatePnaeReport(req.body);
    return res.json(report);
  } catch (error) {
    console.error("[ai] erro ao gerar relatorio PNAE", error);
    return res.status(500).json({
      error: "pnae_report_failed",
      message: "Nao foi possivel gerar o relatorio PNAE agora. Tente novamente.",
    });
  }
}
