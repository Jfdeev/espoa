import type { Request, Response } from "express";
import {
  createAssociado,
  listAssociados,
  getAssociado,
  updateAssociado,
  deleteAssociado,
} from "../services/associado.service";
import { toSnakeObject, toCamelObject } from "../utils/case-mapper";

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

    return res.status(201).json(toSnakeObject(result.data as any));
  } catch (error) {
    console.error("POST /associados error", error);
    return res.status(500).json({ error: "create_failed" });
  }
}

export async function getAssociados(_req: Request, res: Response) {
  try {
    const rows = await listAssociados();
    return res.json(rows.map((r) => toSnakeObject(r as any)));
  } catch (error) {
    console.error("GET /associados error", error);
    return res.status(500).json({ error: "list_failed" });
  }
}

export async function getAssociadoById(req: Request, res: Response) {
  try {
    const row = await getAssociado(req.params.id);
    if (!row) {
      return res.status(404).json({ error: "not_found" });
    }
    return res.json(toSnakeObject(row as any));
  } catch (error) {
    console.error("GET /associados/:id error", error);
    return res.status(500).json({ error: "get_failed" });
  }
}

export async function putAssociado(req: Request, res: Response) {
  try {
    const body = toCamelObject(req.body);
    const result = await updateAssociado(req.params.id, body as any);

    if ("error" in result && result.error === "cpf_duplicado") {
      return res.status(409).json({
        error: "cpf_duplicado",
        message: "Associado com este CPF já existe",
        existingId: result.existing,
      });
    }

    if ("error" in result && result.error === "not_found") {
      return res.status(404).json({ error: "not_found" });
    }

    return res.json(toSnakeObject(result.data as any));
  } catch (error) {
    console.error("PUT /associados/:id error", error);
    return res.status(500).json({ error: "update_failed" });
  }
}

export async function deleteAssociadoById(req: Request, res: Response) {
  try {
    const result = await deleteAssociado(req.params.id);

    if ("error" in result) {
      return res.status(404).json({ error: "not_found" });
    }

    return res.json({ deleted: true, id: req.params.id });
  } catch (error) {
    console.error("DELETE /associados/:id error", error);
    return res.status(500).json({ error: "delete_failed" });
  }
}
