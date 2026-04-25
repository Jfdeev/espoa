import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import {
  postAssociacao,
  getAssociacoes,
  getAssociacaoById,
  putAssociacao,
  deleteAssociacaoById,
} from "../controllers/associacao.controller";

export const associacaoRouter = Router();

associacaoRouter.use(requireAuth);
associacaoRouter.get("/manage/associacoes", getAssociacoes);
associacaoRouter.get("/manage/associacoes/:id", getAssociacaoById);
associacaoRouter.post("/manage/associacoes", postAssociacao);
associacaoRouter.put("/manage/associacoes/:id", putAssociacao);
associacaoRouter.delete("/manage/associacoes/:id", deleteAssociacaoById);
