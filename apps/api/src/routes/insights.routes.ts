import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import {
  getInsightsHandler,
  getSnapshotHandler,
} from "../controllers/insights.controller";

export const insightsRouter = Router();

insightsRouter.use(requireAuth);
insightsRouter.get("/insights", getInsightsHandler);
insightsRouter.get("/insights/snapshot", getSnapshotHandler);
