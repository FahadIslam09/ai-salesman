// ponytail: signature verification active only when APP_SECRET is set (dev-friendly).
import { createHmac } from "node:crypto";
import { Router } from "express";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import { env } from "../config/env";
import { db } from "../db/db";
import { botConfigs, conversations, customers, followUps, type FollowUpContext, knowledgeRequests, messages, orders, pages } from "../db/schema";
import { ChatService } from "../services/chatService";
import { decryptToken } from "../services/tokenService";
import { generateReply, generateReplyWithImages, transcribeAudio } from "../services/aiService";
import { buildPagePrompt, getActiveProducts } from "../utils/prompt";
import { detectAttention } from "../utils/flags";
import { downloadAttachment, getPost, getUserProfile, replyToComment, sendImage, sendMessage, sendPrivateReply } from "../services/facebookService";
import { chargeUsage, getBalance } from "../services/creditService";
import { MessageQueue, type QueueItem } from "../services/queueService";
import { emitPageEvent } from "../utils/events";
import { extractNameFromGreeting } from "../utils/nameExtractor";
import { classifyCustomerIntent, CLASSIFIER_MODEL } from "../services/aiClassifierService";

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

interface ImageRequest {
  productRef: string;
  color?: string;
}

const SEND_IMAGES_RE = /\[SEND_IMAGES:\s*([^\]]+)\]/gi;

function extractImageRequests(text: string): ImageRequest[] {
  const requests: ImageRequest[] = [];
  for (const match of text.matchAll(SEND_IMAGES_RE)) {
    const raw = match[1].trim();
    if (raw.includes("|")) {
      const parts = raw.split("|").map((p) => p.trim());
      const ref = parts[0];
      let color: string | undefined;
      for (const part of parts.slice(1)) {
        const colorMatch = part.match(/^color:\s*(.+)$/i);
        if (colorMatch) {
          color = colorMatch[1].trim();
        }
      }
      if (ref) {
        requests.push({ productRef: ref, color });
      }
    } else {
      for (const part of raw.split(/,\s*/)) {
        const trimmed = part.trim();
        if (trimmed) {
          requests.push({ productRef: trimmed });
        }
      }
    }
  }
  return requests;
}

function stripImageMarkers(text: string): string {
  return text.replace(SEND_IMAGES_RE, "").trim();
}

const ORDER_CONFIRMED_RE = /\[ORDER_CONFIRMED\]/g;

function stripOrderMarker(text: string): string {
  return text.replace(ORDER_CONFIRMED_RE, "").trim();
}

const FOLLOW_UP_STRUCTURED_RE = /\[FOLLOW_UP:\s*([^\]]+)\]/i;

interface ExtractedFollowUp {
  minutes: number;
  reason?: string;
  context: FollowUpContext;
}

