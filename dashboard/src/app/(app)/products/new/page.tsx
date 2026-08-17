"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { API, api } from "@/lib/api";
import { usePage } from "@/components/PageProvider";
import { Button, Card, Field, Input, Select, TextArea } from "@/lib/ui";
import {
  IconArrowRight,
  IconUpload,
  IconX,
  IconShoppingBag,
} from "@/components/Icons";

const STOCKS = [
  { value: "available", label: "In stock / Available" },
  { value: "low_stock", label: "Low stock" },
  { value: "out_of_stock", label: "Out of stock" },
  { value: "hidden", label: "Draft / Hidden" },
];

export default function NewProductPage() {
  const router = useRouter();
  const { pageId } = usePage();
  const [form, setForm] = useState({
    name: "",
    keywords: "",
    sku: "",
    price: "",
    discount: "",
    stockStatus: "available",
    category: "",
    variants: "",
    description: "",
    deliveryInfo: "",
  });
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function readAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Could not read file"));
      reader.readAsDataURL(file);
    });
  }

  async function uploadFiles(files: File[]) {
    setUploading(true);
    setError("");
    try {
      const urls: string[] = [];
      for (const file of files) {
        const dataUrl = await readAsDataUrl(file);
        const res = await fetch(`${API}/api/products/upload`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "text/plain" },
          body: dataUrl,
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "Image upload failed");
        }
        const { url } = await res.json();
        urls.push(url);
      }
      setImages((prev) => [...prev, ...urls]);
    } catch (err: any) {
      setError(err.message || "Failed to upload images");
    } finally {
      setUploading(false);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
    if (files.length) uploadFiles(files);
  }

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!pageId) {
      setError("Please select a Facebook page first.");
      return;
    }
    if (!form.name.trim()) {
      setError("Product name is required.");
      return;
    }
    if (!form.keywords.trim()) {
      setError("Search keywords are required (helps AI identify this product).");
      return;
    }
    if (images.length === 0) {
      setError("Please upload at least one product image.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await api("/api/products", {
        method: "POST",
        body: JSON.stringify({
          pageId,
          name: form.name.trim(),
          keywords: form.keywords.trim(),
          sku: form.sku.trim() || null,
          imageUrl: images[0],
          images,
          price: form.price ? Number(form.price) : null,
          discount: form.discount ? Number(form.discount) : null,
          stockStatus: form.stockStatus,
          category: form.category.trim() || null,
          variants: form.variants
            ? form.variants
                .split(",")
                .map((v) => v.trim())
                .filter(Boolean)
            : null,
          description: form.description.trim() || null,
          deliveryInfo: form.deliveryInfo.trim() || null,
        }),
      });
      router.push("/products");
    } catch (err: any) {
      setError(err.message || "Failed to create product");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/products"
            className="mb-1.5 inline-flex items-center gap-1 text-xs font-semibold text-mute transition-colors hover:text-ink"
          >
            <span>← Back to Products</span>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Add New Product</h1>
          <p className="text-xs text-mute">
            Add a product to your catalog so the AI sales bot can sell and recommend it.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/products">
            <Button variant="ghost">Cancel</Button>
          </Link>
          <Button onClick={handleSubmit} disabled={saving || uploading}>
            {saving ? "Saving…" : "Publish Product"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-danger/20 bg-danger-soft p-4 text-xs font-medium text-danger">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card className="p-6">
          <h2 className="text-sm font-bold tracking-tight text-ink">Basic Information</h2>
          <p className="mb-4 text-xs text-mute">Name, description, and keywords the AI uses to search.</p>

          <div className="space-y-4">
            <Field label="Product Name *">
              <Input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Premium Oxford Cotton Shirt"
              />
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Search Keywords * (comma separated)">
                <Input
                  required
                  value={form.keywords}
                  onChange={(e) => setForm({ ...form, keywords: e.target.value })}
                  placeholder="e.g. shirt, cotton, formal"
                />
              </Field>
              <Field label="SKU (optional)">
                <Input
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  placeholder="e.g. SH-001"
                />
              </Field>
              <Field label="Category (optional)">
                <Input
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="e.g. Shirts"
                />
              </Field>
            </div>

            <Field label="Description (optional)">
              <TextArea
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Describe material, quality, sizing details, care instructions…"
              />
            </Field>
          </div>
        </Card>

        {/* Pricing & Stock */}
        <Card className="p-6">
          <h2 className="text-sm font-bold tracking-tight text-ink">Pricing & Inventory</h2>
          <p className="mb-4 text-xs text-mute">Set price in BDT, discounts, and inventory availability.</p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Regular Price (BDT)">
              <Input
                type="number"
                min="0"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="1250"
              />
            </Field>

            <Field label="Discount % (optional)">
              <Input
                type="number"
                min="0"
                max="100"
                value={form.discount}
                onChange={(e) => setForm({ ...form, discount: e.target.value })}
                placeholder="10"
              />
            </Field>

            <Field label="Stock Status">
              <Select
                value={form.stockStatus}
                onChange={(e) => setForm({ ...form, stockStatus: e.target.value })}
              >
                {STOCKS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Variants (comma separated)">
              <Input
                value={form.variants}
                onChange={(e) => setForm({ ...form, variants: e.target.value })}
                placeholder="e.g. M, L, XL, XXL or Black, White, Navy"
              />
            </Field>

            <Field label="Delivery / Shipping Info (optional)">
              <Input
                value={form.deliveryInfo}
                onChange={(e) => setForm({ ...form, deliveryInfo: e.target.value })}
                placeholder="e.g. ৳60 inside Dhaka, ৳120 outside Dhaka"
              />
            </Field>
          </div>
        </Card>

        {/* Product Images */}
        <Card className="p-6">
          <h2 className="text-sm font-bold tracking-tight text-ink">Product Images *</h2>
          <p className="mb-4 text-xs text-mute">
            Upload clear product photos. The AI uses these to match customer images and showcase items.
          </p>

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-line bg-paper p-8 text-center transition-all hover:border-leaf hover:bg-leaf-soft/20"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-leaf-soft text-leaf">
              <IconUpload size={20} />
            </div>
            <p className="mt-3 text-sm font-semibold text-ink">
              Drag & drop product images, or <span className="text-leaf underline">browse</span>
            </p>
            <p className="mt-1 text-xs text-mute">PNG, JPG, WEBP up to 10MB each</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                if (files.length) uploadFiles(files);
                e.target.value = "";
              }}
            />
          </div>

          {uploading && (
            <p className="mt-3 text-xs font-medium text-mute animate-pulse">Uploading images to server…</p>
          )}

          {images.length > 0 && (
            <div className="mt-5">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-mute">
                Uploaded Images ({images.length}) — First image is primary
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-5">
                {images.map((url, i) => (
                  <div key={`${url}-${i}`} className="group relative aspect-square overflow-hidden rounded-xl border border-line bg-paper">
                    <img src={url} alt="" className="h-full w-full object-cover" />
                    {i === 0 && (
                      <span className="absolute bottom-1.5 left-1.5 rounded-md bg-ink/80 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        Primary
                      </span>
                    )}
                    <button
                      type="button"
                      aria-label="Remove image"
                      onClick={(e) => {
                        e.stopPropagation();
                        setImages((prev) => prev.filter((_, idx) => idx !== i));
                      }}
                      className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-danger text-white opacity-0 transition-opacity group-hover:opacity-100 shadow-xs"
                    >
                      <IconX size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Action bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link href="/products">
            <Button variant="ghost">Cancel</Button>
          </Link>
          <Button type="submit" disabled={saving || uploading}>
            {saving ? "Publishing…" : "Publish Product"}
          </Button>
        </div>
      </form>
    </div>
  );
}
