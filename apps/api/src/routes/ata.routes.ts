import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import {
  postAta,
  getAtas,
  getAtaById,
  putAta,
  deleteAtaById,
} from "../controllers/ata.controller";

export const ataRouter = Router();

ataRouter.use(requireAuth);
ataRouter.post("/atas", postAta);
ataRouter.get("/atas", getAtas);
ataRouter.get("/atas/:id", getAtaById);
ataRouter.put("/atas/:id", putAta);
ataRouter.delete("/atas/:id", deleteAtaById);
