import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.send({ status: "ok" });
});

app.listen(3001, () => {
  console.log("API rodando na porta 3001");
});