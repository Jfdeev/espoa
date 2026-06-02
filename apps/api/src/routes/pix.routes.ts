import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import {
  getMensalidadesMinha,
  gerarPix,
  verificarPix,
  confirmarPix,
  pixWebhook,
  getPixStatus,
} from "../controllers/pix.controller";

export const pixRouter = Router();

pixRouter.post("/pix/webhook", pixWebhook);

pixRouter.use(requireAuth);
pixRouter.get("/pix/status", getPixStatus);
pixRouter.post("/pix/confirmar", confirmarPix);
pixRouter.get("/mensalidades/minha", getMensalidadesMinha);
pixRouter.post("/pix/gerar", gerarPix);
pixRouter.post("/pix/verificar", verificarPix);
