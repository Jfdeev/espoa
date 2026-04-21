import type { Request, Response, NextFunction } from "express";
import { firebaseAuth } from "../lib/firebase-admin";

export interface AuthenticatedRequest extends Request {
  uid?: string;
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
    const decoded = await firebaseAuth.verifyIdToken(token);
    req.uid = decoded.uid;
    req.email = decoded.email;
    next();
  } catch {
    res.status(401).json({ error: "Token inválido ou expirado" });
  }
}
