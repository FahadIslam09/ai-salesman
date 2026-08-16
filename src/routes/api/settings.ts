import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../../db/db";
import { botConfigs } from "../../db/schema";
import { requireAuth } from "../middleware/auth";
import { assertPageOwnedByUser } from "../middleware/pageAccess";

export const settingsRouter = Router();
settingsRouter.use(requireAuth);

settingsRouter.get("/:pageId", async (req, res) => {
  if (!(await assertPageOwnedByUser(req.params.pageId, (req as any).session.user.id))) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  const [config] = await db
    .select()
    .from(botConfigs)
    .where(eq(botConfigs.pageId, req.params.pageId))
    .limit(1);
  res.json(config ?? null);
});

settingsRouter.patch("/:pageId", async (req, res) => {
  if (!(await assertPageOwnedByUser(req.params.pageId, (req as any).session.user.id))) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  const allowed = [
    "enabled", "useBusinessInfo", "businessName", "businessType", "contactNumber",
    "businessInfo", "orderInfo", "paymentInfo", "deliveryInfo", "additionalInfo",
    "returnPolicy", "exchangePolicy", "refundPolicy", "warranty",
    "tone", "language", "workingHours", "customInstructions",
  ] as const;
  const set: Record<string, unknown> = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) set[key] = req.body[key];
  }
  await db
    .insert(botConfigs)
    .values({ pageId: req.params.pageId, ...set })
    .onConflictDoUpdate({ target: botConfigs.pageId, set });
  const [config] = await db
    .select()
    .from(botConfigs)
    .where(eq(botConfigs.pageId, req.params.pageId))
    .limit(1);
  res.json(config);
});
