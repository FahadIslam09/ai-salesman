import express, { Router } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../../db/db";
import { products } from "../../db/schema";
import { requireAuth } from "../middleware/auth";
import { assertPageOwnedByUser } from "../middleware/pageAccess";
import { uploadImage } from "../../services/imgbbService";

export const productsRouter = Router();
productsRouter.use(requireAuth);

// Accepts the image as a raw text/plain base64 (or data URL) body so it
// bypasses the global JSON 1mb limit without touching other endpoints.
productsRouter.post("/upload", express.text({ type: "text/plain", limit: "10mb" }), async (req, res) => {
  try {
    const image = req.body;
    if (!image || typeof image !== "string") {
      res.status(400).json({ error: "Image data is required" });
      return;
    }

    // Verify image data URI or base64 image signature
    const isDataUriImage = image.startsWith("data:image/");
    const isRawBase64Image = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(image.slice(0, 100));
    if (!isDataUriImage && !isRawBase64Image) {
      res.status(400).json({ error: "Only image files (PNG, JPG, WEBP, GIF) are supported." });
      return;
    }

    const url = await uploadImage(image);
    res.json({ url });
  } catch (err: any) {
    res.status(502).json({ error: `Upload failed: ${err.message}` });
  }
});

productsRouter.get("/", async (req, res) => {
  try {
    const pageId = req.query.pageId as string;
    if (!pageId || !(await assertPageOwnedByUser(pageId, (req as any).session.user.id))) {
      res.status(403).json({ error: "forbidden" });
      return;
    }
    const rows = await db
      .select()
      .from(products)
      .where(and(eq(products.pageId, pageId), eq(products.isActive, true)))
      .orderBy(desc(products.createdAt));
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch products" });
  }
});

productsRouter.get("/:id", async (req, res) => {
  try {
    const [product] = await db.select().from(products).where(eq(products.id, req.params.id)).limit(1);
    if (!product || !(await assertPageOwnedByUser(product.pageId, (req as any).session.user.id))) {
      res.status(404).json({ error: "not found" });
      return;
    }
    res.json(product);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch product" });
  }
});

productsRouter.post("/", async (req, res) => {
  const { pageId, name, keywords, imageUrl, images, price, description, discount, discountType, stockStatus, category, sku, variants, deliveryInfo } = req.body;
  if (!pageId || !name || !keywords) {
    res.status(400).json({ error: "pageId, name, keywords required" });
    return;
  }
  const imageList: string[] = Array.isArray(images) && images.length > 0
    ? images
    : imageUrl ? [imageUrl] : [];
  if (imageList.length === 0) {
    res.status(400).json({ error: "at least one image is required" });
    return;
  }
  if (!(await assertPageOwnedByUser(pageId, (req as any).session.user.id))) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  const [row] = await db
    .insert(products)
    .values({
      pageId,
      name,
      keywords,
      imageUrl: imageList[0],
      images: imageList,
      price,
      description,
      discount,
      discountType: discountType ?? "percent",
      stockStatus: stockStatus ?? "available",
      category,
      sku,
      variants,
      deliveryInfo,
    })
    .returning();
  res.status(201).json(row);
});

productsRouter.patch("/:id", async (req, res) => {
  const [product] = await db.select().from(products).where(eq(products.id, req.params.id)).limit(1);
  if (!product || !(await assertPageOwnedByUser(product.pageId, (req as any).session.user.id))) {
    res.status(404).json({ error: "not found" });
    return;
  }
  const allowed = [
    "name", "keywords", "imageUrl", "images", "price", "description", "discount", "discountType",
    "stockStatus", "category", "sku", "variants", "deliveryInfo",
  ] as const;
  const set: Record<string, unknown> = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) set[key] = req.body[key];
  }
  if (Array.isArray(set.images)) {
    set.imageUrl = (set.images as string[])[0] ?? product.imageUrl;
  }
  const [updated] = await db.update(products).set(set).where(eq(products.id, product.id)).returning();
  res.json(updated);
});

productsRouter.delete("/:id", async (req, res) => {
  const [product] = await db.select().from(products).where(eq(products.id, req.params.id)).limit(1);
  if (!product || !(await assertPageOwnedByUser(product.pageId, (req as any).session.user.id))) {
    res.status(404).json({ error: "not found" });
    return;
  }
  await db.update(products).set({ isActive: false }).where(eq(products.id, product.id));
  res.json({ ok: true });
});
