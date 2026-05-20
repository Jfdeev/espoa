import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import {
  requireAdminFromBody,
  requireAdminFromResource,
} from "../middleware/admin.guard";
import { getAssociado as loadAssociado } from "../services/associado.service";
import {
  postAssociado,
  getAssociados,
  getAssociadoById,
  putAssociado,
  deleteAssociadoById,
} from "../controllers/associado.controller";

export const associadoRouter = Router();

associadoRouter.use(requireAuth);
associadoRouter.get("/associados", getAssociados);
associadoRouter.get("/associados/:id", getAssociadoById);
associadoRouter.post("/associados", requireAdminFromBody, postAssociado);
associadoRouter.put(
  "/associados/:id",
  requireAdminFromResource(loadAssociado),
  putAssociado,
);
associadoRouter.delete(
  "/associados/:id",
  requireAdminFromResource(loadAssociado),
  deleteAssociadoById,
);
