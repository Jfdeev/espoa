import cors from "cors";
import express from "express";
import { healthRouter } from "./routes/health.routes";
import { syncRouter } from "./routes/sync.routes";
import { authRouter } from "./routes/auth.routes";
import { associadoRouter } from "./routes/associado.routes";
import { associacaoRouter } from "./routes/associacao.routes";
import { dashboardRouter } from "./routes/dashboard.routes";
import { mensalidadeRouter } from "./routes/mensalidade.routes";

const app = express();

app.use(cors());
app.use(express.json());

app.use(healthRouter);
app.use(syncRouter);
app.use(authRouter);
app.use(associadoRouter);
app.use(associacaoRouter);
app.use(dashboardRouter);
app.use(mensalidadeRouter);

export { app };
