// src/services/chatService.ts
import { db } from "../db/db";
import { conversations, messages, customers } from "../db/schema";
import { eq, and, desc } from "drizzle-orm";

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
    content: string
  ) {
    await db.insert(messages).values({
      conversationId,
      role,
      content,
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
    const cleanHistory: { role: string; content: string }[] = [];

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
}
