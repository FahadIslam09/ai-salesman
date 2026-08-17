import { Router } from "express";
import { and, count, eq, gte } from "drizzle-orm";
import { db } from "../../db/db";
import { conversations, customers, messages, sales, usageLogs } from "../../db/schema";
import { requireAuth } from "../middleware/auth";
import { assertPageOwnedByUser } from "../middleware/pageAccess";
import { startOfDayDhaka } from "../../utils/time";

export const analyticsRouter = Router();
analyticsRouter.use(requireAuth);

function periodStart(period: string): Date {
  const days = period === "week" ? 7 : period === "month" ? 30 : 1;
  return startOfDayDhaka(days - 1);
}

async function requirePage(req: any, res: any): Promise<string | null> {
  const pageId = req.query.pageId as string;
  if (!pageId || !(await assertPageOwnedByUser(pageId, req.session.user.id))) {
    res.status(403).json({ error: "forbidden" });
    return null;
  }
  return pageId;
}

analyticsRouter.get("/customers", async (req, res) => {
  const pageId = await requirePage(req, res);
  if (!pageId) return;
  const from = periodStart((req.query.period as string) ?? "day");
  const [newCustomers] = await db
    .select({ n: count() })
    .from(customers)
    .where(and(eq(customers.pageId, pageId), gte(customers.firstSeenAt, from)));
  const [total] = await db.select({ n: count() }).from(customers).where(eq(customers.pageId, pageId));
  res.json({ newCustomers: newCustomers.n, total: total.n });
});

analyticsRouter.get("/conversations", async (req, res) => {
  const pageId = await requirePage(req, res);
  if (!pageId) return;
  const from = periodStart((req.query.period as string) ?? "day");
  const [total] = await db
    .select({ n: count() })
    .from(conversations)
    .where(and(eq(conversations.pageId, pageId), gte(conversations.lastMessageAt, from)));
  const [aiMessages] = await db
    .select({ n: count() })
    .from(messages)
    .innerJoin(conversations, eq(messages.conversationId, conversations.id))
    .where(and(eq(conversations.pageId, pageId), eq(messages.role, "model"), gte(messages.createdAt, from)));
  res.json({ conversations: total.n, aiReplies: aiMessages.n });
});

analyticsRouter.get("/sales", async (req, res) => {
  const pageId = await requirePage(req, res);
  if (!pageId) return;
  const from = periodStart((req.query.period as string) ?? "day");
  const rows = await db
    .select({ amount: sales.amount, aiAssisted: sales.aiAssisted, createdAt: sales.createdAt })
    .from(sales)
    .where(and(eq(sales.pageId, pageId), gte(sales.createdAt, from)));
  const revenue = rows.reduce((sum, r) => sum + (r.amount ?? 0), 0);
  res.json({ count: rows.length, revenue, aiAssisted: rows.filter((r) => r.aiAssisted).length });
});

analyticsRouter.get("/credits", async (req, res) => {
  const pageId = await requirePage(req, res);
  if (!pageId) return;
  const from = periodStart((req.query.period as string) ?? "day");
  const rows = await db
    .select({ creditsDeducted: usageLogs.creditsDeducted })
    .from(usageLogs)
    .where(and(eq(usageLogs.pageId, pageId), gte(usageLogs.createdAt, from)));
  res.json({
    used: rows.reduce((sum, r) => sum + (r.creditsDeducted ?? 0), 0),
    aiCalls: rows.length,
  });
});
