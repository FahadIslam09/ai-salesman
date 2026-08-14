import type { NextFunction, Request, Response } from "express";
import { auth } from "../../config/auth";

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === "string") headers.set(key, value);
    }
    const session = await auth.api.getSession({ headers });
    if (!session) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    (req as any).session = session;
    next();
  } catch {
    res.status(401).json({ error: "unauthorized" });
  }
}
