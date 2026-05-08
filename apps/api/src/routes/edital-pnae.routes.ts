import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
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
editalPnaeRouter.post("/manage/editais-pnae", postEditalPnae);
editalPnaeRouter.put("/manage/editais-pnae/:id", putEditalPnae);
editalPnaeRouter.delete("/manage/editais-pnae/:id", deleteEditalPnaeById);
