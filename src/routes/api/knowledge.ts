import { Router } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../../db/db";
import { faqs, knowledgeRequests } from "../../db/schema";
import { requireAuth } from "../middleware/auth";
import { assertPageOwnedByUser } from "../middleware/pageAccess";

export const knowledgeRouter = Router();
knowledgeRouter.use(requireAuth);

knowledgeRouter.get("/faqs", async (req, res) => {
  const pageId = req.query.pageId as string;
  if (!pageId || !(await assertPageOwnedByUser(pageId, (req as any).session.user.id))) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  const rows = await db.select().from(faqs).where(eq(faqs.pageId, pageId));
  res.json(rows);
});

knowledgeRouter.post("/faqs", async (req, res) => {
  const { pageId, question, answer } = req.body;
  if (!pageId || !question || !answer) {
    res.status(400).json({ error: "pageId, question, answer required" });
    return;
  }
  if (!(await assertPageOwnedByUser(pageId, (req as any).session.user.id))) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  const [row] = await db.insert(faqs).values({ pageId, question, answer, isActive: true }).returning();
  res.status(201).json(row);
});

knowledgeRouter.patch("/faqs/:id", async (req, res) => {
  const [faq] = await db.select().from(faqs).where(eq(faqs.id, req.params.id)).limit(1);
  if (!faq || !(await assertPageOwnedByUser(faq.pageId, (req as any).session.user.id))) {
    res.status(404).json({ error: "not found" });
    return;
  }
  const set: Record<string, unknown> = {};
  if (req.body.question !== undefined) set.question = req.body.question;
  if (req.body.answer !== undefined) set.answer = req.body.answer;
  if (req.body.isActive !== undefined) set.isActive = req.body.isActive;
  const [updated] = await db.update(faqs).set(set).where(eq(faqs.id, faq.id)).returning();
  res.json(updated);
});

knowledgeRouter.delete("/faqs/:id", async (req, res) => {
  const [faq] = await db.select().from(faqs).where(eq(faqs.id, req.params.id)).limit(1);
  if (!faq || !(await assertPageOwnedByUser(faq.pageId, (req as any).session.user.id))) {
    res.status(404).json({ error: "not found" });
    return;
  }
  await db.delete(faqs).where(eq(faqs.id, faq.id));
  res.json({ ok: true });
});

knowledgeRouter.get("/requests", async (req, res) => {
  const pageId = req.query.pageId as string;
  if (!pageId || !(await assertPageOwnedByUser(pageId, (req as any).session.user.id))) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  const conditions = [eq(knowledgeRequests.pageId, pageId)];
  if (req.query.status) conditions.push(eq(knowledgeRequests.status, req.query.status as string));
  const rows = await db
    .select()
    .from(knowledgeRequests)
    .where(and(...conditions))
    .orderBy(desc(knowledgeRequests.createdAt))
    .limit(100);
  res.json(rows);
});

knowledgeRouter.post("/requests/:id/answer", async (req, res) => {
  const [request] = await db
    .select()
    .from(knowledgeRequests)
    .where(eq(knowledgeRequests.id, req.params.id))
    .limit(1);
  if (!request || !(await assertPageOwnedByUser(request.pageId, (req as any).session.user.id))) {
    res.status(404).json({ error: "not found" });
    return;
  }
  const { answer, saveToFaq } = req.body;
  if (!answer) {
    res.status(400).json({ error: "answer required" });
    return;
  }
  await db
    .update(knowledgeRequests)
    .set({ answer, status: "answered", answeredAt: new Date() })
    .where(eq(knowledgeRequests.id, request.id));
  if (saveToFaq) {
    await db
      .insert(faqs)
      .values({ pageId: request.pageId, question: request.question, answer, isActive: true })
      .onConflictDoNothing();
  }
  res.json({ ok: true });
});
