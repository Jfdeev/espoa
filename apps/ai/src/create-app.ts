import cors from "cors";
import express from "express";
import { healthRouter } from "./routes/health.routes";
import { insightsRouter } from "./routes/insights.routes";

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.use(healthRouter);
app.use(insightsRouter);

export { app };
