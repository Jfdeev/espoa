import type { Request, Response } from "express";
import {
  createAta,
  listAtas,
  getAta,
  updateAta,
  deleteAta,
} from "../services/ata.service";
import { toCamelObject, toSnakeObject } from "../utils/case-mapper";
import { makeCrudHandlers } from "./crud.helpers";

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
    return res.status(201).json(toSnakeObject(result.data as any));
  } catch (error) {
    console.error("POST /atas error", error);
    return res.status(500).json({ error: "create_failed" });
  }
}

export const getAtaById = crud.getById;
export const putAta = crud.update;
export const deleteAtaById = crud.remove;
