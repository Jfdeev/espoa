import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import {
  postMensalidade,
  getMensalidades,
  getMensalidadeById,
  putMensalidade,
  deleteMensalidadeById,
} from "../controllers/mensalidade.controller";

export const mensalidadeRouter = Router();

mensalidadeRouter.use(requireAuth);
mensalidadeRouter.post("/mensalidades", postMensalidade);
mensalidadeRouter.get("/mensalidades", getMensalidades);
mensalidadeRouter.get("/mensalidades/:id", getMensalidadeById);
mensalidadeRouter.put("/mensalidades/:id", putMensalidade);
mensalidadeRouter.delete("/mensalidades/:id", deleteMensalidadeById);
