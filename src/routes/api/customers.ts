import { Router } from "express";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "../../db/db";
import { customers, conversations, sales, pages, orders } from "../../db/schema";
import { requireAuth } from "../middleware/auth";
import { assertPageOwnedByUser } from "../middleware/pageAccess";
import { getUserProfile } from "../../services/facebookService";
import { decryptToken } from "../../services/tokenService";

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

  // Auto-resolve any unknown customer names
  const unknownRows = rows.filter(
    (r) => !r.name || r.name.trim().toLowerCase() === "unknown" || r.name.trim().toLowerCase() === "unknown customer"
  );

  if (unknownRows.length > 0) {
    const [page] = await db.select().from(pages).where(eq(pages.id, pageId)).limit(1);
    const token = page ? decryptToken(page.encryptedAccessToken, page.tokenIv) : null;

    for (const c of unknownRows) {
      // 1. Try order details
      const [order] = await db
        .select()
        .from(orders)
        .where(eq(orders.customerId, c.id))
        .orderBy(desc(orders.createdAt))
        .limit(1);

      if (order?.customerName) {
        c.name = order.customerName;
        await db.update(customers).set({ name: c.name }).where(eq(customers.id, c.id));
        continue;
      }

      // 2. Try Facebook Graph API
      if (token && c.psid) {
        try {
          const profile = await getUserProfile(token, c.psid);
          if (profile.name && profile.name.trim().toLowerCase() !== "unknown") {
            c.name = profile.name.trim();
            c.profilePicUrl = profile.profilePicUrl ?? c.profilePicUrl;
            await db
              .update(customers)
              .set({ name: c.name, profilePicUrl: c.profilePicUrl })
              .where(eq(customers.id, c.id));
          }
        } catch {
          // ignore
        }
      }
    }
  }

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
