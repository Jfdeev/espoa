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
<<<<<<< HEAD
app.use(associadoRouter);
app.use(associacaoRouter);
=======
app.use(authRouter);
>>>>>>> origin/main

export { app };
