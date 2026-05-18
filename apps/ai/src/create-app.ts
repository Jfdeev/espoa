import cors from "cors";
import express from "express";
import { healthRouter } from "./routes/health.routes";
import { insightsRouter } from "./routes/insights.routes";
import { pnaeReportRouter } from "./routes/pnae-report.routes";
import { suggestionsRouter } from "./routes/suggestions.routes";

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.use(healthRouter);
app.use(insightsRouter);
app.use(pnaeReportRouter);
app.use(suggestionsRouter);

export { app };
