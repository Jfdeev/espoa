import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import {
  requireAdminFromBody,
  requireAdminFromResource,
} from "../middleware/admin.guard";
import { getAta as loadAta } from "../services/ata.service";
import {
  postAta,
  getAtas,
  getAtaById,
  putAta,
  deleteAtaById,
  postAtaResumo,
} from "../controllers/ata.controller";

export const ataRouter = Router();

ataRouter.use(requireAuth);
ataRouter.get("/atas", getAtas);
ataRouter.get("/atas/:id", getAtaById);
ataRouter.post("/atas", requireAdminFromBody, postAta);
ataRouter.put("/atas/:id", requireAdminFromResource(loadAta), putAta);
ataRouter.delete(
  "/atas/:id",
  requireAdminFromResource(loadAta),
  deleteAtaById,
);
ataRouter.post("/atas/:id/resumo", postAtaResumo);
