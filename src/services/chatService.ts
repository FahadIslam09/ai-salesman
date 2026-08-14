// src/services/chatService.ts
import { db } from "../db/db";
import { conversations, messages } from "../db/schema";
import { eq, and, desc } from "drizzle-orm";

export class ChatService {

  /**
   * Gets or creates a conversation using the composite unique (pageId + psid).
   * In this schema, conversations track the customer identity directly via psid.
   */
  static async getOrCreateConversation(pageId: string, psid: string) {
    const existing = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.pageId, pageId), eq(conversations.psid, psid)))
      .limit(1);

    if (existing.length > 0) {
      return existing[0];
    }

    const [inserted] = await db
      .insert(conversations)
      .values({
        pageId,
        psid,
        status: "bot",
        lastMessageAt: new Date(),
      })
      .returning();

    return inserted;
  }

  /**
   * Saves a message (user or model) to the messages table.
   */
  static async logMessage(conversationId: string, role: "user" | "model", content: string) {
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