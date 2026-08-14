// ponytail: no X-Hub-Signature verification yet — add before real traffic.
import { Router } from "express";
import { and, eq } from "drizzle-orm";
import { env } from "../config/env";
import { db } from "../db/db";
import { botConfigs, conversations, customers, faqs, knowledgeRequests, pages, products } from "../db/schema";
import { ChatService } from "../services/chatService";
import { decryptToken } from "../services/tokenService";
import { generateReply, generateReplyWithImages } from "../services/aiService";
import { buildSystemPrompt } from "../utils/prompt";
import { downloadAttachment, getUserProfile, replyToComment, sendMessage, sendPrivateReply } from "../services/facebookService";
import { deductCredits, getBalance, logUsage } from "../services/creditService";
import { MessageQueue, type QueueItem } from "../services/queueService";
import { emitPageEvent } from "../utils/events";

export const webhookRouter = Router();
const queue = new MessageQueue(3500);

webhookRouter.get("/", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === env.verifyToken) {
    res.status(200).send(challenge as string);
  } else {
    res.sendStatus(403);
  }
});

webhookRouter.post("/", async (req, res) => {
  res.sendStatus(200); // ack first — Facebook retries if we take too long
  handleWebhook(req.body).catch((err) => console.error("webhook processing error:", err));
});

async function getPageByFbId(fbPageId: string) {
  const [page] = await db.select().from(pages).where(eq(pages.fbPageId, fbPageId)).limit(1);
  return page;
}

async function getBotConfig(pageId: string) {
  const [config] = await db.select().from(botConfigs).where(eq(botConfigs.pageId, pageId)).limit(1);
  return config ?? null;
}

async function buildPromptForPage(pageId: string, botConfig: { enabled: boolean; tone: string | null; language: string | null; businessInfo: string | null; customInstructions: string | null }) {
  const productRows = await db
    .select()
    .from(products)
    .where(and(eq(products.pageId, pageId), eq(products.isActive, true)));
  const faqRows = await db
    .select()
    .from(faqs)
    .where(and(eq(faqs.pageId, pageId), eq(faqs.isActive, true)));
  return buildSystemPrompt({
    botConfig,
    products: productRows,
    faqs: faqRows,
  });
}

const KNOWLEDGE_REQUEST_RE = /\[KNOWLEDGE_REQUEST:\s*([^\]]+)\]/g;

function extractKnowledgeRequests(text: string): string[] {
  const questions: string[] = [];
  for (const match of text.matchAll(KNOWLEDGE_REQUEST_RE)) {
    if (match[1]?.trim()) questions.push(match[1].trim());
  }
  return questions;
}

function stripKnowledgeMarkers(text: string): string {
  return text.replace(KNOWLEDGE_REQUEST_RE, "").trim();
}

async function handleWebhook(body: any) {
  const entries: any[] = body?.entry ?? [];
  for (const entry of entries) {
    await handleMessagingEvents(entry).catch((e) => console.error("messaging error:", e));
    await handleFeedEvents(entry).catch((e) => console.error("feed error:", e));
  }
}

async function handleMessagingEvents(entry: any) {
  const eventsList: any[] = entry.messaging ?? [];
  for (const ev of eventsList) {
    const senderId: string | undefined = ev?.sender?.id;
    const recipientId: string | undefined = ev?.recipient?.id;
    if (!senderId || !recipientId) continue;

    const page = await getPageByFbId(recipientId);
    if (!page) continue;

    // Page's own message. Echoes (our own sends) are skipped so auto-takeover
    // only triggers on a real owner reply.
    if (senderId === page.fbPageId) {
      if (ev?.message?.is_echo) continue;
      const [customer] = await db
        .select()
        .from(customers)
        .where(and(eq(customers.pageId, page.id), eq(customers.psid, ev.recipient.id)))
        .limit(1);
      if (customer) {
        const [conversation] = await db
          .select()
          .from(conversations)
          .where(eq(conversations.customerId, customer.id))
          .limit(1);
        if (conversation) {
          await ChatService.logMessage(conversation.id, "human", ev?.message?.text ?? "");
          if (conversation.handledBy === "bot") {
            await db
              .update(conversations)
              .set({ handledBy: "human" })
              .where(eq(conversations.id, conversation.id));
          }
          emitPageEvent(page.id, "message", { conversationId: conversation.id });
        }
      }
      continue;
    }

    // Customer message
    const text: string | undefined =
      ev?.message?.text ?? ev?.postback?.payload ?? ev?.postback?.title;
    const attachments: QueueItem["attachments"] = (ev?.message?.attachments ?? [])
      .filter((a: any) => a?.type === "image")
      .map((a: any) => ({ url: a?.payload?.url, type: a.type }));
    if (!text && (!attachments || attachments.length === 0)) continue;

    const customer = await ChatService.getOrCreateCustomer(page.id, senderId);
    if (!customer.name) {
      const profile = await getUserProfile(decryptToken(page.encryptedAccessToken, page.tokenIv), senderId);
      if (profile.name) {
        await db
          .update(customers)
          .set({ name: profile.name, profilePicUrl: profile.profilePicUrl ?? null })
          .where(eq(customers.id, customer.id));
      }
    }
    const conversation = await ChatService.getOrCreateConversation(page.id, customer.id);
    await ChatService.logMessage(conversation.id, "user", text ?? "[image]");
    await db
      .update(customers)
      .set({ lastActiveAt: new Date() })
      .where(eq(customers.id, customer.id));
    emitPageEvent(page.id, "message", { conversationId: conversation.id });

    if (conversation.handledBy === "human") continue;

    const botConfig = await getBotConfig(page.id);
    if (!botConfig?.enabled) continue;

    queue.enqueue(
      `${page.id}:${conversation.id}`,
      { text, attachments },
      (items) => processIncomingBatch(page, botConfig, customer, conversation, items)
    );
  }
}

