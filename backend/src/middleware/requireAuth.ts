import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../auth/tokens";

export type AuthedRequest = Request & {
  user?: { id: number; email: string };
};

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const token = req.cookies?.access_token as string | undefined;
  if (!token) return res.status(401).json({ error: "UNAUTHORIZED" });

  try {
    const payload = verifyAccessToken(token);
    const id = Number(payload.sub);
    if (!Number.isFinite(id)) return res.status(401).json({ error: "UNAUTHORIZED" });
    req.user = { id, email: payload.email };
    next();
  } catch {
    return res.status(401).json({ error: "UNAUTHORIZED" });
  }
}

