import type { Request, Response } from "express";
import {
  createMensalidade,
  listMensalidades,
  getMensalidade,
  updateMensalidade,
  deleteMensalidade,
} from "../services/mensalidade.service";
import { toCamelObject, toSnakeObject } from "../utils/case-mapper";
import { makeCrudHandlers } from "./crud.helpers";

const crud = makeCrudHandlers("mensalidades", {
  list: listMensalidades,
  getById: getMensalidade,
  update: updateMensalidade,
  remove: deleteMensalidade,
});

export async function postMensalidade(req: Request, res: Response) {
  try {
    const body = toCamelObject(req.body);

    if (!body.associadoId || body.valor === undefined) {
      return res
        .status(400)
        .json({ error: "associado_id and valor are required" });
    }

    const result = await createMensalidade(body as any);

    if ("error" in result && result.error === "associado_inexistente") {
      return res.status(400).json({ error: "associado_inexistente" });
    }

    return res.status(201).json(toSnakeObject(result.data as any));
  } catch (error) {
    console.error("POST /mensalidades error", error);
    return res.status(500).json({ error: "create_failed" });
  }
}

export async function putMensalidade(req: Request, res: Response) {
  try {
    const body = toCamelObject(req.body);
    const result = await updateMensalidade(req.params.id, body as any);

    if ("error" in result && result.error === "associado_inexistente") {
      return res.status(400).json({ error: "associado_inexistente" });
    }

    if ("error" in result && result.error === "not_found") {
      return res.status(404).json({ error: "not_found" });
    }

    return res.json(toSnakeObject(result.data as any));
  } catch (error) {
    console.error("PUT /mensalidades/:id error", error);
    return res.status(500).json({ error: "update_failed" });
  }
}

export const getMensalidades = crud.list;
export const getMensalidadeById = crud.getById;
export const deleteMensalidadeById = crud.remove;
