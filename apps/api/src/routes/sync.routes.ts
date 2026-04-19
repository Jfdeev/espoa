import { Router } from "express";
import { postSync } from "../controllers/sync.controller";

export const syncRouter = Router();

syncRouter.post("/sync", postSync);
