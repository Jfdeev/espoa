import "dotenv/config";
import { app } from "./create-app";

const port = process.env.AI_PORT || process.env.PORT || 8090;

app.listen(port, () => {
  console.log(`AI service rodando na porta ${port}`);
});
