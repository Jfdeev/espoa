import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.middleware";
import {
  createAssociacao,
  listAssociacoes,
  getAssociacao,
  updateAssociacao,
  deleteAssociacao,
} from "../services/associacao.service";
import { toCamelObject } from "../utils/case-mapper";
import { makeCrudHandlers } from "./crud.helpers";

const crud = makeCrudHandlers("associacoes", {
  list: listAssociacoes,
  getById: getAssociacao,
  update: updateAssociacao,
  remove: deleteAssociacao,
  duplicateError: "cnpj_duplicado",
  duplicateMessage: "Associação com este CNPJ já existe",
});

export async function postAssociacao(req: AuthenticatedRequest, res: Response) {
  try {
    const body = toCamelObject(req.body);

    if (!body.nome || !body.cnpj || !body.municipio || !body.estado) {
      return res
        .status(400)
        .json({ error: "nome, cnpj, municipio and estado are required" });
    }

    const result = await createAssociacao({
      ...(body as any),
      createdBy: req.userId,
    });

    if ("error" in result && result.error === "cnpj_duplicado") {
      return res.status(409).json({
        error: "cnpj_duplicado",
        message: "Associação com este CNPJ já existe",
        existingId: result.existing,
      });
    }

    const { toSnakeObject } = await import("../utils/case-mapper");
    return res.status(201).json(toSnakeObject(result.data as any));
  } catch (error) {
    console.error("POST /associacoes error", error);
    return res.status(500).json({ error: "create_failed" });
  }
}

export const getAssociacoes = crud.list;
export const getAssociacaoById = crud.getById;
export const putAssociacao = crud.update;
export const deleteAssociacaoById = crud.remove;
