import "dotenv/config";
import { app } from "./create-app";

app.listen(process.env.PORT || 8080, () => {
  console.log(`API rodando na porta ${process.env.PORT || 8080}`);
});
