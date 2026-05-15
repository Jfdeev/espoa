import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.middleware";
import {
  createEditalPnae,
  listEditaisPnae,
  getEditalPnae,
  updateEditalPnae,
  deleteEditalPnae,
} from "../services/edital-pnae.service";
import { toCamelObject, toSnakeObject } from "../utils/case-mapper";
import { makeCrudHandlers } from "./crud.helpers";

const crud = makeCrudHandlers("editais-pnae", {
  list: listEditaisPnae,
  getById: getEditalPnae,
  update: updateEditalPnae,
  remove: deleteEditalPnae,
});

export async function postEditalPnae(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const body = toCamelObject(req.body);

    if (!body.associacaoId || !body.titulo || !body.dataLimite) {
      return res.status(400).json({
        error: "associacao_id, titulo and data_limite are required",
      });
    }

    const result = await createEditalPnae({
      ...(body as any),
      createdBy: req.userId,
    });

    return res.status(201).json(toSnakeObject(result.data as any));
  } catch (error) {
    console.error("POST /manage/editais-pnae error", error);
    return res.status(500).json({ error: "create_failed" });
  }
}

export async function getEditalPnaes(req: Request, res: Response) {
  try {
    const associacaoId =
      typeof req.query.associacao_id === "string"
        ? req.query.associacao_id
        : undefined;
    const status =
      typeof req.query.status === "string" ? req.query.status : undefined;
    const municipio =
      typeof req.query.municipio === "string" ? req.query.municipio : undefined;

    const rows = await listEditaisPnae({ associacaoId, status, municipio });
    return res.json(rows.map((r) => toSnakeObject(r as any)));
  } catch (error) {
    console.error("GET /manage/editais-pnae error", error);
    return res.status(500).json({ error: "list_failed" });
  }
}

export const getEditalPnaeById = crud.getById;
export const putEditalPnae = crud.update;
export const deleteEditalPnaeById = crud.remove;
