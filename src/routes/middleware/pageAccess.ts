import type { NextFunction, Request, Response } from "express";
import { db } from "../../db/db";
import { pages } from "../../db/schema";
import { eq } from "drizzle-orm";

export interface PageRow {
  id: string;
  userId: string;
  fbPageId: string;
  name: string;
  encryptedAccessToken: string;
  tokenIv: string;
  isActive: boolean;
  connectedAt: Date;
}

export async function assertPageOwnedByUser(pageId: string, userId: string): Promise<PageRow | null> {
  const [page] = await db.select().from(pages).where(eq(pages.id, pageId)).limit(1);
  if (!page || page.userId !== userId) return null;
  return page;
}

export async function requirePageAccess(req: Request, res: Response, next: NextFunction) {
  const pageId =
    (req.query.pageId as string) || (req.params.pageId as string) || (req.body?.pageId as string);
  if (!pageId) {
    res.status(400).json({ error: "pageId required" });
    return;
  }
  const page = await assertPageOwnedByUser(pageId, (req as any).session.user.id);
  if (!page) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  (req as any).page = page;
  next();
}
