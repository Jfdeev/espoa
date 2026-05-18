import { Router } from "express";
import { postPnaeReport } from "../controllers/pnae-report.controller";

export const pnaeReportRouter = Router();

pnaeReportRouter.post("/pnae-report", postPnaeReport);
