import type { Request, Response } from "express";
import {
  createAssociacao,
  listAssociacoes,
  getAssociacao,
  updateAssociacao,
  deleteAssociacao,
} from "../services/associacao.service";
import { toSnakeObject, toCamelObject } from "../utils/case-mapper";

export async function postAssociacao(req: Request, res: Response) {
  try {
    const body = toCamelObject(req.body);

    if (!body.nome) {
      return res.status(400).json({ error: "nome is required" });
    }

    const result = await createAssociacao(body as any);

    if ("error" in result && result.error === "cnpj_duplicado") {
      return res.status(409).json({
        error: "cnpj_duplicado",
        message: "Associação com este CNPJ já existe",
        existingId: result.existing,
      });
    }

    return res.status(201).json(toSnakeObject(result.data as any));
  } catch (error) {
    console.error("POST /associacoes error", error);
    return res.status(500).json({ error: "create_failed" });
  }
}

export async function getAssociacoes(_req: Request, res: Response) {
  try {
    const rows = await listAssociacoes();
    return res.json(rows.map((r) => toSnakeObject(r as any)));
  } catch (error) {
    console.error("GET /associacoes error", error);
    return res.status(500).json({ error: "list_failed" });
  }
}

export async function getAssociacaoById(req: Request, res: Response) {
  try {
    const row = await getAssociacao(req.params.id);
    if (!row) {
      return res.status(404).json({ error: "not_found" });
    }
    return res.json(toSnakeObject(row as any));
  } catch (error) {
    console.error("GET /associacoes/:id error", error);
    return res.status(500).json({ error: "get_failed" });
  }
}

export async function putAssociacao(req: Request, res: Response) {
  try {
    const body = toCamelObject(req.body);
    const result = await updateAssociacao(req.params.id, body as any);

    if ("error" in result && result.error === "cnpj_duplicado") {
      return res.status(409).json({
        error: "cnpj_duplicado",
        message: "Associação com este CNPJ já existe",
        existingId: result.existing,
      });
    }

    if ("error" in result && result.error === "not_found") {
      return res.status(404).json({ error: "not_found" });
    }

    return res.json(toSnakeObject(result.data as any));
  } catch (error) {
    console.error("PUT /associacoes/:id error", error);
    return res.status(500).json({ error: "update_failed" });
  }
}

export async function deleteAssociacaoById(req: Request, res: Response) {
  try {
    const result = await deleteAssociacao(req.params.id);

    if ("error" in result) {
      return res.status(404).json({ error: "not_found" });
    }

    return res.json({ deleted: true, id: req.params.id });
  } catch (error) {
    console.error("DELETE /associacoes/:id error", error);
    return res.status(500).json({ error: "delete_failed" });
  }
}
