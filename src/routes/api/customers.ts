import { Router } from "express";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "../../db/db";
import { customers, conversations, sales } from "../../db/schema";
import { requireAuth } from "../middleware/auth";
import { assertPageOwnedByUser } from "../middleware/pageAccess";

export const customersRouter = Router();
customersRouter.use(requireAuth);

customersRouter.get("/", async (req, res) => {
  const pageId = req.query.pageId as string;
  if (!pageId || !(await assertPageOwnedByUser(pageId, (req as any).session.user.id))) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  const conditions = [eq(customers.pageId, pageId)];
  if (req.query.q) {
    conditions.push(
      or(
        ilike(customers.name, `%${req.query.q}%`),
        ilike(customers.psid, `%${req.query.q}%`)
      )!
    );
  }
  if (req.query.status) conditions.push(eq(customers.status, req.query.status as string));
  const rows = await db
    .select()
    .from(customers)
    .where(and(...conditions))
    .orderBy(desc(customers.lastActiveAt))
    .limit(100);
  res.json(rows);
});

customersRouter.get("/:id", async (req, res) => {
  const [customer] = await db.select().from(customers).where(eq(customers.id, req.params.id)).limit(1);
  if (!customer || !(await assertPageOwnedByUser(customer.pageId, (req as any).session.user.id))) {
    res.status(404).json({ error: "not found" });
    return;
  }
  const convRows = await db
    .select({ id: conversations.id, status: conversations.status, lastMessageAt: conversations.lastMessageAt })
    .from(conversations)
    .where(eq(conversations.customerId, customer.id))
    .orderBy(desc(conversations.lastMessageAt));
  const saleRows = await db.select().from(sales).where(eq(sales.customerId, customer.id));
  res.json({ ...customer, conversations: convRows, sales: saleRows });
});

customersRouter.patch("/:id", async (req, res) => {
  const [customer] = await db.select().from(customers).where(eq(customers.id, req.params.id)).limit(1);
  if (!customer || !(await assertPageOwnedByUser(customer.pageId, (req as any).session.user.id))) {
    res.status(404).json({ error: "not found" });
    return;
  }
  const { tags, notes, status } = req.body;
  const [updated] = await db
    .update(customers)
    .set({
      ...(tags !== undefined ? { tags } : {}),
      ...(notes !== undefined ? { notes } : {}),
      ...(status !== undefined ? { status } : {}),
    })
    .where(eq(customers.id, customer.id))
    .returning();
  res.json(updated);
});
