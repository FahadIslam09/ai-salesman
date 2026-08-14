import { db } from "../db/db";
import { creditBalances, usageLogs } from "../db/schema";
import { and, eq, gte, sql } from "drizzle-orm";

export interface Balance {
  credits: number;
  totalPurchased: number;
  totalUsed: number;
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
