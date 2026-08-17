import { Router } from "express";
import { desc, eq } from "drizzle-orm";
import { db } from "../../db/db";
import { customers, products, sales } from "../../db/schema";
import { requireAuth } from "../middleware/auth";
import { assertPageOwnedByUser } from "../middleware/pageAccess";
import { emitPageEvent } from "../../utils/events";

export const salesRouter = Router();
salesRouter.use(requireAuth);

salesRouter.get("/", async (req, res) => {
  const pageId = req.query.pageId as string;
  if (!pageId || !(await assertPageOwnedByUser(pageId, (req as any).session.user.id))) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  const rows = await db
    .select({
      id: sales.id,
      quantity: sales.quantity,
      amount: sales.amount,
      source: sales.source,
      aiAssisted: sales.aiAssisted,
      createdAt: sales.createdAt,
      customerName: customers.name,
      productName: products.name,
    })
    .from(sales)
    .leftJoin(customers, eq(sales.customerId, customers.id))
    .leftJoin(products, eq(sales.productId, products.id))
    .where(eq(sales.pageId, pageId))
    .orderBy(desc(sales.createdAt))
    .limit(200);
  res.json(rows);
});

salesRouter.post("/", async (req, res) => {
  const { pageId, customerId, conversationId, productId, quantity, amount, source, aiAssisted } = req.body;
  if (!pageId || !customerId || !amount) {
    res.status(400).json({ error: "pageId, customerId, amount required" });
    return;
  }
  if (!(await assertPageOwnedByUser(pageId, (req as any).session.user.id))) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  const [row] = await db
    .insert(sales)
    .values({
      pageId,
      customerId,
      conversationId,
      productId,
      quantity: quantity ?? 1,
      amount,
      source: source ?? "inbox",
      aiAssisted: aiAssisted ?? true,
    })
    .returning();
  emitPageEvent(pageId, "sale", { id: row.id });
  res.status(201).json(row);
});

salesRouter.delete("/:id", async (req, res) => {
  try {
    const [existing] = await db.select().from(sales).where(eq(sales.id, req.params.id)).limit(1);
    if (!existing || !(await assertPageOwnedByUser(existing.pageId, (req as any).session.user.id))) {
      res.status(404).json({ error: "not found" });
      return;
    }
    await db.delete(sales).where(eq(sales.id, req.params.id));
    emitPageEvent(existing.pageId, "sale", { id: existing.id, deleted: true });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to delete sale" });
  }
});
