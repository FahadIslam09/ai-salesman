import { Router } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../../db/db";
import { followUps } from "../../db/schema";
import { requireAuth } from "../middleware/auth";
import { assertPageOwnedByUser } from "../middleware/pageAccess";

export const followUpsRouter = Router();
followUpsRouter.use(requireAuth);

followUpsRouter.get("/", async (req, res) => {
  const pageId = req.query.pageId as string;
  if (!pageId || !(await assertPageOwnedByUser(pageId, (req as any).session.user.id))) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  const conditions = [eq(followUps.pageId, pageId)];
  if (req.query.status) conditions.push(eq(followUps.status, req.query.status as string));
  const rows = await db
    .select()
    .from(followUps)
    .where(and(...conditions))
    .orderBy(desc(followUps.scheduledAt))
    .limit(200);
  res.json(rows);
});

followUpsRouter.post("/", async (req, res) => {
  const { pageId, customerId, conversationId, reason, scheduledAt } = req.body;
  if (!pageId || !customerId || !scheduledAt) {
    res.status(400).json({ error: "pageId, customerId, scheduledAt required" });
    return;
  }
  if (!(await assertPageOwnedByUser(pageId, (req as any).session.user.id))) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  const [row] = await db
    .insert(followUps)
    .values({
      pageId,
      customerId,
      conversationId,
      reason,
      scheduledAt: new Date(scheduledAt),
      status: "scheduled",
    })
    .returning();
  res.status(201).json(row);
});

followUpsRouter.patch("/:id", async (req, res) => {
  const [followUp] = await db.select().from(followUps).where(eq(followUps.id, req.params.id)).limit(1);
  if (!followUp || !(await assertPageOwnedByUser(followUp.pageId, (req as any).session.user.id))) {
    res.status(404).json({ error: "not found" });
    return;
  }
  const set: Record<string, unknown> = {};
  if (req.body.status !== undefined) set.status = req.body.status;
  if (req.body.scheduledAt !== undefined) set.scheduledAt = new Date(req.body.scheduledAt);
  if (req.body.reason !== undefined) set.reason = req.body.reason;
  const [updated] = await db.update(followUps).set(set).where(eq(followUps.id, followUp.id)).returning();
  res.json(updated);
});
