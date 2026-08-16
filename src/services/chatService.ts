// src/services/chatService.ts
import { db } from "../db/db";
import { conversations, messages, customers } from "../db/schema";
import { and, asc, eq, desc, gt } from "drizzle-orm";
import { generateReply } from "./aiService";

export class ChatService {
  /**
   * Gets or creates a customer using the composite unique (pageId + psid).
   * onConflictDoNothing handles the race where two webhook events create
   * the same customer simultaneously.
   */
  static async getOrCreateCustomer(pageId: string, psid: string) {
    const existing = await db
      .select()
      .from(customers)
      .where(and(eq(customers.pageId, pageId), eq(customers.psid, psid)))
      .limit(1);

    if (existing.length > 0) {
      return existing[0];
    }

    await db.insert(customers).values({ pageId, psid }).onConflictDoNothing();

    const [inserted] = await db
      .select()
      .from(customers)
      .where(and(eq(customers.pageId, pageId), eq(customers.psid, psid)))
      .limit(1);

    return inserted;
  }

  /**
   * Gets or creates a conversation for a customer (one active conversation per customer).
   */
  static async getOrCreateConversation(pageId: string, customerId: string) {
    const existing = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.pageId, pageId), eq(conversations.customerId, customerId)))
      .limit(1);

    if (existing.length > 0) {
      return existing[0];
    }

    const [inserted] = await db
      .insert(conversations)
      .values({
        pageId,
        customerId,
        status: "new",
        handledBy: "bot",
        lastMessageAt: new Date(),
      })
      .onConflictDoNothing()
      .returning();

    if (inserted) {
      return inserted;
    }

    const [reSelected] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.pageId, pageId), eq(conversations.customerId, customerId)))
      .limit(1);

    return reSelected;
  }

  /**
   * Saves a message (user, model or human) to the messages table.
   */
  static async logMessage(
    conversationId: string,
    role: "user" | "model" | "human",
    content: string,
    imageUrl?: string | null
  ) {
    await db.insert(messages).values({
      conversationId,
      role,
      content,
      imageUrl,
      createdAt: new Date(),
    });

    await db
      .update(conversations)
      .set({ lastMessageAt: new Date() })
      .where(eq(conversations.id, conversationId));
  }

  /**
   * Sliding window: fetch last N messages, merge consecutive same-role messages,
   * ensure history starts with a 'user' message.
   */
  static async getRecentChatHistory(conversationId: string, limit: number = 10) {
    const history = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(desc(messages.createdAt))
      .limit(limit);

    // Reverse to chronological order
    const rawHistory = history.reverse().map((msg) => ({
      role: msg.role as "user" | "model",
      content: msg.content,
    }));

    // Merge consecutive same-role messages
    const cleanHistory: { role: "user" | "model"; content: string }[] = [];

    for (const msg of rawHistory) {
      const last = cleanHistory[cleanHistory.length - 1];
      if (last && last.role === msg.role) {
        last.content += "\n" + msg.content;
      } else {
        cleanHistory.push({ ...msg });
      }
    }

    // Must start with 'user' message
    if (cleanHistory.length > 0 && cleanHistory[0].role === "model") {
      cleanHistory.shift();
    }

    return cleanHistory;
  }

  /**
   * When a conversation grows past the sliding window, summarize the overflow
   * into conversations.summary so context is kept without paying for every
   * historical message on each AI call. Returns the combined summary + token
   * usage, or null if nothing was summarized.
   */
  static async maybeSummarize(
    conversationId: string
  ): Promise<{ summary: string; tokensIn: number; tokensOut: number } | null> {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);
    if (!conversation) return null;

    let overflow;
    if (conversation.summarizedUpto) {
      overflow = await db
        .select()
        .from(messages)
        .where(and(eq(messages.conversationId, conversationId), gt(messages.createdAt, conversation.summarizedUpto)))
        .orderBy(asc(messages.createdAt))
        .limit(100);
    } else {
      const all = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conversationId))
        .orderBy(asc(messages.createdAt));
      if (all.length > 15) overflow = all.slice(0, all.length - 15);
    }

    if (!overflow || overflow.length === 0) {
      return conversation.summary ? { summary: conversation.summary, tokensIn: 0, tokensOut: 0 } : null;
    }

    const excerpt = overflow.map((m) => `${m.role}: ${m.content}`).join("\n");
    const res = await generateReply(
      "Summarize this conversation excerpt in 2-3 short sentences. Output only the summary.",
      [{ role: "user", content: excerpt }]
    );
    const combined = `${conversation.summary ? conversation.summary + " " : ""}${res.text.trim()}`;
    await db
      .update(conversations)
      .set({ summary: combined, summarizedUpto: new Date(overflow[overflow.length - 1].createdAt) })
      .where(eq(conversations.id, conversationId));
    return { summary: combined, tokensIn: res.tokensIn, tokensOut: res.tokensOut };
  }
}
