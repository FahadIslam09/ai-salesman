// ponytail: signature verification active only when APP_SECRET is set (dev-friendly).
import { createHmac } from "node:crypto";
import { Router } from "express";
import { and, eq } from "drizzle-orm";
import { env } from "../config/env";
import { db } from "../db/db";
import { botConfigs, conversations, customers, followUps, knowledgeRequests, pages } from "../db/schema";
import { ChatService } from "../services/chatService";
import { decryptToken } from "../services/tokenService";
import { generateReply, generateReplyWithImages } from "../services/aiService";
import { buildPagePrompt, getActiveProducts } from "../utils/prompt";
import { detectAttention } from "../utils/flags";
import { downloadAttachment, getPost, getUserProfile, replyToComment, sendImage, sendMessage, sendPrivateReply } from "../services/facebookService";
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
  if (env.appSecret) {
    const signature = req.headers["x-hub-signature-256"];
    const expected = signature
      ? createHmac("sha256", env.appSecret).update((req as any).rawBody).digest("hex")
      : null;
    if (!signature || typeof signature !== "string" || signature !== `sha256=${expected}`) {
      res.sendStatus(403);
      return;
    }
  }
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

const SEND_IMAGES_RE = /\[SEND_IMAGES:\s*([^\]]+)\]/g;

function extractImageRequests(text: string): number[] {
  const nums: number[] = [];
  for (const match of text.matchAll(SEND_IMAGES_RE)) {
    for (const part of match[1].split(/[,\s]+/)) {
      const idx = parseInt(part, 10);
      if (!Number.isNaN(idx)) nums.push(idx);
    }
  }
  return nums;
}

function stripImageMarkers(text: string): string {
  return text.replace(SEND_IMAGES_RE, "").trim();
}

