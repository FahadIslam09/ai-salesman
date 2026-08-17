import { Router } from "express";
import { and, count, desc, eq, lte } from "drizzle-orm";
import { db } from "../../db/db";
import { customers, followUps } from "../../db/schema";
import { requireAuth } from "../middleware/auth";
import { assertPageOwnedByUser } from "../middleware/pageAccess";
import { emitPageEvent } from "../../utils/events";

export const followUpsRouter = Router();
followUpsRouter.use(requireAuth);

followUpsRouter.get("/stats", async (req, res) => {
  const pageId = req.query.pageId as string;
  if (!pageId || !(await assertPageOwnedByUser(pageId, (req as any).session.user.id))) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  const [scheduled] = await db
    .select({ n: count() })
    .from(followUps)
    .where(and(eq(followUps.pageId, pageId), eq(followUps.status, "scheduled")));
  const [due] = await db
    .select({ n: count() })
    .from(followUps)
    .where(and(eq(followUps.pageId, pageId), eq(followUps.status, "scheduled"), lte(followUps.scheduledAt, new Date())));
  const [sent] = await db
    .select({ n: count() })
    .from(followUps)
    .where(and(eq(followUps.pageId, pageId), eq(followUps.status, "sent")));
  const [completed] = await db
    .select({ n: count() })
    .from(followUps)
    .where(and(eq(followUps.pageId, pageId), eq(followUps.status, "completed")));
  res.json({ scheduled: scheduled.n, due: due.n, sent: sent.n, completed: completed.n });
});

followUpsRouter.get("/", async (req, res) => {
  const pageId = req.query.pageId as string;
  if (!pageId || !(await assertPageOwnedByUser(pageId, (req as any).session.user.id))) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  const conditions = [eq(followUps.pageId, pageId)];
  if (req.query.status) conditions.push(eq(followUps.status, req.query.status as string));
  const rows = await db
    .select({
      id: followUps.id,
      customerId: followUps.customerId,
      customerName: customers.name,
      reason: followUps.reason,
      context: followUps.context,
      scheduledAt: followUps.scheduledAt,
      status: followUps.status,
    })
    .from(followUps)
    .leftJoin(customers, eq(followUps.customerId, customers.id))
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
  emitPageEvent(pageId, "follow_up", { id: row.id });
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
  emitPageEvent(followUp.pageId, "follow_up", { id: followUp.id });
  res.json(updated);
});
