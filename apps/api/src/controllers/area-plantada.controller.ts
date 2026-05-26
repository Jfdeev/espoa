import type { Request, Response } from "express";
import {
  createAreaPlantada,
  listAreasPlantadas,
  getAreaPlantada,
  updateAreaPlantada,
  deleteAreaPlantada,
} from "../services/area-plantada.service";
import { toCamelObject, toSnakeObject } from "../utils/case-mapper";
import { makeCrudHandlers } from "./crud.helpers";

const crud = makeCrudHandlers("areas-plantadas", {
  list: listAreasPlantadas,
  getById: getAreaPlantada,
  update: updateAreaPlantada,
  remove: deleteAreaPlantada,
});

export async function postAreaPlantada(req: Request, res: Response) {
  try {
    const body = toCamelObject(req.body);

    if (
      !body.associadoId ||
      !body.cultura ||
      typeof body.areaHa !== "number" ||
      body.areaHa <= 0 ||
      !body.dataReferencia
    ) {
      return res.status(400).json({
        error: "associado_id, cultura, area_ha and data_referencia are required",
      });
    }

    const result = await createAreaPlantada(body as any);

    return res.status(201).json(toSnakeObject(result.data as any));
  } catch (error) {
    console.error("POST /areas-plantadas error", error);
    return res.status(500).json({ error: "create_failed" });
  }
}

export async function getAreasPlantadas(req: Request, res: Response) {
  try {
    const { associacao_id } = req.query as { associacao_id?: string };
    const rows = await listAreasPlantadas(associacao_id);
    return res.json(rows.map((r) => toSnakeObject(r as any)));
  } catch (error) {
    console.error("GET /areas-plantadas error", error);
    return res.status(500).json({ error: "list_failed" });
  }
}

export const getAreaPlantadaById = crud.getById;
export const putAreaPlantada = crud.update;
export const deleteAreaPlantadaById = crud.remove;
