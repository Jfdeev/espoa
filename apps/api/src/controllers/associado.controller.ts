import type { Request, Response } from "express";
import {
  createAssociado,
  listAssociados,
  getAssociado,
  updateAssociado,
  deleteAssociado,
} from "../services/associado.service";
import { toCamelObject } from "../utils/case-mapper";
import { makeCrudHandlers } from "./crud.helpers";

const crud = makeCrudHandlers("associados", {
  list: listAssociados,
  getById: getAssociado,
  update: updateAssociado,
  remove: deleteAssociado,
  duplicateError: "cpf_duplicado",
  duplicateMessage: "Associado com este CPF já existe",
});

export async function postAssociado(req: Request, res: Response) {
  try {
    const body = toCamelObject(req.body);

    if (!body.nome || !body.dataEntrada) {
      return res
        .status(400)
        .json({ error: "nome and data_entrada are required" });
    }

    const result = await createAssociado(body as any);

    if ("error" in result && result.error === "cpf_duplicado") {
      return res.status(409).json({
        error: "cpf_duplicado",
        message: "Associado com este CPF já existe",
        existingId: result.existing,
      });
    }

    const { toSnakeObject } = await import("../utils/case-mapper");
    return res.status(201).json(toSnakeObject(result.data as any));
  } catch (error) {
    console.error("POST /associados error", error);
    return res.status(500).json({ error: "create_failed" });
  }
}

export const getAssociados = crud.list;
export const getAssociadoById = crud.getById;
export const putAssociado = crud.update;
export const deleteAssociadoById = crud.remove;
