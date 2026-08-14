import { Router } from "express";
import { and, desc, eq, gte } from "drizzle-orm";
import { db } from "../../db/db";
import { payments, usageLogs } from "../../db/schema";
import { requireAuth } from "../middleware/auth";
import { addCredits, getBalance, logUsage, lowCreditLevel } from "../../services/creditService";
import { CREDIT_PACKAGES, getPackage } from "../../config/packages";
import { bkashConfigured, createPayment, executePayment } from "../../services/bkashService";
import { randomUUID } from "node:crypto";

export const creditsRouter = Router();
creditsRouter.use(requireAuth);

creditsRouter.get("/balance", async (req, res) => {
  const userId = (req as any).session.user.id;
  const balance = await getBalance(userId);
  res.json({ ...balance, level: lowCreditLevel(balance) });
});

creditsRouter.get("/usage", async (req, res) => {
  const userId = (req as any).session.user.id;
  const conditions = [eq(usageLogs.userId, userId)];
  if (req.query.from) conditions.push(gte(usageLogs.createdAt, new Date(req.query.from as string)));
  if (req.query.to) conditions.push(eq(usageLogs.createdAt, new Date(req.query.to as string)));
  const rows = await db
    .select()
    .from(usageLogs)
    .where(and(...conditions))
    .orderBy(desc(usageLogs.createdAt))
    .limit(200);
  res.json(rows);
});

creditsRouter.get("/packages", (_req, res) => {
  res.json(CREDIT_PACKAGES);
});

creditsRouter.post("/recharge", async (req, res) => {
  const pkg = getPackage(req.body.packageId);
  if (!pkg) {
    res.status(400).json({ error: "invalid packageId" });
    return;
  }
  const userId = (req as any).session.user.id;
  if (bkashConfigured()) {
    try {
      const invoice = `R-${randomUUID().slice(0, 8).toUpperCase()}`;
      const payment = await createPayment({ amount: pkg.priceBdt, invoice });
      await db.insert(payments).values({
        userId,
        provider: "bkash",
        providerTxnId: payment.paymentID,
        package: pkg.id,
        creditsGranted: pkg.credits,
        amount: pkg.priceBdt,
        status: "pending",
      });
      res.json({ bkashURL: payment.bkashURL, paymentID: payment.paymentID });
    } catch (err: any) {
      res.status(502).json({ error: `bKash error: ${err.message}` });
    }
    return;
  }
  // Manual mode: record a pending payment; owner verifies receipt and calls execute.
  const [row] = await db
    .insert(payments)
    .values({
      userId,
      provider: "manual",
      providerTxnId: `M-${randomUUID()}`,
      package: pkg.id,
      creditsGranted: pkg.credits,
      amount: pkg.priceBdt,
      status: "pending",
    })
    .returning();
  res.status(201).json({ paymentId: row.id, note: "complete payment manually" });
});

creditsRouter.post("/recharge/execute", async (req, res) => {
  const userId = (req as any).session.user.id;
  const paymentID = req.body.paymentID as string;
  if (!paymentID) {
    res.status(400).json({ error: "paymentID required" });
    return;
  }
  const [payment] = await db.select().from(payments).where(eq(payments.providerTxnId, paymentID)).limit(1);
  if (!payment || payment.userId !== userId) {
    res.status(404).json({ error: "payment not found" });
    return;
  }
  if (payment.status === "paid") {
    res.json({ ok: true, alreadyPaid: true });
    return;
  }
  let trxID = payment.providerTxnId;
  if (payment.provider === "bkash") {
    if (!bkashConfigured()) {
      res.status(400).json({ error: "bKash not configured" });
      return;
    }
    try {
      const execution = await executePayment(paymentID);
      trxID = execution.trxID;
    } catch (err: any) {
      res.status(400).json({ error: `bKash verification failed: ${err.message}` });
      return;
    }
  }
  await db
    .update(payments)
    .set({ status: "paid", providerTxnId: trxID, providerPaymentId: payment.provider === "bkash" ? paymentID : null })
    .where(eq(payments.id, payment.id));
  await addCredits(userId, payment.creditsGranted);
  res.json({ ok: true });
});

creditsRouter.get("/history", async (req, res) => {
  const userId = (req as any).session.user.id;
  const rows = await db
    .select()
    .from(payments)
    .where(eq(payments.userId, userId))
    .orderBy(desc(payments.createdAt))
    .limit(100);
  res.json(rows);
});
