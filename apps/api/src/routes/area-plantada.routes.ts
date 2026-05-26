import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import {
  postAreaPlantada,
  getAreasPlantadas,
  getAreaPlantadaById,
  putAreaPlantada,
  deleteAreaPlantadaById,
} from "../controllers/area-plantada.controller";

export const areaPlantadaRouter = Router();

areaPlantadaRouter.use(requireAuth);
areaPlantadaRouter.post("/areas-plantadas", postAreaPlantada);
areaPlantadaRouter.get("/areas-plantadas", getAreasPlantadas);
areaPlantadaRouter.get("/areas-plantadas/:id", getAreaPlantadaById);
areaPlantadaRouter.put("/areas-plantadas/:id", putAreaPlantada);
areaPlantadaRouter.delete("/areas-plantadas/:id", deleteAreaPlantadaById);