async function processIncomingBatch(page: any, botConfig: any, customer: any, conversation: any, items: QueueItem[]) {
  const balance = await getBalance(page.userId);
  if (balance.credits <= 0) {
    await db
      .update(conversations)
      .set({ attentionReason: "credit_exhausted" })
      .where(eq(conversations.id, conversation.id));
    return;
  }

  const systemPrompt = await buildPromptForPage(page.id, botConfig);
  const history = await ChatService.getRecentChatHistory(conversation.id);
  const text = items.map((i) => i.text).filter(Boolean).join("\n");
  const imageUrls = items.flatMap((i) => i.attachments ?? []);

  let reply;
  if (imageUrls.length > 0) {
    const images: string[] = [];
    for (const att of imageUrls) {
      try {
        images.push((await downloadAttachment(att.url)).toString("base64"));
      } catch {
        // skip undownloadable image, text-only fallback
      }
    }
    reply = await generateReplyWithImages(systemPrompt, images, text || undefined);
  } else {
    reply = await generateReply(systemPrompt, history);
  }

  const knowledgeQuestions = extractKnowledgeRequests(reply.text);
  const cleanText = stripKnowledgeMarkers(reply.text);

  if (knowledgeQuestions.length > 0) {
    await db.insert(knowledgeRequests).values(
      knowledgeQuestions.map((question) => ({
        pageId: page.id,
        conversationId: conversation.id,
        question,
      }))
    );
    await db
      .update(conversations)
      .set({ attentionReason: "knowledge_request" })
      .where(eq(conversations.id, conversation.id));
    emitPageEvent(page.id, "knowledge_request", { conversationId: conversation.id });
  }

  let deducted = false;
  if (cleanText) {
    deducted = await deductCredits(page.userId, 1);
    if (deducted) {
      try {
        const token = decryptToken(page.encryptedAccessToken, page.tokenIv);
        await sendMessage(token, customer.psid, cleanText);
        await ChatService.logMessage(conversation.id, "model", cleanText);
        emitPageEvent(page.id, "message", { conversationId: conversation.id });
      } catch (err) {
        console.error("failed to send AI reply:", err);
        await db
          .update(conversations)
          .set({ attentionReason: "ai_error" })
          .where(eq(conversations.id, conversation.id));
      }
    } else {
      await db
        .update(conversations)
        .set({ attentionReason: "credit_exhausted" })
        .where(eq(conversations.id, conversation.id));
    }
  }

  await logUsage({
    userId: page.userId,
    pageId: page.id,
    conversationId: conversation.id,
    kind: "inbox_reply",
    tokensIn: reply.tokensIn,
    tokensOut: reply.tokensOut,
    creditsDeducted: deducted ? 1 : 0,
  });
}

async function handleFeedEvents(entry: any) {
  for (const change of entry.changes ?? []) {
    const value = change?.value;
    if (change?.field !== "feed" || value?.item !== "comment" || value?.verb !== "add") continue;

    const commentId: string | undefined = value?.comment_id;
    const postId: string | undefined = value?.post_id;
    const message: string | undefined = value?.message;
    if (!commentId || !postId || !message) continue;

    const page = await getPageByFbId(postId.split("_")[0]);
    if (!page) continue;
    const botConfig = await getBotConfig(page.id);
    if (!botConfig?.enabled) continue;
    const balance = await getBalance(page.userId);
    if (balance.credits <= 0) continue;

    const systemPrompt = await buildPromptForPage(page.id, botConfig);
    const commentPrompt = `${systemPrompt}\n\nA customer commented on a Facebook post: "${message}". Decide: if they are asking about a product or price, you must reply to the comment with a short "Check Inbox 📩" style note AND write a detailed private message with product info/price to send to their inbox. Respond ONLY with JSON: {"commentReply": "<text>", "privateMessage": "<text or empty>"}`;

    const reply = await generateReply(commentPrompt, []);
    let commentReply = "";
    let privateMessage = "";
    try {
      const parsed = JSON.parse(reply.text.replace(/```json|```/g, ""));
      commentReply = parsed.commentReply ?? "";
      privateMessage = parsed.privateMessage ?? "";
    } catch {
      commentReply = reply.text;
    }

    const token = decryptToken(page.encryptedAccessToken, page.tokenIv);
    if (commentReply) {
      try {
        await replyToComment(token, commentId, commentReply);
        if (privateMessage) {
          try {
            await sendPrivateReply(token, commentId, privateMessage);
          } catch (err) {
            console.error("private reply failed (public reply already sent):", err);
          }
        }
        await logUsage({
          userId: page.userId,
          pageId: page.id,
          kind: "comment_reply",
          tokensIn: reply.tokensIn,
          tokensOut: reply.tokensOut,
          creditsDeducted: 0,
        });
        await deductCredits(page.userId, 1);
        emitPageEvent(page.id, "comment_reply", { commentId });
      } catch (err) {
        console.error("comment reply failed:", err);
      }
    }
  }
}
