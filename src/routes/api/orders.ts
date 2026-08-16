import { Router } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../../db/db";
import { botConfigs, customers, orders, pages } from "../../db/schema";
import { requireAuth } from "../middleware/auth";
import { assertPageOwnedByUser } from "../middleware/pageAccess";
import { decryptToken } from "../../services/tokenService";
import { sendMessage } from "../../services/facebookService";
import { DEFAULT_COD_MESSAGE, DEFAULT_FULL_MESSAGE } from "../../utils/prompt";

export const ordersRouter = Router();
ordersRouter.use(requireAuth);

ordersRouter.get("/", async (req, res) => {
  const pageId = req.query.pageId as string;
  if (!pageId || !(await assertPageOwnedByUser(pageId, (req as any).session.user.id))) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  const conditions = [eq(orders.pageId, pageId)];
  if (req.query.status) conditions.push(eq(orders.status, req.query.status as string));
  const rows = await db
    .select({
      id: orders.id,
      customerName: orders.customerName,
      phone: orders.phone,
      address: orders.address,
      productName: orders.productName,
      sizeVariant: orders.sizeVariant,
      paymentMethod: orders.paymentMethod,
      totalAmount: orders.totalAmount,
      remainingAmount: orders.remainingAmount,
      status: orders.status,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(and(...conditions))
    .orderBy(desc(orders.createdAt))
    .limit(100);
  res.json(rows);
});

ordersRouter.get("/:id", async (req, res) => {
  const [order] = await db.select().from(orders).where(eq(orders.id, req.params.id)).limit(1);
  if (!order || !(await assertPageOwnedByUser(order.pageId, (req as any).session.user.id))) {
    res.status(404).json({ error: "not found" });
    return;
  }
  res.json(order);
});

async function getOwnedOrder(req: any) {
  const [order] = await db.select().from(orders).where(eq(orders.id, req.params.id)).limit(1);
  if (!order) return null;
  const page = await assertPageOwnedByUser(order.pageId, req.session.user.id);
  return page ? order : null;
}

ordersRouter.post("/:id/verify", async (req, res) => {
  const order = await getOwnedOrder(req);
  if (!order) {
    res.status(404).json({ error: "not found" });
    return;
  }
  const [page] = await db.select().from(pages).where(eq(pages.id, order.pageId)).limit(1);
  const [botConfig] = await db.select().from(botConfigs).where(eq(botConfigs.pageId, order.pageId)).limit(1);
  const [customer] = await db.select().from(customers).where(eq(customers.id, order.customerId)).limit(1);

  const template =
    order.paymentMethod === "cod"
      ? (botConfig?.codMessage ?? DEFAULT_COD_MESSAGE)
      : (botConfig?.fullMessage ?? DEFAULT_FULL_MESSAGE);
  const message = template.replace("{{remaining_amount}}", String(order.remainingAmount ?? 0));

  if (customer?.psid && page) {
    try {
      const token = decryptToken(page.encryptedAccessToken, page.tokenIv);
      await sendMessage(token, customer.psid, message);
    } catch (err) {
      console.error("verify message send failed:", err);
    }
  }

  const [updated] = await db
    .update(orders)
    .set({ status: "confirmed", updatedAt: new Date() })
    .where(eq(orders.id, order.id))
    .returning();
  res.json(updated);
});

ordersRouter.post("/:id/reject", async (req, res) => {
  const order = await getOwnedOrder(req);
  if (!order) {
    res.status(404).json({ error: "not found" });
    return;
  }
  const reason = (req.body.reason as string)?.trim();
  if (!reason) {
    res.status(400).json({ error: "reason required" });
    return;
  }
  const [page] = await db.select().from(pages).where(eq(pages.id, order.pageId)).limit(1);
  const [customer] = await db.select().from(customers).where(eq(customers.id, order.customerId)).limit(1);

  if (customer?.psid && page) {
    try {
      const token = decryptToken(page.encryptedAccessToken, page.tokenIv);
      await sendMessage(token, customer.psid, `দুঃখিত, আপনার Order-এর Payment Reject হয়েছে।\nকারণ: ${reason}`);
    } catch (err) {
      console.error("reject message send failed:", err);
    }
  }

  const [updated] = await db
    .update(orders)
    .set({ status: "rejected", rejectionReason: reason, updatedAt: new Date() })
    .where(eq(orders.id, order.id))
    .returning();
  res.json(updated);
});
