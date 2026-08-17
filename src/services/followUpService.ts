import { and, eq, lte } from "drizzle-orm";
import { db } from "../db/db";
import { botConfigs, conversations, customers, followUps, pages } from "../db/schema";
import { ChatService } from "./chatService";
import { decryptToken } from "./tokenService";
import { generateReply } from "./aiService";
import { buildPagePrompt } from "../utils/prompt";
import { deductCredits, getBalance, logUsage } from "./creditService";
import { sendMessage } from "./facebookService";
import { emitPageEvent } from "../utils/events";

// ponytail: plain setInterval loop, runs once per minute. Fine for MVP scale
// (10-15 clients); move to a proper job queue if follow-up volume grows.
export async function processDueFollowUps(): Promise<number> {
  const due = await db
    .select()
    .from(followUps)
    .where(and(eq(followUps.status, "scheduled"), lte(followUps.scheduledAt, new Date())))
    .limit(20);

  let processed = 0;
  for (const fu of due) {
    try {
      await processOne(fu);
      processed++;
    } catch (err) {
      console.error(`follow-up ${fu.id} failed:`, err);
    }
  }
  return processed;
}

async function processOne(fu: typeof followUps.$inferSelect) {
  const [page] = await db.select().from(pages).where(eq(pages.id, fu.pageId)).limit(1);
  if (!page) return;
  const [botConfig] = await db.select().from(botConfigs).where(eq(botConfigs.pageId, page.id)).limit(1);
  if (!botConfig?.enabled) return;

  let conversation = null;
  if (fu.conversationId) {
    [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, fu.conversationId))
      .limit(1);
    if (conversation?.handledBy === "human") return; // owner is handling this one
  }

  const [customer] = await db.select().from(customers).where(eq(customers.id, fu.customerId)).limit(1);
  if (!customer) return;

  const balance = await getBalance(page.userId);
  if (balance.credits <= 0) return;

  const basePrompt = await buildPagePrompt(page.id, botConfig, {
    storeName: page.name,
    customerName: customer.name ?? undefined,
    customerId: customer.id,
  });
  const summarizeRes = conversation ? await ChatService.maybeSummarize(conversation.id) : null;
  if (summarizeRes && (summarizeRes.tokensIn > 0 || summarizeRes.tokensOut > 0)) {
    await logUsage({
      userId: page.userId,
      pageId: page.id,
      conversationId: conversation!.id,
      kind: "summarization",
      tokensIn: summarizeRes.tokensIn,
      tokensOut: summarizeRes.tokensOut,
      creditsDeducted: 0,
    });
  }
  const summary = summarizeRes?.summary ?? null;
  const systemPrompt = `${basePrompt}${summary ? `\n\nConversation summary so far:\n${summary}` : ""}`;
  const history = conversation ? await ChatService.getRecentChatHistory(conversation.id) : [];

  const followUpPrompt = `${systemPrompt}\n\nIt is time for a follow-up. The customer previously expressed interest but deferred the purchase. This is a NEW message you are sending now that the scheduled time has arrived — do NOT repeat or copy your earlier confirmation wording (like "আমি মনে করিয়ে দেব" or "নক দেব"). Write a fresh, natural, professional sales follow-up that references the product they were interested in (from the conversation context above) and gently re-engages them, like a skilled salesperson continuing the conversation. Do not be pushy, generic, or robotic.${fu.reason ? ` (reason: ${fu.reason})` : ""} Reply with just the message, nothing else.`;
  const reply = await generateReply(followUpPrompt, history);
  if (!reply.text.trim()) return;

  // Send first, then deduct: a failed send must not drain credits and retry loops stay free.
  const token = decryptToken(page.encryptedAccessToken, page.tokenIv);
  await sendMessage(token, customer.psid, reply.text.trim());

  await deductCredits(page.userId, 1);
  await db.update(followUps).set({ status: "sent" }).where(eq(followUps.id, fu.id));
  if (conversation) {
    // Prefix the logged message so the AI's conversation context knows this
    // follow-up has already been sent (and must not be re-scheduled).
    await ChatService.logMessage(conversation.id, "model", `[Follow-up sent]: ${reply.text.trim()}`);
    emitPageEvent(page.id, "message", { conversationId: conversation.id });
  }
  await logUsage({
    userId: page.userId,
    pageId: page.id,
    conversationId: fu.conversationId,
    kind: "follow_up",
    tokensIn: reply.tokensIn,
    tokensOut: reply.tokensOut,
    creditsDeducted: 1,
  });
}
