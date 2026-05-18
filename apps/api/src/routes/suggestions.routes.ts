import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { getSuggestionsHandler } from "../controllers/suggestions.controller";

export const suggestionsRouter = Router();

suggestionsRouter.use(requireAuth);
suggestionsRouter.get("/suggestions", getSuggestionsHandler);
