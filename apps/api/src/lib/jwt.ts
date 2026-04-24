import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("JWT_SECRET não definido no .env");

export interface JwtPayload {
  sub: string;
  email: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign({ email: payload.email }, JWT_SECRET!, {
    subject: payload.sub,
    expiresIn: "30d",
  });
}

export function verifyToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, JWT_SECRET!) as jwt.JwtPayload;
  return {
    sub: decoded.sub as string,
    email: decoded["email"] as string,
  };
}
