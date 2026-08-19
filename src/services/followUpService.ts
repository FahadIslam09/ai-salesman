import { and, desc, eq, gt, lte, ne } from "drizzle-orm";
import { db } from "../db/db";
import { botConfigs, conversations, customers, followUps, messages, orders, pages, type FollowUpContext } from "../db/schema";
import { ChatService } from "./chatService";
import { decryptToken } from "./tokenService";
import { generateReply, type HistoryMsg } from "./aiService";
import { buildPagePrompt } from "../utils/prompt";
import { chargeUsage, getBalance } from "./creditService";
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

  // 1. RE-CHECK: If customer placed an order after this follow-up was scheduled, cancel it!
  const recentOrder = await db
    .select()
    .from(orders)
    .where(and(eq(orders.customerId, fu.customerId), ne(orders.status, "rejected")))
    .orderBy(desc(orders.createdAt))
    .limit(1);

  if (recentOrder.length > 0 && new Date(recentOrder[0].createdAt).getTime() >= new Date(fu.createdAt).getTime()) {
    await db
      .update(followUps)
      .set({ status: "cancelled", reason: "Customer already placed an order" })
      .where(eq(followUps.id, fu.id));
    emitPageEvent(page.id, "follow_up", { id: fu.id, status: "cancelled" });
    return;
  }

  // 2. RE-CHECK: Inspect recent messages since follow-up was scheduled
  if (conversation) {
    const recentMsgs = await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.conversationId, conversation.id),
          eq(messages.role, "user"),
          gt(messages.createdAt, fu.createdAt)
        )
      )
      .orderBy(desc(messages.createdAt));

    if (recentMsgs.length > 0) {
      const latestUserMsg = recentMsgs[0];
      const text = latestUserMsg.content.toLowerCase();

      // Check if customer explicitly declined in the meantime
      if (
        text.includes("লাগবে না") ||
        text.includes("না লাগবে না") ||
        text.includes("দরকার নেই") ||
        text.includes("cancel") ||
        text.includes("dont contact") ||
        text.includes("মেসেজ দিয়েন না") ||
        text.includes("not interested")
      ) {
        await db
          .update(followUps)
          .set({ status: "cancelled", reason: "Customer explicitly declined" })
          .where(eq(followUps.id, fu.id));
        emitPageEvent(page.id, "follow_up", { id: fu.id, status: "cancelled" });
        return;
      }

      // If customer is actively chatting right now (sent message in last 3 mins), postpone by 5 mins
      const diffMs = Date.now() - new Date(latestUserMsg.createdAt).getTime();
      if (diffMs < 3 * 60 * 1000) {
        await db
          .update(followUps)
          .set({ scheduledAt: new Date(Date.now() + 5 * 60 * 1000) })
          .where(eq(followUps.id, fu.id));
        return;
      }
    }
  }

  const balance = await getBalance(page.userId);
  if (balance.credits <= 0) return;

  const basePrompt = await buildPagePrompt(page.id, botConfig, {
    storeName: page.name,
    customerName: customer.name ?? undefined,
    customerId: customer.id,
    activeModules: new Set(["pricing", "checkout_and_order"]),
    intent: "follow_up",
  });

  const summarizeRes = conversation ? await ChatService.maybeSummarize(conversation.id) : null;
  if (summarizeRes && (summarizeRes.tokensIn > 0 || summarizeRes.tokensOut > 0)) {
    await chargeUsage({
      userId: page.userId,
      pageId: page.id,
      conversationId: conversation!.id,
      kind: "summarization",
      model: summarizeRes.model,
      tokensIn: summarizeRes.tokensIn,
      tokensOut: summarizeRes.tokensOut,
    });
  }
  const summary = summarizeRes?.summary ?? null;
  const systemPrompt = `${basePrompt}${summary ? `\n\nConversation summary so far:\n${summary}` : ""}`;
  const history = conversation ? await ChatService.getRecentChatHistory(conversation.id) : [];

  // Extract structured follow-up context
  const ctx = (fu.context as FollowUpContext) || {};
  const targetProduct = ctx.relevantProduct || "the product discussed earlier";
  const reason = ctx.followUpReason || fu.reason || "Customer requested callback after thinking";
  const customerIntent = ctx.customerIntent || "Interested in purchasing";
  const decisionState = ctx.customerDecisionState || "Undecided / considering purchase";
  const objection = ctx.objectionsOrConcerns || "None noted";
  const custName = customer.name || "Customer";

  const followUpTaskPrompt = `${systemPrompt}

## ACTIVE SALES TASK: DELIVER SCHEDULED FOLLOW-UP NOW
The customer requested to be contacted now (after a ${ctx.followUpDelayMinutes || 60} minute thinking window).
- Customer Name: ${custName}
- Target Product / Service: ${targetProduct}
- Customer's Intent: ${customerIntent}
- Decision State: ${decisionState}
- Reason Follow-Up Was Scheduled: ${reason}
- Known Objections / Hesitations: ${objection}

CRITICAL RULES FOR WRITING THIS MESSAGE:
1. THIS IS THE REAL FOLLOW-UP. The scheduled delay is OVER. You are initiating conversation with the customer NOW.
2. NEVER say "আমি পরে নক দেব", "১ ঘণ্টা পর knock করব", or "আপনি ১ ঘণ্টা পরে সিদ্ধান্ত নিন". Those were past confirmation messages.
3. Act like a polite, caring, expert salesperson. Warmly greet ${custName}, mention "${targetProduct}", and ask if they have had a chance to decide or if they have any remaining questions or confusion.
4. If they had a price or other objection (${objection}), address it gracefully in accordance with the store's Price Objection & Negotiation policy.
5. Keep it concise, friendly, and natural (2-3 lines max, in conversational Bengali).
6. Output ONLY the exact text message to be sent to the customer on Messenger. Do NOT include Markdown formatting (no bold **, no headers), no em dashes, no ৳ symbol, and NEVER include any [FOLLOW_UP] or [ORDER_CONFIRMED] tags.`;

  // Provide conversation history ending with a system trigger so LLM acts as the assistant responding to the customer
  const historyWithTrigger: HistoryMsg[] = [
    ...history,
    {
      role: "user",
      content: `[SYSTEM TRIGGER: The scheduled follow-up time for "${targetProduct}" has arrived. Please send the follow-up message to the customer now.]`,
    },
  ];

  const reply = await generateReply(followUpTaskPrompt, historyWithTrigger);
  const cleanText = reply.text
    .replace(/\[FOLLOW_UP:\s*[^\]]+\]/gi, "")
    .replace(/\[ORDER_CONFIRMED\]/g, "")
    .replace(/\[SEND_IMAGES?:\s*[^\]]+\]/gi, "")
    .replace(/\[KNOWLEDGE_REQUEST:\s*[^\]]+\]/gi, "")
    .trim();

  if (!cleanText) return;

  // Send first, then deduct: a failed send must not drain credits and retry loops stay free.
  const token = decryptToken(page.encryptedAccessToken, page.tokenIv);
  await sendMessage(token, customer.psid, cleanText);

  await db.update(followUps).set({ status: "sent" }).where(eq(followUps.id, fu.id));
  if (conversation) {
    // Prefix the logged message so the AI's conversation context knows this
    // follow-up has already been sent (and must not be re-scheduled).
    await ChatService.logMessage(conversation.id, "model", `[Follow-up sent]: ${cleanText}`);
    emitPageEvent(page.id, "message", { conversationId: conversation.id });
    emitPageEvent(page.id, "follow_up", { id: fu.id, status: "sent" });
  }
  await chargeUsage({
    userId: page.userId,
    pageId: page.id,
    conversationId: fu.conversationId,
    kind: "follow_up",
    model: reply.model,
    tokensIn: reply.tokensIn,
    tokensOut: reply.tokensOut,
  });
}