function extractFollowUpData(replyText: string, latestCustomerText?: string): ExtractedFollowUp | null {
  const m = FOLLOW_UP_STRUCTURED_RE.exec(replyText);
  if (!m) return null;
  const raw = m[1].trim();

  let minutes: number | null = null;
  let reason: string | undefined;
  let product: string | undefined;
  let intent: string | undefined;
  let objection: string | undefined;

  // Case 1: JSON format
  if (raw.startsWith("{") && raw.endsWith("}")) {
    try {
      const parsed = JSON.parse(raw);
      minutes = Number(parsed.minutes ?? parsed.delay);
      reason = parsed.reason;
      product = parsed.product;
      intent = parsed.intent;
      objection = parsed.objection;
    } catch {
      // fallback
    }
  }

  // Case 2: Key-value / Pipe format: "60 | reason: ... | product: ..."
  if (minutes == null && raw.includes("|")) {
    const parts = raw.split("|").map((p) => p.trim());
    const firstPartNum = parseInt(parts[0], 10);
    if (Number.isFinite(firstPartNum)) {
      minutes = firstPartNum;
    }
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];
      const colonIdx = part.indexOf(":");
      if (colonIdx !== -1) {
        const key = part.slice(0, colonIdx).trim().toLowerCase();
        const val = part.slice(colonIdx + 1).trim();
        if (key === "reason") reason = val;
        else if (key === "product") product = val;
        else if (key === "intent") intent = val;
        else if (key === "objection") objection = val;
      }
    }
  }

  // Case 3: Simple numeric: "60"
  if (minutes == null) {
    const num = parseInt(raw, 10);
    if (Number.isFinite(num)) {
      minutes = num;
    }
  }

  // Case 4: ISO timestamp or Date string
  if (minutes == null) {
    const parsedDate = new Date(raw);
    if (!isNaN(parsedDate.getTime())) {
      const diffMinutes = Math.round((parsedDate.getTime() - Date.now()) / (60 * 1000));
      if (diffMinutes > 0) {
        minutes = diffMinutes;
      }
    }
  }

  // Case 5: Natural fallback from customer text (e.g. "1 hour", "1 ghonta", "30 min", "2 hours")
  if ((minutes == null || minutes <= 0) && latestCustomerText) {
    const lower = latestCustomerText.toLowerCase();
    const hrMatch = /(\d+)\s*(?:ghonta|hour|hours|hr|hrs|ঘণ্টা|ঘন্টা)/i.exec(lower);
    if (hrMatch) {
      minutes = parseInt(hrMatch[1], 10) * 60;
    } else {
      const minMatch = /(\d+)\s*(?:min|mins|minute|minutes|মিনিট)/i.exec(lower);
      if (minMatch) {
        minutes = parseInt(minMatch[1], 10);
      }
    }
  }

  if (minutes == null || minutes <= 0 || minutes > 60 * 24 * 60) return null;

  // Infer objection if customer mentioned price in their latest message
  const lowerCust = (latestCustomerText || "").toLowerCase();
  if (!objection || objection === "none") {
    if (
      lowerCust.includes("দাম") ||
      lowerCust.includes("price") ||
      lowerCust.includes("বেশি") ||
      lowerCust.includes("expensive") ||
      lowerCust.includes("discount") ||
      lowerCust.includes("ছাড়") ||
      lowerCust.includes("কম")
    ) {
      objection = "Price objection / customer asked for discount";
    }
  }

  const followUpReason =
    reason ||
    (lowerCust.includes("চিন্তা") || lowerCust.includes("think")
      ? "Customer considering purchase"
      : "Customer requested later contact");
  const customerIntent = intent || "Interested in purchasing, requested follow-up";
  const customerDecisionState = "Interested but undecided";

  return {
    minutes,
    reason: followUpReason,
    context: {
      followUpDelayMinutes: minutes,
      followUpReason,
      customerIntent,
      customerDecisionState,
      relevantProduct: product && product.toLowerCase() !== "none" ? product : undefined,
      customerLatestMessage: latestCustomerText || undefined,
      objectionsOrConcerns: objection && objection.toLowerCase() !== "none" ? objection : undefined,
    },
  };
}

function stripFollowUpMarker(text: string): string {
  return text.replace(/\[FOLLOW_UP:\s*[^\]]+\]/gi, "").trim();
}

function extractJson(text: string): string {
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : text;
}

async function findLatestScreenshot(conversationId: string): Promise<string | null> {
  const [row] = await db
    .select({ imageUrl: messages.imageUrl })
    .from(messages)
    .where(and(eq(messages.conversationId, conversationId), isNotNull(messages.imageUrl)))
    .orderBy(desc(messages.createdAt))
    .limit(1);
  return row?.imageUrl ?? null;
}

