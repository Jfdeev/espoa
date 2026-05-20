import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import {
  requireAdminFromBody,
  requireAdminFromResource,
} from "../middleware/admin.guard";
import { getEditalPnae as loadEditalPnae } from "../services/edital-pnae.service";
import {
  postEditalPnae,
  getEditalPnaes,
  getEditalPnaeById,
  putEditalPnae,
  deleteEditalPnaeById,
} from "../controllers/edital-pnae.controller";

export const editalPnaeRouter = Router();

editalPnaeRouter.use(requireAuth);
editalPnaeRouter.get("/manage/editais-pnae", getEditalPnaes);
editalPnaeRouter.get("/manage/editais-pnae/:id", getEditalPnaeById);
editalPnaeRouter.post(
  "/manage/editais-pnae",
  requireAdminFromBody,
  postEditalPnae,
);
editalPnaeRouter.put(
  "/manage/editais-pnae/:id",
  requireAdminFromResource(loadEditalPnae),
  putEditalPnae,
);
editalPnaeRouter.delete(
  "/manage/editais-pnae/:id",
  requireAdminFromResource(loadEditalPnae),
  deleteEditalPnaeById,
);
