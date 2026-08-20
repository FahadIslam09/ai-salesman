import type { NextFunction, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { auth } from "../../config/auth";
import { db } from "../../db/db";
import { users } from "../../db/schema";

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === "string") headers.set(key, value);
    }
    const session = await auth.api.getSession({ headers });
    if (!session || !session.user?.id) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }

    // Fetch user from DB to check role and ban status
    const [userRecord] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (!userRecord) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }

    if (userRecord.isBanned) {
      res.status(403).json({ error: "account_banned", message: "Your account has been suspended by platform administration." });
      return;
    }

    (req as any).session = session;
    (req as any).user = userRecord;
    next();
  } catch {
    res.status(401).json({ error: "unauthorized" });
  }
}

export async function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  await requireAuth(req, res, async () => {
    const user = (req as any).user;
    const superAdminEmails = (process.env.SUPER_ADMIN_EMAILS || "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    const isSuperAdmin =
      user?.role === "super_admin" ||
      (user?.email && superAdminEmails.includes(user.email.toLowerCase()));

    if (!isSuperAdmin) {
      res.status(403).json({ error: "forbidden", message: "Super Admin privileges required." });
      return;
    }

    next();
  });
}