async function extractOrderDetails(
  conversationId: string
): Promise<{ details: Record<string, any>; tokensIn: number; tokensOut: number; model: string } | null> {
  const history = await ChatService.getRecentChatHistory(conversationId, 30);
  const transcript = history
    .map((m) => `${m.role === "user" ? "Customer" : "Assistant"}: ${m.content}`)
    .join("\n");
  const res = await generateReply(
    `Extract the customer's order details from this conversation. Output ONLY a JSON object (no markdown, no other text) with exactly these keys: customerName, phone, address, productName, sizeVariant, paymentMethod ("cod" or "full"), totalAmount (number), deliveryCharge (number), remainingAmount (number), paymentNumber. Use null for any value you cannot determine. Output ONLY the JSON.`,
    [{ role: "user", content: transcript }]
  );
  try {
    const details = JSON.parse(extractJson(res.text));
    return { details, tokensIn: res.tokensIn, tokensOut: res.tokensOut, model: res.model };
  } catch {
    return null;
  }
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

    // Page's own message (including Facebook automated greeting auto-reply)
    if (senderId === page.fbPageId) {
      const recipientPsid = ev?.recipient?.id;
      const messageText = ev?.message?.text;

      // Extract customer name from automated greeting if present
      if (recipientPsid && messageText) {
        const extractedName = extractNameFromGreeting(messageText);
        if (extractedName) {
          const customer = await ChatService.getOrCreateCustomer(page.id, recipientPsid);
          if (!customer.name || customer.name.toLowerCase() === "unknown" || customer.name.toLowerCase() === "unknown customer") {
            await db
              .update(customers)
              .set({ name: extractedName })
              .where(eq(customers.id, customer.id));
            customer.name = extractedName;
            console.log(`[webhook] Extracted customer name "${extractedName}" for PSID ${recipientPsid} from greeting auto-reply.`);
          }
        }
      }

      // Echoes: log to conversation so AI and dashboard know message history,
      // but skip human takeover logic.
      if (ev?.message?.is_echo) {
        if (recipientPsid && messageText) {
          const [customer] = await db
            .select()
            .from(customers)
            .where(and(eq(customers.pageId, page.id), eq(customers.psid, recipientPsid)))
            .limit(1);
          if (customer) {
            const [conversation] = await db
              .select()
              .from(conversations)
              .where(eq(conversations.customerId, customer.id))
              .limit(1);
            if (conversation) {
              await ChatService.logMessage(conversation.id, "model", messageText);
              emitPageEvent(page.id, "message", { conversationId: conversation.id });
            }
          }
        }
        continue;
      }

      // Real owner manual reply
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
    const audioAttachments = (ev?.message?.attachments ?? []).filter((a: any) => a?.type === "audio");

    let voiceText = "";
    let voiceTokensIn = 0;
    let voiceTokensOut = 0;
    let voiceModel = "unknown";
    if (audioAttachments.length > 0) {
      for (const a of audioAttachments) {
        const url = a?.payload?.url;
        if (!url) continue;
        try {
          const dl = await downloadAttachment(url);
          console.log("[voice] audio downloaded:", dl.contentType, dl.data.length, "bytes");
          const t = await transcribeAudio(dl.data, dl.contentType);
          console.log("[voice] transcript:", JSON.stringify(t.text));
          if (t.text) voiceText += t.text + " ";
          else console.error("[voice] empty transcript");
          voiceTokensIn += t.tokensIn;
          voiceTokensOut += t.tokensOut;
          voiceModel = t.model;
        } catch (err: any) {
          console.error("[voice] failed:", err?.response?.data ?? err?.message ?? err);
        }
      }
    }
    const combinedText = [text, voiceText].filter(Boolean).join("\n").trim();
    if (!combinedText && (!attachments || attachments.length === 0)) continue;

    const customer = await ChatService.getOrCreateCustomer(page.id, senderId);
    const isUnknownName =
      !customer.name ||
      customer.name.trim().toLowerCase() === "unknown" ||
      customer.name.trim().toLowerCase() === "unknown customer";

    if (isUnknownName) {
      // 1. Fetch real Facebook profile from Graph API
      try {
        const token = decryptToken(page.encryptedAccessToken, page.tokenIv);
        const profile = await getUserProfile(token, senderId);
        if (profile.name && profile.name.trim().toLowerCase() !== "unknown") {
          await db
            .update(customers)
            .set({ name: profile.name.trim(), profilePicUrl: profile.profilePicUrl ?? null })
            .where(eq(customers.id, customer.id));
          customer.name = profile.name.trim();
          console.log(`[Customer Profile] Synced Facebook name for PSID ${senderId}: "${customer.name}"`);
        }
      } catch (err: any) {
        console.error(`[Customer Profile] Error fetching user profile:`, err?.message);
      }

      // 2. Try extracting from text if customer introduced themselves (e.g., "আমি ফাহাদ")
      if (!customer.name || customer.name.trim().toLowerCase() === "unknown" || customer.name.trim().toLowerCase() === "unknown customer") {
        if (combinedText) {
          const extractedFromText = extractNameFromGreeting(combinedText);
          if (extractedFromText) {
            await db
              .update(customers)
              .set({ name: extractedFromText })
              .where(eq(customers.id, customer.id));
            customer.name = extractedFromText;
            console.log(`[Customer Profile] Extracted greeting name for PSID ${senderId}: "${customer.name}"`);
          }
        }
      }
    }
    const conversation = await ChatService.getOrCreateConversation(page.id, customer.id);
    if (voiceTokensIn > 0 || voiceTokensOut > 0) {
      await chargeUsage({
        userId: page.userId,
        pageId: page.id,
        conversationId: conversation.id,
        kind: "voice_transcription",
        model: voiceModel,
        tokensIn: voiceTokensIn,
        tokensOut: voiceTokensOut,
      });
    }
    const logText = attachments?.length
      ? combinedText
        ? `[Customer sent an Image]: ${combinedText}`
        : "[Customer sent an Image]"
      : combinedText;
    await ChatService.logMessage(conversation.id, "user", logText, attachments?.[0]?.url ?? null);
    await db
      .update(customers)
      .set({ lastActiveAt: new Date() })
      .where(eq(customers.id, customer.id));
    await db
      .update(followUps)
      .set({ status: "replied" })
      .where(and(eq(followUps.conversationId, conversation.id), eq(followUps.status, "sent")));

    const lowerIncoming = (combinedText || "").toLowerCase();
    if (
      lowerIncoming.includes("লাগবে না") ||
      lowerIncoming.includes("না লাগবে না") ||
      lowerIncoming.includes("দরকার নেই") ||
      lowerIncoming.includes("cancel") ||
      lowerIncoming.includes("dont contact") ||
      lowerIncoming.includes("মেসেজ দিয়েন না")
    ) {
      await db
        .update(followUps)
        .set({ status: "cancelled", reason: "Customer explicitly declined" })
        .where(and(eq(followUps.conversationId, conversation.id), eq(followUps.status, "scheduled")));
    }

    emitPageEvent(page.id, "message", { conversationId: conversation.id });

    if (conversation.handledBy === "human") continue;

    const flag = combinedText ? detectAttention(combinedText) : null;
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
      { text: combinedText, attachments },
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

  const summarizeRes = await ChatService.maybeSummarize(conversation.id);
  if (summarizeRes && (summarizeRes.tokensIn > 0 || summarizeRes.tokensOut > 0)) {
    await chargeUsage({
      userId: page.userId,
      pageId: page.id,
      conversationId: conversation.id,
      kind: "summarization",
      model: summarizeRes.model,
      tokensIn: summarizeRes.tokensIn,
      tokensOut: summarizeRes.tokensOut,
    });
  }
  const summary = summarizeRes?.summary ?? null;
  const history = await ChatService.getRecentChatHistory(conversation.id);
  const text = items.map((i) => i.text).filter(Boolean).join("\n");
  const imageUrls = items.flatMap((i) => i.attachments ?? []);

  // Tier 1: Fast DeepSeek Classifier identifies intent and isolates target product(s)
  const activeProducts = await getActiveProducts(page.id);
  const classification = await classifyCustomerIntent(
    text,
    imageUrls.length > 0,
    history,
    activeProducts.map((p) => ({ name: p.name, price: p.price }))
  );

  if (classification.tokensIn > 0 || classification.tokensOut > 0) {
    await chargeUsage({
      userId: page.userId,
      pageId: page.id,
      conversationId: conversation.id,
      kind: "intent_classification",
      model: CLASSIFIER_MODEL,
      tokensIn: classification.tokensIn,
      tokensOut: classification.tokensOut,
    });
  }

  const basePrompt = await buildPagePrompt(page.id, botConfig, {
    storeName: page.name,
    customerName: customer.name ?? undefined,
    customerId: customer.id,
    messageText: text,
    hasImages: imageUrls.length > 0,
    history,
    activeModules: classification.modules,
    targetProducts: classification.targetProducts,
    intent: classification.intent,
  });
  const systemPrompt = summary ? `${basePrompt}\n\nConversation summary so far:\n${summary}` : basePrompt;

  console.log(`\n================== [TWO-TIER AI PIPELINE] ==================`);
  console.log(`📩 Customer Message: "${text}"`);
  console.log(`🤖 Tier 1 (DeepSeek Classifier Output):`);
  console.log(`   • Intent: ${classification.intent}`);
  console.log(`   • Target Product(s): ${classification.targetProducts.join(", ") || "None (Store-wide)"}`);
  console.log(`   • Active Modules: ${Array.from(classification.modules).join(", ")}`);
  console.log(`\n📄 [EXACT PROMPT SENT TO LUNA 5.6]:`);
  console.log(`------------------------------------------------------------`);
  console.log(systemPrompt);
  console.log(`------------------------------------------------------------`);
  console.log(`📊 Stats: ${systemPrompt.length} chars (~${Math.round(systemPrompt.length / 3.5)} tokens) | History: ${history.length} messages`);
  console.log(`=============================================================\n`);

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
        model: "openai/gpt-5.6-luna",
      };
    }
  } else {
    reply = await generateReply(systemPrompt, history);
  }

  const knowledgeQuestions = extractKnowledgeRequests(reply.text);
  const imageRequests = extractImageRequests(reply.text);
  const orderConfirmed = reply.text.includes("[ORDER_CONFIRMED]");
  const followUpData = extractFollowUpData(reply.text, text);
  const cleanText = stripFollowUpMarker(stripOrderMarker(stripImageMarkers(stripKnowledgeMarkers(reply.text))));

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
    deducted = await chargeUsage({
      userId: page.userId,
      pageId: page.id,
      conversationId: conversation.id,
      kind: "inbox_reply",
      model: reply.model,
      tokensIn: reply.tokensIn,
      tokensOut: reply.tokensOut,
    });
    if (deducted) {
      try {
        const token = decryptToken(page.encryptedAccessToken, page.tokenIv);
        if (cleanText) {
          await sendMessage(token, customer.psid, cleanText);
          await ChatService.logMessage(conversation.id, "model", cleanText);
        }
        if (imageRequests.length > 0) {
          const productRows = await getActiveProducts(page.id);
          const combinedContext = `${text} ${cleanText}`.toLowerCase();

          for (const req of imageRequests) {
            let product: any = null;
            const ref = req.productRef.trim();
            const targetColor = req.color?.trim().toLowerCase();

            // 1. Try matching product by exact name or substring name
            product =
              productRows.find((p) => p.name.toLowerCase() === ref.toLowerCase()) ||
              productRows.find(
                (p) =>
                  p.name.toLowerCase().includes(ref.toLowerCase()) ||
                  ref.toLowerCase().includes(p.name.toLowerCase())
              );

            // 2. If ref is a numeric index, try index lookup
            if (!product) {
              const num = parseInt(ref, 10);
              if (!Number.isNaN(num) && num >= 1 && num <= productRows.length) {
                product = productRows[num - 1];
              }
            }

            // 3. If target color is specified, verify if product actually has this color variant.
            // If the resolved product does NOT have this color variant, find the product that DOES have it!
            if (targetColor) {
              const hasColor = (p: any) => {
                const variants: any[] = Array.isArray(p.variants) ? p.variants : [];
                return variants.some((v: any) => {
                  if (typeof v === "string")
                    return (
                      v.toLowerCase() === targetColor ||
                      targetColor.includes(v.toLowerCase()) ||
                      v.toLowerCase().includes(targetColor)
                    );
                  if (typeof v === "object" && v !== null && v.color) {
                    const c = String(v.color).toLowerCase();
                    return c === targetColor || targetColor.includes(c) || c.includes(targetColor);
                  }
                  return false;
                });
              };

              if (!product || !hasColor(product)) {
                const betterProduct = productRows.find((p) => hasColor(p));
                if (betterProduct) {
                  product = betterProduct;
                }
              }
            }

            // 4. If product still not found, check context text for any product name in catalog
            if (!product) {
              for (const p of productRows) {
                if (combinedContext.includes(p.name.toLowerCase())) {
                  product = p;
                  break;
                }
              }
            }

            if (!product) continue;

            let urlsToSend: string[] = [];
            const productVariants: any[] = Array.isArray(product.variants) ? product.variants : [];

            // 1. If explicit color variant is specified in marker
            if (targetColor) {
              const matchedVariant: any = productVariants.find((v: any) => {
                if (typeof v === "string") {
                  const s = v.toLowerCase();
                  return s === targetColor || targetColor.includes(s) || s.includes(targetColor);
                }
                if (typeof v === "object" && v !== null && v.color) {
                  const c = String(v.color).toLowerCase();
                  return c === targetColor || targetColor.includes(c) || c.includes(targetColor);
                }
                return false;
              });

              if (
                matchedVariant &&
                typeof matchedVariant === "object" &&
                Array.isArray(matchedVariant.images) &&
                matchedVariant.images.length > 0
              ) {
                // Show ONLY the images of that specific color variant
                urlsToSend = matchedVariant.images;
              }
            }

            // 2. Fallback: if no color in marker, check if customer or message text mentions a specific color variant
            if (urlsToSend.length === 0 && !targetColor) {
              const banglaColors: Record<string, string[]> = {
                black: ["কালো", "black"],
                blue: ["নীল", "blue"],
                white: ["সাদা", "white", "হোয়াইট"],
                red: ["লাল", "red"],
                green: ["সবুজ", "green"],
                yellow: ["হলুদ", "yellow"],
                maroon: ["মেরুন", "maroon"],
                navy: ["নেভি", "navy"],
                grey: ["ধূসর", "গ্রে", "grey", "gray"],
                pink: ["গোলাপি", "পিংক", "pink"],
                stellar: ["stellar", "স্টেলার"],
                stormy: ["stormy sea", "stormy"],
                grape: ["grape shake", "grape"],
              };

              for (const v of productVariants) {
                if (
                  typeof v === "object" &&
                  v !== null &&
                  v.color &&
                  Array.isArray(v.images) &&
                  v.images.length > 0
                ) {
                  const colorName = String(v.color).toLowerCase();
                  let isMentioned = combinedContext.includes(colorName);
                  if (!isMentioned) {
                    for (const [key, terms] of Object.entries(banglaColors)) {
                      if (colorName.includes(key) && terms.some((t) => combinedContext.includes(t))) {
                        isMentioned = true;
                        break;
                      }
                    }
                  }

                  if (isMentioned) {
                    urlsToSend = v.images;
                    break;
                  }
                }
              }
            }

            // 3. If no specific color was requested, send ONLY the main product image (not all variant images)
            if (urlsToSend.length === 0 && !targetColor) {
              if (product.imageUrl) {
                urlsToSend = [product.imageUrl];
              } else if (product.images?.length) {
                urlsToSend = [product.images[0]];
              }
            }

            for (const url of urlsToSend) {
              try {
                await sendImage(token, customer.psid, url);
                await ChatService.logMessage(conversation.id, "model", `[Image sent: ${url}]`);
              } catch (err: any) {
                console.error(
                  `[sendImage] failed for ${url}:`,
                  err?.response?.data?.error?.message ?? err?.message ?? err
                );
              }
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

  if (orderConfirmed) {
    // If order confirmed, cancel any pending scheduled follow-ups
    await db
      .update(followUps)
      .set({ status: "cancelled", reason: "Customer placed order" })
      .where(and(eq(followUps.conversationId, conversation.id), eq(followUps.status, "scheduled")));

    try {
      const extracted = await extractOrderDetails(conversation.id);
      if (extracted) {
        await chargeUsage({
          userId: page.userId,
          pageId: page.id,
          conversationId: conversation.id,
          kind: "order_extraction",
          model: extracted.model,
          tokensIn: extracted.tokensIn,
          tokensOut: extracted.tokensOut,
        });
        const details = extracted.details;
        const screenshotUrl = await findLatestScreenshot(conversation.id);
        await db.insert(orders).values({
          pageId: page.id,
          customerId: customer.id,
          conversationId: conversation.id,
          customerName: details.customerName ?? customer.name ?? null,
          phone: details.phone ?? null,
          address: details.address ?? null,
          productName: details.productName ?? null,
          sizeVariant: details.sizeVariant ?? null,
          paymentMethod: details.paymentMethod ?? null,
          totalAmount: typeof details.totalAmount === "number" ? details.totalAmount : null,
          deliveryCharge: typeof details.deliveryCharge === "number" ? details.deliveryCharge : null,
          remainingAmount: typeof details.remainingAmount === "number" ? details.remainingAmount : null,
          paymentNumber: details.paymentNumber ?? null,
          screenshotUrl,
          status: "pending",
        });
        if (details.customerName && !customer.name) {
          await db
            .update(customers)
            .set({ name: details.customerName })
            .where(eq(customers.id, customer.id));
        }
        emitPageEvent(page.id, "order", { status: "pending" });
      }
    } catch (err) {
      console.error("order extraction failed:", err);
    }
  }

  if (followUpData != null) {
    // Supersede any older scheduled follow-ups for this conversation
    await db
      .update(followUps)
      .set({ status: "superseded" })
      .where(and(eq(followUps.conversationId, conversation.id), eq(followUps.status, "scheduled")));

    await db.insert(followUps).values({
      pageId: page.id,
      customerId: customer.id,
      conversationId: conversation.id,
      reason: followUpData.reason,
      context: followUpData.context,
      scheduledAt: new Date(Date.now() + followUpData.minutes * 60 * 1000),
      status: "scheduled",
    });
    emitPageEvent(page.id, "follow_up", { conversationId: conversation.id });
  }
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

    // 1. Check for simple praise, compliments, emojis, or greetings (0 AI tokens, instant reply)
    const trimmedMessage = message.trim();
    const simplePraisePattern =
      /^(wow|nice|awesome|good|great|beautiful|sundor|shundor|sundar|mashallah|masha allah|super|love it|khub sundor|onek sundor|osadharon|valo|bhala|সুন্দর|মাশাল্লাহ|অনেক সুন্দর|খুব সুন্দর|অসাধারণ|ভালো|ভালো লাগলো|হুম|hm|hmm|ok|okay|hi|hello|hey|❤️|🔥|😍|🥰|👍|👏|🌹|🌸|💐|\s)+$/i;

    if (simplePraisePattern.test(trimmedMessage)) {
      const praiseReplies = [
        "অনেক ধন্যবাদ! 😊",
        "ধন্যবাদ আপনার সুন্দর মন্তব্যের জন্য! ❤️",
        "ধন্যবাদ! ভালো লাগলে ইনবক্সে নক দিতে পারেন 😊",
        "অনেক ধন্যবাদ! আমাদের কালেকশন ভালো লাগলে জানাবেন 😊",
      ];
      // Deterministic pseudo-random pick based on commentId
      const charCodeSum = Array.from(commentId).reduce((acc, c) => acc + c.charCodeAt(0), 0);
      const commentReply = praiseReplies[charCodeSum % praiseReplies.length];

      try {
        await replyToComment(token, commentId, commentReply);
        emitPageEvent(page.id, "comment_reply", { commentId });
      } catch (err) {
        console.error("[feed] simple praise reply failed:", err);
      }
      continue;
    }

    // Pull the post's image + caption so the AI can identify the product
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

    const systemPrompt = await buildPagePrompt(page.id, botConfig, {
      storeName: page.name,
      messageText: message,
      hasImages: !!postImage,
    });

    const isPriceOrOrderAsk =
      /\b(dam|daam|price|rate|cost|koto|koto taka|taka|tk|order|kinbo|nibo|kine|দাম|কত|টাকা|রেট|প্রাইস|অর্ডার|কিনব|নিব|কত টাকা|বাজেট)\b/i.test(
        trimmedMessage
      );

    let privateMessage = "";
    let commentReply = "";
    let tokensIn = 0;
    let tokensOut = 0;
    let usedModel = "openai/gpt-5.6-luna";

    if (isPriceOrOrderAsk) {
      // Step A: Price/Buying inquiry -> 1 single AI call for private inbox price details
      const privatePrompt = `${systemPrompt}

## PRIVATE REPLY TASK
A customer commented asking about PRICE or ORDERING on Facebook: "${message}"
${caption ? `Post caption: "${caption}"` : ""} ${postImage ? "Analyze the post image to identify which catalog product it shows." : ""}

Identify the exact product from the post/caption, then write the private message following the PRICE RESPONSE FORMAT rules. Output ONLY the message text.`;

      const privateReply = postImage
        ? await generateReplyWithImages(privatePrompt, [postImage], message, [])
        : await generateReply(privatePrompt, [{ role: "user", content: message }]);

      privateMessage = privateReply.text.trim();
      commentReply = "Inbox চেক করুন 📩";
      tokensIn = privateReply.tokensIn;
      tokensOut = privateReply.tokensOut;
      usedModel = privateReply.model;
    } else {
      // Step B: Product question (fabric, sizes, colors, details) -> 1 single AI call for public comment
      const publicPrompt = `${systemPrompt}

A customer commented on your Facebook post: "${message}". ${caption ? `Post caption: "${caption}".` : ""}
Identify the product from the post and answer their question briefly and warmly using that product's details in the catalog (GSM, fabric, material, size, color, quality). Keep the reply short (1-2 lines). Output ONLY the reply text, nothing else.`;

      const publicReply = postImage
        ? await generateReplyWithImages(publicPrompt, [postImage], message, [])
        : await generateReply(publicPrompt, [{ role: "user", content: message }]);

      commentReply = publicReply.text.trim();
      tokensIn = publicReply.tokensIn;
      tokensOut = publicReply.tokensOut;
      usedModel = publicReply.model;
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
        await chargeUsage({
          userId: page.userId,
          pageId: page.id,
          kind: "comment_reply",
          model: usedModel,
          tokensIn,
          tokensOut,
        });
        emitPageEvent(page.id, "comment_reply", { commentId });
      } catch (err) {
        console.error("comment reply failed:", err);
      }
    }
  }
}
