import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import {
  requireAdminFromBody,
  requireAdminFromResource,
} from "../middleware/admin.guard";
import { getAviso as loadAviso } from "../services/aviso.service";
import {
  postAvisoController,
  getAvisosController,
  getAvisoByIdController,
  putAvisoController,
  deleteAvisoController,
  getAvisosAtivosController,
} from "../controllers/aviso.controller";

export const avisoRouter = Router();

avisoRouter.use(requireAuth);

// Membro: lista avisos ativos da associação (read-only)
avisoRouter.get("/me/avisos", getAvisosAtivosController);

// Admin: CRUD completo
avisoRouter.get("/avisos", getAvisosController);
avisoRouter.get("/avisos/:id", getAvisoByIdController);
avisoRouter.post("/avisos", requireAdminFromBody, postAvisoController);
avisoRouter.put(
  "/avisos/:id",
  requireAdminFromResource(loadAviso),
  putAvisoController,
);
avisoRouter.delete(
  "/avisos/:id",
  requireAdminFromResource(loadAviso),
  deleteAvisoController,
);
