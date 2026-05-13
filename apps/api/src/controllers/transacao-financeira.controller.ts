import type { Request, Response } from "express";
import {
  createTransacaoFinanceira,
  listTransacoesFinanceiras,
  getTransacaoFinanceira,
  updateTransacaoFinanceira,
  deleteTransacaoFinanceira,
} from "../services/transacao-financeira.service";
import { toCamelObject, toSnakeObject } from "../utils/case-mapper";
import { makeCrudHandlers } from "./crud.helpers";

const crud = makeCrudHandlers("transacoes-financeiras", {
  list: listTransacoesFinanceiras,
  getById: getTransacaoFinanceira,
  update: updateTransacaoFinanceira,
  remove: deleteTransacaoFinanceira,
});

export async function postTransacaoFinanceira(req: Request, res: Response) {
  try {
    const body = toCamelObject(req.body);

    if (!body.tipo || typeof body.tipo !== "string") {
      return res.status(400).json({ error: "tipo is required" });
    }

    if (
      body.valor == null ||
      typeof body.valor !== "number" ||
      !Number.isFinite(body.valor)
    ) {
      return res.status(400).json({ error: "valor must be a number" });
    }

    if (!body.data || typeof body.data !== "string") {
      return res.status(400).json({ error: "data is required" });
    }

    const result = await createTransacaoFinanceira(body as any);
    return res.status(201).json(toSnakeObject(result.data as any));
  } catch (error) {
    console.error("POST /transacoes-financeiras error", error);
    return res.status(500).json({ error: "create_failed" });
  }
}

export const getTransacoesFinanceiras = crud.list;
export const getTransacaoFinanceiraById = crud.getById;
export const putTransacaoFinanceira = crud.update;
export const deleteTransacaoFinanceiraById = crud.remove;
