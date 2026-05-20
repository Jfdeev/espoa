import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.middleware";
import {
  createAta,
  listAtas,
  getAta,
  updateAta,
  deleteAta,
} from "../services/ata.service";
import { toCamelObject, toSnakeObject } from "../utils/case-mapper";
import { makeCrudHandlers } from "./crud.helpers";
import { notifyMembersOfNewAta } from "../services/ata-notifications.service";
import {
  getOrGenerateAtaResumo,
  getAtaAssociacaoId,
} from "../services/ata-resumo.service";
import { ensureUserIsMember } from "../middleware/associacao.guard";

const crud = makeCrudHandlers("atas", {
  list: listAtas,
  getById: getAta,
  update: updateAta,
  remove: deleteAta,
});

export async function getAtas(req: Request, res: Response) {
  try {
    const associacaoId =
      typeof req.query.associacao_id === "string"
        ? req.query.associacao_id
        : undefined;

    const rows = await listAtas({ associacaoId });
    return res.json(rows.map((r) => toSnakeObject(r as any)));
  } catch (error) {
    console.error("GET /atas error", error);
    return res.status(500).json({ error: "list_failed" });
  }
}

export async function postAta(req: Request, res: Response) {
  try {
    const body = toCamelObject(req.body);

    if (!body.titulo || typeof body.titulo !== "string") {
      return res.status(400).json({ error: "titulo is required" });
    }

    if (!body.conteudo || typeof body.conteudo !== "string") {
      return res.status(400).json({ error: "conteudo is required" });
    }

    if (!body.data || typeof body.data !== "string") {
      return res.status(400).json({ error: "data is required" });
    }

    const result = await createAta(body as any);

    // Fire-and-forget: notifica membros ativos da associação por email
    if (result.data?.associacaoId) {
      void notifyMembersOfNewAta({
        associacaoId: result.data.associacaoId,
        tituloAta: result.data.titulo,
        dataAta: result.data.data,
      });
    }

    return res.status(201).json(toSnakeObject(result.data as any));
  } catch (error) {
    console.error("POST /atas error", error);
    return res.status(500).json({ error: "create_failed" });
  }
}

export const getAtaById = crud.getById;
export const putAta = crud.update;
export const deleteAtaById = crud.remove;

export async function postAtaResumo(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: "nao_autenticado" });
    }

    const id = req.params.id;
    if (!id) return res.status(400).json({ error: "id_obrigatorio" });

    const associacaoId = await getAtaAssociacaoId(id);
    if (!associacaoId) {
      return res.status(404).json({ error: "ata_nao_encontrada" });
    }

    const membro = await ensureUserIsMember(req.userId, associacaoId);
    if (!membro) {
      return res.status(403).json({ error: "acesso_negado_membro" });
    }

    const result = await getOrGenerateAtaResumo(id);
    if (!result.ok) {
      const status = result.reason === "ata_nao_encontrada" ? 404 : 503;
      return res.status(status).json({ error: result.reason });
    }

    return res.json({ resumo: result.resumo, cached: result.cached });
  } catch (error) {
    console.error("POST /atas/:id/resumo error", error);
    return res.status(500).json({ error: "resumo_failed" });
  }
}
