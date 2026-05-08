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

export const getProducoes = crud.list;
export const getProducaoById = crud.getById;
export const putProducao = crud.update;
export const deleteProducaoById = crud.remove;
