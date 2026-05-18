import { Router } from "express";
import { postSuggestions } from "../controllers/suggestions.controller";

export const suggestionsRouter = Router();

suggestionsRouter.post("/suggestions", postSuggestions);
