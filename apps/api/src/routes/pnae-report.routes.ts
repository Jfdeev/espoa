import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { getPnaeReportHandler } from "../controllers/pnae-report.controller";

export const pnaeReportRouter = Router();

pnaeReportRouter.use(requireAuth);
pnaeReportRouter.get("/pnae-report", getPnaeReportHandler);
