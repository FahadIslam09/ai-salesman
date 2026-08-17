import { db } from "../db/db";
import { creditBalances, usageLogs } from "../db/schema";
import { and, eq, gte, sql } from "drizzle-orm";
import { computeBill, microToCredits } from "../config/rates";

export interface Balance {
  credits: number;
  totalPurchased: number;
  totalUsed: number;
}

export interface HumanBalance {
  credits: number;
  totalPurchased: number;
  totalUsed: number;
  microCredits: number;
}

async function ensureBalance(userId: string): Promise<void> {
  await db
    .insert(creditBalances)
    .values({ userId, credits: 0, totalPurchased: 0, totalUsed: 0 })
    .onConflictDoNothing();
}

export async function getBalance(userId: string): Promise<Balance> {
  await ensureBalance(userId);
  const [row] = await db.select().from(creditBalances).where(eq(creditBalances.userId, userId));
  return { credits: row.credits, totalPurchased: row.totalPurchased, totalUsed: row.totalUsed };
}

export async function getHumanBalance(userId: string): Promise<HumanBalance> {
  const b = await getBalance(userId);
  return {
    credits: Math.round(microToCredits(b.credits) * 100) / 100,
    totalPurchased: Math.round(microToCredits(b.totalPurchased) * 100) / 100,
    totalUsed: Math.round(microToCredits(b.totalUsed) * 100) / 100,
    microCredits: b.credits,
  };
}

/**
 * Atomic conditional deduction — safe against concurrent webhook events.
 * Returns false if the balance was insufficient.
 */
export async function deductCredits(userId: string, amount: number): Promise<boolean> {
  await ensureBalance(userId);
  const [row] = await db
    .update(creditBalances)
    .set({
      credits: sql`${creditBalances.credits} - ${amount}`,
      totalUsed: sql`${creditBalances.totalUsed} + ${amount}`,
      updatedAt: new Date(),
    })
    .where(and(eq(creditBalances.userId, userId), gte(creditBalances.credits, amount)))
    .returning();
  return !!row;
}

export async function addCredits(userId: string, amount: number): Promise<void> {
  await ensureBalance(userId);
  await db
    .update(creditBalances)
    .set({
      credits: sql`${creditBalances.credits} + ${amount}`,
      totalPurchased: sql`${creditBalances.totalPurchased} + ${amount}`,
      updatedAt: new Date(),
    })
    .where(eq(creditBalances.userId, userId));
}

export type LowCreditLevel = "zero" | "low_5" | "low_10" | "low_20" | "ok";

export function lowCreditLevel(balance: Balance): LowCreditLevel {
  if (balance.totalPurchased <= 0) return "ok";
  if (balance.credits <= 0) return "zero";
  const pct = (balance.credits / balance.totalPurchased) * 100;
  if (pct <= 5) return "low_5";
  if (pct <= 10) return "low_10";
  if (pct <= 20) return "low_20";
  return "ok";
}

export async function logUsage(record: typeof usageLogs.$inferInsert): Promise<void> {
  await db.insert(usageLogs).values(record);
}

/**
 * Bill an AI call: compute credits from model + tokens, deduct atomically,
 * and record the usage. Returns true when the deduction succeeded (or the call
 * was free). Callers that gate a customer send on balance use the result.
 */
export async function chargeUsage(opts: {
  userId: string;
  pageId: string;
  conversationId?: string | null;
  kind: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
}): Promise<boolean> {
  const bill = computeBill(opts.model, opts.tokensIn, opts.tokensOut);
  const ok = bill.creditsUsed > 0 ? await deductCredits(opts.userId, bill.creditsUsed) : true;
  await logUsage({
    userId: opts.userId,
    pageId: opts.pageId,
    conversationId: opts.conversationId ?? null,
    kind: opts.kind,
    provider: bill.provider,
    model: bill.model,
    tokensIn: opts.tokensIn,
    tokensOut: opts.tokensOut,
    apiCostNanoUsd: bill.apiCostNanoUsd,
    markupMultiplier: bill.markupMultiplier,
    billableCostNanoUsd: bill.billableCostNanoUsd,
    creditsUsed: ok ? bill.creditsUsed : 0,
  });
  return ok;
}
