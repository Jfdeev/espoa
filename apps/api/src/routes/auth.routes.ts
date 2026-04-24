import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import {
  register,
  login,
  googleAuth,
  forgotPassword,
  resetPassword,
  verifyEmail,
  getMe,
  listarAssociacoes,
  criarAssociacao,
  solicitarVinculo,
  gerenciarVinculo,
} from "../controllers/auth.controller";

export const authRouter = Router();

// Rotas públicas
authRouter.post("/auth/register", register);
authRouter.post("/auth/login", login);
authRouter.post("/auth/google", googleAuth);
authRouter.post("/auth/forgot-password", forgotPassword);
authRouter.post("/auth/reset-password", resetPassword);
authRouter.get("/auth/verify-email", verifyEmail);

// Rotas protegidas
authRouter.get("/auth/me", requireAuth, getMe);
authRouter.get("/associacoes", requireAuth, listarAssociacoes);
authRouter.post("/associacoes", requireAuth, criarAssociacao);
authRouter.post("/associacoes/:id/solicitar-vinculo", requireAuth, solicitarVinculo);
authRouter.patch("/associacoes/:assocId/vinculos/:userId", requireAuth, gerenciarVinculo);
