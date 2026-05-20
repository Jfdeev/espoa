import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.middleware";
import { ensureUserIsMember } from "../middleware/associacao.guard";
import {
  createAviso,
  listAvisos,
  listAvisosAtivos,
  getAviso,
  updateAviso,
  deleteAviso,
} from "../services/aviso.service";
import { toCamelObject, toSnakeObject } from "../utils/case-mapper";

export async function postAvisoController(req: Request, res: Response) {
  try {
    const body = toCamelObject(req.body);

    if (!body.titulo?.trim()) {
      return res.status(400).json({ error: "titulo_obrigatorio" });
    }
    if (!body.mensagem?.trim()) {
      return res.status(400).json({ error: "mensagem_obrigatoria" });
    }
    if (!body.associacaoId) {
      return res.status(400).json({ error: "associacao_id_obrigatorio" });
    }

    const result = await createAviso(body as any);
    return res.status(201).json(toSnakeObject(result.data as any));
  } catch (error) {
    console.error("POST /avisos error", error);
    return res.status(500).json({ error: "create_failed" });
  }
}

export async function getAvisosController(req: Request, res: Response) {
  try {
    const associacaoId =
      typeof req.query.associacao_id === "string"
        ? req.query.associacao_id
        : typeof req.query.associacaoId === "string"
        ? req.query.associacaoId
        : undefined;
    const rows = await listAvisos({ associacaoId });
    return res.json(rows.map((r) => toSnakeObject(r as any)));
  } catch (error) {
    console.error("GET /avisos error", error);
    return res.status(500).json({ error: "list_failed" });
  }
}

export async function getAvisoByIdController(req: Request, res: Response) {
  try {
    const row = await getAviso(req.params.id);
    if (!row) return res.status(404).json({ error: "not_found" });
    return res.json(toSnakeObject(row as any));
  } catch (error) {
    console.error("GET /avisos/:id error", error);
    return res.status(500).json({ error: "get_failed" });
  }
}

export async function putAvisoController(req: Request, res: Response) {
  try {
    const body = toCamelObject(req.body);
    const result = await updateAviso(req.params.id, body as any);
    if ("error" in result) {
      return res.status(404).json({ error: result.error });
    }
    return res.json(toSnakeObject(result.data as any));
  } catch (error) {
    console.error("PUT /avisos/:id error", error);
    return res.status(500).json({ error: "update_failed" });
  }
}

export async function deleteAvisoController(req: Request, res: Response) {
  try {
    const result = await deleteAviso(req.params.id);
    if ("error" in result) {
      return res.status(404).json({ error: result.error });
    }
    return res.json({ deleted: true });
  } catch (error) {
    console.error("DELETE /avisos/:id error", error);
    return res.status(500).json({ error: "delete_failed" });
  }
}

/**
 * Endpoint para membros: lista avisos ativos (não expirados, não deletados)
 * da associação informada. Disponível para qualquer membro ativo.
 */
export async function getAvisosAtivosController(
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

    const membro = await ensureUserIsMember(userId, associacaoId);
    if (!membro) {
      return res.status(403).json({ error: "acesso_negado_membro" });
    }

    const rows = await listAvisosAtivos(associacaoId);
    return res.json(rows.map((r) => toSnakeObject(r as any)));
  } catch (error) {
    console.error("GET /me/avisos error", error);
    return res.status(500).json({ error: "list_failed" });
  }
}
