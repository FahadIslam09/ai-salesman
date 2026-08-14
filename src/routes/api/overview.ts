import { Router } from "express";
import { and, count, desc, eq, gte, isNotNull } from "drizzle-orm";
import { db } from "../../db/db";
import { conversations, customers, followUps, sales } from "../../db/schema";
import { requireAuth } from "../middleware/auth";
import { assertPageOwnedByUser } from "../middleware/pageAccess";
import { getBalance } from "../../services/creditService";

export const overviewRouter = Router();
overviewRouter.use(requireAuth);

overviewRouter.get("/", async (req, res) => {
  const pageId = req.query.pageId as string;
  if (!pageId || !(await assertPageOwnedByUser(pageId, (req as any).session.user.id))) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  const userId = (req as any).session.user.id;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [conversationsToday] = await db
    .select({ n: count() })
    .from(conversations)
    .where(and(eq(conversations.pageId, pageId), gte(conversations.lastMessageAt, today)));
  const [newCustomersToday] = await db
    .select({ n: count() })
    .from(customers)
    .where(and(eq(customers.pageId, pageId), gte(customers.firstSeenAt, today)));
  const [followUpsDue] = await db
    .select({ n: count() })
    .from(followUps)
    .where(and(eq(followUps.pageId, pageId), eq(followUps.status, "scheduled")));
  const [salesCount] = await db.select({ n: count() }).from(sales).where(eq(sales.pageId, pageId));
  const attentionRows = await db
    .select({
      id: conversations.id,
      customerId: conversations.customerId,
      status: conversations.status,
      attentionReason: conversations.attentionReason,
      lastMessageAt: conversations.lastMessageAt,
      customerName: customers.name,
    })
    .from(conversations)
    .innerJoin(customers, eq(conversations.customerId, customers.id))
    .where(and(eq(conversations.pageId, pageId), isNotNull(conversations.attentionReason)))
    .orderBy(desc(conversations.lastMessageAt))
    .limit(20);

  const balance = await getBalance(userId);

  res.json({
    credits: balance,
    totalConversations: await countAll(conversations, pageId),
    conversationsToday: conversationsToday.n,
    newCustomersToday: newCustomersToday.n,
    followUpsDue: followUpsDue.n,
    totalSales: salesCount.n,
    attentionRequired: attentionRows,
  });
});

async function countAll(table: any, pageId: string): Promise<number> {
  const [row] = await db.select({ n: count() }).from(table).where(eq(table.pageId, pageId));
  return row.n;
}
