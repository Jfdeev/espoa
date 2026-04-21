import { Router } from "express";
import {
  postAssociacao,
  getAssociacoes,
  getAssociacaoById,
  putAssociacao,
  deleteAssociacaoById,
} from "../controllers/associacao.controller";

export const associacaoRouter = Router();

associacaoRouter.post("/associacoes", postAssociacao);
associacaoRouter.get("/associacoes", getAssociacoes);
associacaoRouter.get("/associacoes/:id", getAssociacaoById);
associacaoRouter.put("/associacoes/:id", putAssociacao);
associacaoRouter.delete("/associacoes/:id", deleteAssociacaoById);
