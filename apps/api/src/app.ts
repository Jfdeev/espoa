import "dotenv/config";
import cors from "cors";
import express from "express";
import { healthRouter } from "./routes/health.routes";
import { syncRouter } from "./routes/sync.routes";
import { authRouter } from "./routes/auth.routes";

const app = express();

app.use(cors());
app.use(express.json());

app.use(healthRouter);
app.use(syncRouter);
app.use(authRouter);

app.listen(process.env.PORT || 8080, () => {
  console.log(`API rodando na porta ${process.env.PORT || 8080}`);
});
