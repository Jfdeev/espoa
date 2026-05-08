import { Router } from "express";
import { postInsights } from "../controllers/insights.controller";

export const insightsRouter = Router();

insightsRouter.post("/insights", postInsights);
