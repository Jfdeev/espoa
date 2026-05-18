import type { Request, Response } from "express";
import {
  createProducao,
  listProducoes,
  getProducao,
  updateProducao,
  deleteProducao,
} from "../services/producao.service";
import { toCamelObject, toSnakeObject } from "../utils/case-mapper";
import { makeCrudHandlers } from "./crud.helpers";

const crud = makeCrudHandlers("producoes", {
  list: listProducoes,
  getById: getProducao,
  update: updateProducao,
  remove: deleteProducao,
});

export async function postProducao(req: Request, res: Response) {
  try {
    const body = toCamelObject(req.body);

    if (
      !body.associadoId ||
      !body.cultura ||
      typeof body.quantidade !== "number" ||
      body.quantidade <= 0 ||
      !body.data
    ) {
      return res.status(400).json({
        error: "associado_id, cultura, quantidade and data are required",
      });
    }

    const result = await createProducao(body as any);

    return res.status(201).json(toSnakeObject(result.data as any));
  } catch (error) {
    console.error("POST /producoes error", error);
    return res.status(500).json({ error: "create_failed" });
  }
}

export async function getProducoes(req: Request, res: Response) {
  try {
    const { associacao_id } = req.query as { associacao_id?: string };
    const rows = await listProducoes(associacao_id);
    return res.json(rows.map((r) => toSnakeObject(r as any)));
  } catch (error) {
    console.error("GET /producoes error", error);
    return res.status(500).json({ error: "list_failed" });
  }
}

export const getProducaoById = crud.getById;
export const putProducao = crud.update;
export const deleteProducaoById = crud.remove;
