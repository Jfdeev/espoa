import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.send({ status: "ok" });
});

app.listen(process.env.PORT || 8080, () => {
  console.log(`API rodando na porta ${process.env.PORT || 8080}`);
});