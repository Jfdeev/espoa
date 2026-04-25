import type { Request, Response } from "express";
import { toSnakeObject, toCamelObject } from "../utils/case-mapper";

type ServiceResult =
  | { data: Record<string, unknown> }
  | { error: string; existing?: string };

interface CrudServices {
  list: () => Promise<Record<string, unknown>[]>;
  getById: (id: string) => Promise<Record<string, unknown> | null>;
  update: (id: string, data: any) => Promise<ServiceResult>;
  remove: (id: string) => Promise<ServiceResult>;
  duplicateError?: string;
  duplicateMessage?: string;
}

export function makeCrudHandlers(entity: string, services: CrudServices) {
  return {
    list: async (_req: Request, res: Response) => {
      try {
        const rows = await services.list();
        return res.json(rows.map((r) => toSnakeObject(r as any)));
      } catch (error) {
        console.error(`GET /${entity} error`, error);
        return res.status(500).json({ error: "list_failed" });
      }
    },

    getById: async (req: Request, res: Response) => {
      try {
        const row = await services.getById(req.params.id);
        if (!row) {
          return res.status(404).json({ error: "not_found" });
        }
        return res.json(toSnakeObject(row as any));
      } catch (error) {
        console.error(`GET /${entity}/:id error`, error);
        return res.status(500).json({ error: "get_failed" });
      }
    },

    update: async (req: Request, res: Response) => {
      try {
        const body = toCamelObject(req.body);
        const result = await services.update(req.params.id, body as any);

        if ("error" in result && result.error === services.duplicateError) {
          return res.status(409).json({
            error: result.error,
            message: services.duplicateMessage,
            existingId: result.existing,
          });
        }

        if ("error" in result && result.error === "not_found") {
          return res.status(404).json({ error: "not_found" });
        }

        return res.json(toSnakeObject(result.data as any));
      } catch (error) {
        console.error(`PUT /${entity}/:id error`, error);
        return res.status(500).json({ error: "update_failed" });
      }
    },

    remove: async (req: Request, res: Response) => {
      try {
        const result = await services.remove(req.params.id);

        if ("error" in result) {
          return res.status(404).json({ error: "not_found" });
        }

        return res.json({ deleted: true, id: req.params.id });
      } catch (error) {
        console.error(`DELETE /${entity}/:id error`, error);
        return res.status(500).json({ error: "delete_failed" });
      }
    },
  };
}
