import { Router } from "express";
import {
  postAssociado,
  getAssociados,
  getAssociadoById,
  putAssociado,
  deleteAssociadoById,
} from "../controllers/associado.controller";

export const associadoRouter = Router();

associadoRouter.post("/associados", postAssociado);
associadoRouter.get("/associados", getAssociados);
associadoRouter.get("/associados/:id", getAssociadoById);
associadoRouter.put("/associados/:id", putAssociado);
associadoRouter.delete("/associados/:id", deleteAssociadoById);
