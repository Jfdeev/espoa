import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import {
  syncUser,
  getMe,
  listarAssociacoes,
  criarAssociacao,
  solicitarVinculo,
  gerenciarVinculo,
} from "../controllers/auth.controller";

export const authRouter = Router();

authRouter.post("/auth/sync-user", requireAuth, syncUser);
authRouter.get("/auth/me", requireAuth, getMe);

authRouter.get("/associacoes", requireAuth, listarAssociacoes);
authRouter.post("/associacoes", requireAuth, criarAssociacao);
authRouter.post("/associacoes/:id/solicitar-vinculo", requireAuth, solicitarVinculo);
authRouter.patch("/associacoes/:assocId/vinculos/:userId", requireAuth, gerenciarVinculo);
