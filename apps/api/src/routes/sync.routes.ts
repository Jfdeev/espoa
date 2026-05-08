import { Router } from "express";
import { postSync } from "../controllers/sync.controller";
import { requireAuth } from "../middleware/auth.middleware";

export const syncRouter = Router();

syncRouter.post("/sync", requireAuth, postSync);
