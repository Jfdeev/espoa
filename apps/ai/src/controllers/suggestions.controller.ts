import type { Request, Response } from "express";
import { generateSuggestions } from "../suggestion-analyzers";
import type { SuggestionsSnapshot } from "../types";

function isValidSuggestionsSnapshot(
  body: unknown,
): body is SuggestionsSnapshot {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  const fin = b.financeiro as Record<string, unknown> | undefined;
  return (
    typeof b.associacaoId === "string" &&
    !!fin &&
    typeof fin.saldoAtual === "number" &&
    typeof fin.totalEntradas === "number" &&
    typeof fin.totalSaidas === "number" &&
    Array.isArray(fin.porMes) &&
    typeof fin.porTipoSaida === "object" &&
    fin.porTipoSaida !== null &&
    typeof fin.mensalidades === "object" &&
    fin.mensalidades !== null
  );
}

export function postSuggestions(req: Request, res: Response) {
  if (!isValidSuggestionsSnapshot(req.body)) {
    return res.status(400).json({
      error: "invalid_snapshot",
      message:
        "Payload de sugestoes invalido. Envie ao menos o snapshot financeiro.",
    });
  }

  try {
    const result = generateSuggestions(req.body);
    return res.json(result);
  } catch (error) {
    console.error("[ai] erro ao gerar sugestoes", error);
    return res.status(500).json({
      error: "suggestions_failed",
      message: "Nao foi possivel gerar as sugestoes agora. Tente novamente.",
    });
  }
}
