import { Router } from "express";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "../../db/db";
import { conversations, customers, messages } from "../../db/schema";
import { requireAuth } from "../middleware/auth";
import { assertPageOwnedByUser } from "../middleware/pageAccess";

export const conversationsRouter = Router();
conversationsRouter.use(requireAuth);

conversationsRouter.get("/", async (req, res) => {
  const pageId = req.query.pageId as string;
  if (!pageId || !(await assertPageOwnedByUser(pageId, (req as any).session.user.id))) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  const conditions = [eq(conversations.pageId, pageId)];
  if (req.query.status) conditions.push(eq(conversations.status, req.query.status as string));
  if (req.query.handledBy) conditions.push(eq(conversations.handledBy, req.query.handledBy as string));
  if (req.query.q) {
    conditions.push(
      or(ilike(customers.name, `%${req.query.q}%`), ilike(customers.psid, `%${req.query.q}%`))!
    );
  }
  const rows = await db
    .select({
      id: conversations.id,
      status: conversations.status,
      handledBy: conversations.handledBy,
      attentionReason: conversations.attentionReason,
      lastMessageAt: conversations.lastMessageAt,
      customerId: customers.id,
      customerName: customers.name,
      customerPsid: customers.psid,
      profilePicUrl: customers.profilePicUrl,
      customerStatus: customers.status,
    })
    .from(conversations)
    .innerJoin(customers, eq(conversations.customerId, customers.id))
    .where(and(...conditions))
    .orderBy(desc(conversations.lastMessageAt))
    .limit(100);
  res.json(rows);
});

conversationsRouter.get("/:id", async (req, res) => {
  const [conversation] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, req.params.id))
    .limit(1);
  if (!conversation || !(await assertPageOwnedByUser(conversation.pageId, (req as any).session.user.id))) {
    res.status(404).json({ error: "not found" });
    return;
  }
  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.id, conversation.customerId))
    .limit(1);
  const messageRows = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversation.id))
    .orderBy(messages.createdAt);
  res.json({ ...conversation, customer, messages: messageRows });
});

conversationsRouter.post("/:id/takeover", async (req, res) => {
  const conversation = await ownedConversation(req);
  if (!conversation) {
    res.status(404).json({ error: "not found" });
    return;
  }
  const [updated] = await db
    .update(conversations)
    .set({ handledBy: "human", attentionReason: sql`null` })
    .where(eq(conversations.id, conversation.id))
    .returning();
  res.json(updated);
});

conversationsRouter.post("/:id/return-to-ai", async (req, res) => {
  const conversation = await ownedConversation(req);
  if (!conversation) {
    res.status(404).json({ error: "not found" });
    return;
  }
  const [updated] = await db
    .update(conversations)
    .set({ handledBy: "bot" })
    .where(eq(conversations.id, conversation.id))
    .returning();
  res.json(updated);
});

conversationsRouter.patch("/:id/status", async (req, res) => {
  const conversation = await ownedConversation(req);
  if (!conversation) {
    res.status(404).json({ error: "not found" });
    return;
  }
  if (!req.body.status) {
    res.status(400).json({ error: "status required" });
    return;
  }
  const [updated] = await db
    .update(conversations)
    .set({ status: req.body.status })
    .where(eq(conversations.id, conversation.id))
    .returning();
  res.json(updated);
});

async function ownedConversation(req: any) {
  const [conversation] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, req.params.id))
    .limit(1);
  if (!conversation) return null;
  const page = await assertPageOwnedByUser(conversation.pageId, req.session.user.id);
  return page ? conversation : null;
}
