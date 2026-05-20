import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import {
  getTransparenciaController,
  getResumoMesController,
} from "../controllers/transparencia.controller";
import { postAssistenteController } from "../controllers/assistente.controller";

export const transparenciaRouter = Router();

transparenciaRouter.use(requireAuth);
transparenciaRouter.get("/me/transparencia", getTransparenciaController);
transparenciaRouter.get("/me/resumo-mes", getResumoMesController);
transparenciaRouter.post("/me/assistente", postAssistenteController);
