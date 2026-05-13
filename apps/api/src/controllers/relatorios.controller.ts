import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.middleware";
import { ensureUserIsMember } from "../middleware/associacao.guard";
import { resolvePeriod } from "../utils/period";
import {
  getRelatorioProducao,
  getRelatorioFinanceiro,
  getRelatorioMensalidades,
  getRelatorioAssociados,
} from "../services/relatorios.service";

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extrai e valida os parâmetros comuns de todos os endpoints de relatório.
 * Retorna `null` e envia a resposta de erro automaticamente se inválido.
 */
async function resolveReportParams(req: AuthenticatedRequest, res: Response) {
  const associacaoId =
    typeof req.query.associacao_id === "string" ? req.query.associacao_id : undefined;

  if (!associacaoId) {
    res.status(400).json({
      error: "associacao_id_obrigatorio",
      message: "O parâmetro associacao_id é obrigatório",
    });
    return null;
  }

  let periodo;
  try {
    periodo = resolvePeriod({
      periodo: typeof req.query.periodo === "string" ? req.query.periodo : undefined,
      inicio: typeof req.query.inicio === "string" ? req.query.inicio : undefined,
      fim: typeof req.query.fim === "string" ? req.query.fim : undefined,
    });
  } catch (error: any) {
    res.status(400).json({
      error: error.code ?? "periodo_invalido",
      message: error.message,
    });
    return null;
  }

  const isMember = await ensureUserIsMember(req.userId!, associacaoId);
  if (!isMember) {
    res.status(403).json({
      error: "acesso_negado",
      message: "Usuário não é membro ativo desta associação",
    });
    return null;
  }

  return { associacaoId, periodo, userId: req.userId! };
}

// ── Handlers ─────────────────────────────────────────────────────────────────

export async function getRelatorioproducao(req: AuthenticatedRequest, res: Response) {
  const params = await resolveReportParams(req, res);
  if (!params) return;

  try {
    const result = await getRelatorioProducao(params);
    return res.json(result);
  } catch (error) {
    console.error("GET /relatorios/producao error", error);
    return res.status(500).json({ error: "relatorio_falhou" });
  }
}

export async function getRelatoriofinanceiro(req: AuthenticatedRequest, res: Response) {
  const params = await resolveReportParams(req, res);
  if (!params) return;

  try {
    const result = await getRelatorioFinanceiro(params);
    return res.json(result);
  } catch (error) {
    console.error("GET /relatorios/financeiro error", error);
    return res.status(500).json({ error: "relatorio_falhou" });
  }
}

export async function getRelatorioMensalidadesHandler(
  req: AuthenticatedRequest,
  res: Response,
) {
  const params = await resolveReportParams(req, res);
  if (!params) return;

  try {
    const result = await getRelatorioMensalidades(params);
    return res.json(result);
  } catch (error) {
    console.error("GET /relatorios/mensalidades error", error);
    return res.status(500).json({ error: "relatorio_falhou" });
  }
}

export async function getRelatorioAssociadosHandler(
  req: AuthenticatedRequest,
  res: Response,
) {
  const params = await resolveReportParams(req, res);
  if (!params) return;

  try {
    const result = await getRelatorioAssociados(params);
    return res.json(result);
  } catch (error) {
    console.error("GET /relatorios/associados error", error);
    return res.status(500).json({ error: "relatorio_falhou" });
  }
}
