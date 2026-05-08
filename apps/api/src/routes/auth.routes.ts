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
  updateProfile,
  listarAssociacoes,
  criarAssociacao,
  solicitarVinculo,
  gerenciarVinculo,
  listarVinculosAssociacao,
  alterarRoleVinculo,
  convidarMembro,
  responderConvite,
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
authRouter.patch("/auth/profile", requireAuth, updateProfile);
authRouter.get("/associacoes", requireAuth, listarAssociacoes);
authRouter.post("/associacoes", requireAuth, criarAssociacao);
authRouter.post("/associacoes/:id/solicitar-vinculo", requireAuth, solicitarVinculo);
authRouter.get("/associacoes/:id/vinculos", requireAuth, listarVinculosAssociacao);
authRouter.patch("/associacoes/:assocId/vinculos/:userId", requireAuth, gerenciarVinculo);
authRouter.patch("/associacoes/:assocId/vinculos/:userId/role", requireAuth, alterarRoleVinculo);
authRouter.post("/associacoes/:assocId/convidar", requireAuth, convidarMembro);
authRouter.post("/associacoes/:assocId/responder-convite", requireAuth, responderConvite);
