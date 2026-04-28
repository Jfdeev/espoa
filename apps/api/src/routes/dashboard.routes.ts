import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { getDashboard } from "../controllers/dashboard.controller";

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);
dashboardRouter.get("/dashboard", getDashboard);
