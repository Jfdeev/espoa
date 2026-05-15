import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import {
  getMensalidadesMinha,
  gerarPix,
  verificarPix,
  pixWebhook,
} from "../controllers/pix.controller";

export const pixRouter = Router();

pixRouter.post("/pix/webhook", pixWebhook);

pixRouter.use(requireAuth);
pixRouter.get("/mensalidades/minha", getMensalidadesMinha);
pixRouter.post("/pix/gerar", gerarPix);
pixRouter.post("/pix/verificar", verificarPix);
