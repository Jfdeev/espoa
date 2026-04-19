import "dotenv/config";
import cors from "cors";
import express from "express";
import { healthRouter } from "./routes/health.routes";
import { syncRouter } from "./routes/sync.routes";

const app = express();

app.use(cors());
app.use(express.json());

app.use(healthRouter);
app.use(syncRouter);

app.listen(3001, () => {
  console.log("API rodando na porta 3001");
});
