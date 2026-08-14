import { Router } from "express";
import { desc, eq } from "drizzle-orm";
import { db } from "../../db/db";
import { sales } from "../../db/schema";
import { requireAuth } from "../middleware/auth";
import { assertPageOwnedByUser } from "../middleware/pageAccess";

export const salesRouter = Router();
salesRouter.use(requireAuth);

salesRouter.get("/", async (req, res) => {
  const pageId = req.query.pageId as string;
  if (!pageId || !(await assertPageOwnedByUser(pageId, (req as any).session.user.id))) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  const rows = await db
    .select()
    .from(sales)
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
  res.status(201).json(row);
});
