import type { Response } from "express";
import { db, usuario, associacao } from "@espoa/database";
import { eq } from "drizzle-orm";
import type { AuthenticatedRequest } from "../middleware/auth.middleware";
import { resolvePeriod } from "../utils/period";
import {
  getTransparencia,
  isMembroAtivo,
} from "../services/transparencia.service";
import { getResumoMes } from "../services/resumo-mes.service";

export async function getTransparenciaController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: "nao_autenticado" });
    }

    const associacaoId =
      typeof req.query.associacao_id === "string"
        ? req.query.associacao_id
        : typeof req.query.associacaoId === "string"
        ? req.query.associacaoId
        : null;

    if (!associacaoId) {
      return res.status(400).json({ error: "associacao_id_obrigatorio" });
    }

    const membro = await isMembroAtivo(userId, associacaoId);
    if (!membro) {
      return res.status(403).json({ error: "acesso_negado_membro" });
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
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return res.status(400).json({ error: "periodo_invalido", message });
    }

    const result = await getTransparencia({ userId, associacaoId, periodo });
    return res.json(result);
  } catch (error) {
    console.error("GET /me/transparencia error", error);
    return res.status(500).json({ error: "transparencia_failed" });
  }
}

export async function getResumoMesController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: "nao_autenticado" });

    const associacaoId =
      typeof req.query.associacao_id === "string"
        ? req.query.associacao_id
        : typeof req.query.associacaoId === "string"
        ? req.query.associacaoId
        : null;
    if (!associacaoId) {
      return res.status(400).json({ error: "associacao_id_obrigatorio" });
    }

    const [usr] = await db
      .select({ nome: usuario.nome })
      .from(usuario)
      .where(eq(usuario.id, userId))
      .limit(1);
    const [assoc] = await db
      .select({ nome: associacao.nome })
      .from(associacao)
      .where(eq(associacao.id, associacaoId))
      .limit(1);

    if (!usr || !assoc) {
      return res.status(404).json({ error: "dados_nao_encontrados" });
    }

    const result = await getResumoMes({
      userId,
      associacaoId,
      nomeMembro: usr.nome ?? "associado(a)",
      nomeAssociacao: assoc.nome,
    });

    if (!result.ok) {
      const status = result.reason === "acesso_negado_membro" ? 403 : 503;
      return res.status(status).json({ error: result.reason });
    }

    return res.json({ resumo: result.resumo, cached: result.cached });
  } catch (error) {
    console.error("GET /me/resumo-mes error", error);
    return res.status(500).json({ error: "resumo_mes_failed" });
  }
}
