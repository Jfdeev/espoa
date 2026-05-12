import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import {
  getRelatorioproducao,
  getRelatoriofinanceiro,
  getRelatorioMensalidadesHandler,
  getRelatorioAssociadosHandler,
} from "../controllers/relatorios.controller";

export const relatoriosRouter = Router();

relatoriosRouter.use(requireAuth);

relatoriosRouter.get("/relatorios/producao", getRelatorioproducao);
relatoriosRouter.get("/relatorios/financeiro", getRelatoriofinanceiro);
relatoriosRouter.get("/relatorios/mensalidades", getRelatorioMensalidadesHandler);
relatoriosRouter.get("/relatorios/associados", getRelatorioAssociadosHandler);
