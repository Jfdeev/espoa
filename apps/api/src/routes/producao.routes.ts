import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import {
  postProducao,
  getProducoes,
  getProducaoById,
  putProducao,
  deleteProducaoById,
} from "../controllers/producao.controller";

export const producaoRouter = Router();

producaoRouter.use(requireAuth);
producaoRouter.post("/producoes", postProducao);
producaoRouter.get("/producoes", getProducoes);
producaoRouter.get("/producoes/:id", getProducaoById);
producaoRouter.put("/producoes/:id", putProducao);
producaoRouter.delete("/producoes/:id", deleteProducaoById);
