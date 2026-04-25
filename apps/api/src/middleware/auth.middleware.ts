import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "../lib/jwt";

export interface AuthenticatedRequest extends Request {
  userId?: string;
  email?: string;
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Token não fornecido" });
    return;
  }

  const token = authHeader.split("Bearer ")[1];
  try {
    const payload = verifyToken(token);
    req.userId = payload.sub;
    req.email = payload.email;
    next();
  } catch {
    res.status(401).json({ error: "Token inválido ou expirado" });
  }
}