async function handleWebhook(body: any) {
  const entries: any[] = body?.entry ?? [];
  for (const entry of entries) {
    console.log(
      "[webhook] entry:",
      JSON.stringify(
        entry.changes?.map((c: any) => ({
          field: c?.field,
          item: c?.value?.item,
          verb: c?.value?.verb,
          postId: c?.value?.post_id,
          commentId: c?.value?.comment_id,
          messaging: entry.messaging ? entry.messaging.length : 0,
        }))
      )
    );
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
    const logText = attachments?.length
      ? text
        ? `[Customer sent an Image]: ${text}`
        : "[Customer sent an Image]"
      : text ?? "";
    await ChatService.logMessage(conversation.id, "user", logText);
    await db
      .update(customers)
      .set({ lastActiveAt: new Date() })
      .where(eq(customers.id, customer.id));
    await db
      .update(followUps)
      .set({ status: "replied" })
      .where(and(eq(followUps.conversationId, conversation.id), eq(followUps.status, "sent")));
    emitPageEvent(page.id, "message", { conversationId: conversation.id });

    if (conversation.handledBy === "human") continue;

    const flag = text ? detectAttention(text) : null;
    if (flag) {
      await db
        .update(conversations)
        .set({ attentionReason: flag })
        .where(eq(conversations.id, conversation.id));
      emitPageEvent(page.id, "attention", { conversationId: conversation.id, reason: flag });
    }

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

  const summary = await ChatService.maybeSummarize(conversation.id);
  const basePrompt = await buildPagePrompt(page.id, botConfig, {
    storeName: page.name,
    customerName: customer.name ?? undefined,
  });
  const systemPrompt = summary ? `${basePrompt}\n\nConversation summary so far:\n${summary}` : basePrompt;
  const history = await ChatService.getRecentChatHistory(conversation.id);
  const text = items.map((i) => i.text).filter(Boolean).join("\n");
  const imageUrls = items.flatMap((i) => i.attachments ?? []);

  let reply;
  if (imageUrls.length > 0) {
    const images: { base64: string; mime: string }[] = [];
    for (const att of imageUrls) {
      try {
        const dl = await downloadAttachment(att.url);
        images.push({ base64: dl.data.toString("base64"), mime: dl.contentType });
      } catch {
        // skip undownloadable image
      }
    }
    if (images.length > 0) {
      reply = await generateReplyWithImages(systemPrompt, images, text || undefined, history);
    } else {
      reply = {
        text: "দুঃখিত, আমি ছবিটি ঠিকমতো দেখতে পাচ্ছি না 😔 আপনি কি আবার পাঠাবেন?",
        tokensIn: 0,
        tokensOut: 0,
      };
    }
  } else {
    reply = await generateReply(systemPrompt, history);
  }

  const knowledgeQuestions = extractKnowledgeRequests(reply.text);
  const imageRequests = extractImageRequests(reply.text);
  const cleanText = stripImageMarkers(stripKnowledgeMarkers(reply.text));

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
  if (cleanText || imageRequests.length > 0) {
    deducted = await deductCredits(page.userId, 1);
    if (deducted) {
      try {
        const token = decryptToken(page.encryptedAccessToken, page.tokenIv);
        if (cleanText) {
          await sendMessage(token, customer.psid, cleanText);
          await ChatService.logMessage(conversation.id, "model", cleanText);
        }
        if (imageRequests.length > 0) {
          const productRows = await getActiveProducts(page.id);
          for (const n of imageRequests) {
            const product = productRows[n - 1];
            if (!product) continue;
            const urls = product.images?.length ? product.images : [product.imageUrl];
            for (const url of urls) {
              await sendImage(token, customer.psid, url);
              await ChatService.logMessage(conversation.id, "model", `[Image sent: ${url}]`);
            }
          }
        }
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
    console.log("[feed] change:", JSON.stringify({ field: change?.field, item: value?.item, verb: value?.verb, postId: value?.post_id, commentId: value?.comment_id }));
    if (change?.field !== "feed" || value?.item !== "comment" || value?.verb !== "add") continue;

    const commentId: string | undefined = value?.comment_id;
    const postId: string | undefined = value?.post_id;
    const message: string | undefined = value?.message;
    const commenterId: string | undefined = value?.from?.id;
    if (!commentId || !postId || !message) continue;

    const page = await getPageByFbId(postId.split("_")[0]);
    if (!page) {
      console.log("[feed] no page found for postId:", postId);
      continue;
    }

    // Ignore comments written by the Page itself to prevent infinite loops
    if (value?.from?.id === page.fbPageId) {
      console.log("[feed] ignoring page's own comment:", commentId);
      continue;
    }

    const botConfig = await getBotConfig(page.id);
    if (!botConfig?.enabled) continue;
    const balance = await getBalance(page.userId);
    if (balance.credits <= 0) continue;

    const token = decryptToken(page.encryptedAccessToken, page.tokenIv);

    // Pull the post's image + caption so the AI can identify the product even
    // when the customer's comment is just "Price?".
    let caption = "";
    let postImage: { base64: string; mime: string } | null = null;
    try {
      const post = await getPost(token, postId);
      caption = post.message ?? "";
      if (post.fullPicture) {
        const dl = await downloadAttachment(post.fullPicture);
        postImage = { base64: dl.data.toString("base64"), mime: dl.contentType };
      }
    } catch (err) {
      console.error("failed to fetch post context:", err);
    }
    console.log("[feed] post context:", JSON.stringify({ caption, hasImage: !!postImage, commenterId }));

    const systemPrompt = await buildPagePrompt(page.id, botConfig, { storeName: page.name });

    // Step 1: identify the product and write the private message (or NONE).
    const privatePrompt = `${systemPrompt}

## PRIVATE REPLY TASK
A customer commented on one of your Facebook posts: "${message}"
${caption ? `Post caption: "${caption}"` : "The post has no caption."} ${postImage ? "Analyze the post image to identify which catalog product it shows." : ""}

- If the comment is a price, order, or product-info question: identify the product from the post and write the private message to send to their inbox. Include the exact product name and price from the catalog, one key benefit, variants if any, delivery info, and a call to action to confirm the order. Output ONLY the message text — no intro, no quotes.
- If the comment is general or irrelevant (a non-product question, greeting, spam, emoji, off-topic): output ONLY the word NONE.`;

    const privateReply = postImage
      ? await generateReplyWithImages(privatePrompt, [postImage], message, [])
      : await generateReply(privatePrompt, [{ role: "user", content: message }]);

    const privateMessage = /^NONE\.?$/i.test(privateReply.text.trim()) ? "" : privateReply.text.trim();
    let tokensIn = privateReply.tokensIn;
    let tokensOut = privateReply.tokensOut;

    // Step 2: public comment reply. Deterministic for price questions, AI-written otherwise.
    let commentReply = "";
    if (privateMessage) {
      commentReply = "Inbox চেক করুন 📩";
    } else {
      const publicPrompt = `${systemPrompt}\n\nA customer commented on your Facebook post: "${message}".${caption ? ` Post caption: "${caption}".` : ""} Write a short, friendly public reply (1-2 lines) to this comment. If it's spam or just an emoji, a brief "ধন্যবাদ! 😊" acknowledgment is fine. Output ONLY the reply text, nothing else.`;
      const publicReply = postImage
        ? await generateReplyWithImages(publicPrompt, [postImage], message, [])
        : await generateReply(publicPrompt, [{ role: "user", content: message }]);
      commentReply = publicReply.text.trim();
      tokensIn += publicReply.tokensIn;
      tokensOut += publicReply.tokensOut;
    }

    console.log("[feed] AI reply:", JSON.stringify({ privateMessage, commentReply }));

    if (commentReply) {
      try {
        // Send private message FIRST so price is in inbox before "check inbox" comment appears
        if (privateMessage) {
          try {
            await sendPrivateReply(token, commentId, privateMessage);
          } catch (err) {
            console.error("private reply (comment_id) failed, falling back to PSID:", err);
            if (commenterId) {
              await sendMessage(token, commenterId, privateMessage);
            }
          }
        } else {
          console.log("[feed] privateMessage empty — nothing sent to inbox");
        }
        await replyToComment(token, commentId, commentReply);
        await logUsage({
          userId: page.userId,
          pageId: page.id,
          kind: "comment_reply",
          tokensIn,
          tokensOut,
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
