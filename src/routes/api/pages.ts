import { Router } from "express";
import { desc, eq } from "drizzle-orm";
import { db } from "../../db/db";
import { pages } from "../../db/schema";
import { requireAuth } from "../middleware/auth";
import { encryptToken } from "../../services/tokenService";

export const pagesRouter = Router();
pagesRouter.use(requireAuth);

pagesRouter.get("/", async (req, res) => {
  const userId = (req as any).session.user.id;
  const rows = await db
    .select({
      id: pages.id,
      fbPageId: pages.fbPageId,
      name: pages.name,
      isActive: pages.isActive,
      connectedAt: pages.connectedAt,
    })
    .from(pages)
    .where(eq(pages.userId, userId))
    .orderBy(desc(pages.connectedAt));
  res.json(rows);
});

pagesRouter.post("/", async (req, res) => {
  const { fbPageId, name, accessToken } = req.body;
  if (!fbPageId || !name || !accessToken) {
    res.status(400).json({ error: "fbPageId, name, accessToken required" });
    return;
  }
  const userId = (req as any).session.user.id;

  // Reject if this Facebook page is already connected to another account.
  const [existing] = await db.select().from(pages).where(eq(pages.fbPageId, fbPageId)).limit(1);
  if (existing && existing.userId !== userId) {
    res.status(403).json({ error: "This Facebook page is already connected to another account." });
    return;
  }

  const { encrypted, iv } = encryptToken(accessToken);
  const [row] = await db
    .insert(pages)
    .values({
      userId,
      fbPageId,
      name,
      encryptedAccessToken: encrypted,
      tokenIv: iv,
      isActive: true,
    })
    .onConflictDoUpdate({
      target: pages.fbPageId,
      set: { encryptedAccessToken: encrypted, tokenIv: iv, name, isActive: true },
    })
    .returning({ id: pages.id, fbPageId: pages.fbPageId, name: pages.name, isActive: pages.isActive });
  res.status(201).json(row);
});
