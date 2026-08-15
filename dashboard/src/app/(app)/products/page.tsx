"use client";

import { useEffect, useRef, useState } from "react";
import { API, api, fmtTaka } from "@/lib/api";
import { usePage } from "@/components/PageProvider";
import { Badge, Button, Card, EmptyState, Field, Input, Select, Spinner, Table, TextArea, statusTone } from "@/lib/ui";

interface Product {
  id: string;
  name: string;
  keywords: string;
  imageUrl: string;
  price: number | null;
  stockStatus: string;
  discount: number | null;
  category: string | null;
  variants: string[] | null;
}

const EMPTY = {
  name: "",
  keywords: "",
  imageUrl: "",
  price: "",
  stockStatus: "available",
  category: "",
  variants: "",
  description: "",
};

export default function ProductsPage() {
  const { pageId } = usePage();
  const [rows, setRows] = useState<Product[]>([]);
  const [form, setForm] = useState<Record<string, string>>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = () => {
    if (!pageId) return;
    setLoading(true);
    api<Product[]>(`/api/products?pageId=${pageId}`)
      .then(setRows)
      .finally(() => setLoading(false));
  };

  useEffect(load, [pageId]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (images.length === 0) {
      setError("Upload at least one product image.");
      setModalOpen(true);
      return;
    }
    setSaving(true);
    try {
      await api("/api/products", {
        method: "POST",
        body: JSON.stringify({
          pageId,
          name: form.name,
          keywords: form.keywords,
          imageUrl: images[0],
          images,
          price: form.price ? Number(form.price) : null,
          stockStatus: form.stockStatus,
          category: form.category || null,
          variants: form.variants ? form.variants.split(",").map((v) => v.trim()) : null,
          description: form.description || null,
        }),
      });
      setForm(EMPTY);
      setImages([]);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function setStock(product: Product, stockStatus: string) {
    await api(`/api/products/${product.id}`, { method: "PATCH", body: JSON.stringify({ stockStatus }) });
    load();
  }

  async function remove(product: Product) {
    await api(`/api/products/${product.id}`, { method: "DELETE" });
    load();
  }

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
          throw new Error(body.error ?? "Upload failed");
        }
        const { url } = await res.json();
        urls.push(url);
      }
      setImages((prev) => [...prev, ...urls]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
    if (files.length) uploadFiles(files);
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <p className="mb-4 font-display text-base font-semibold text-ink">Add product</p>
        <form onSubmit={add} className="grid gap-3 md:grid-cols-3">
          <Field label="Name">
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Black Formal Shirt" />
          </Field>
          <Field label="Search keywords">
            <Input required value={form.keywords} onChange={(e) => setForm({ ...form, keywords: e.target.value })} placeholder="black, kalo, shirt" />
          </Field>
          <Field label="Product images">
            <div className="flex items-center gap-3">
              {images[0] && <img src={images[0]} alt="" className="h-12 w-12 rounded-lg object-cover" />}
              <Button variant="ghost" onClick={() => setModalOpen(true)}>
                {images.length ? `Upload image${images.length > 1 ? `s (${images.length})` : ""}` : "Upload image"}
              </Button>
            </div>
            {images.length === 0 && <p className="mt-1 text-xs text-mute">Upload at least one product image.</p>}
          </Field>
          <Field label="Price (BDT)">
            <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="550" />
          </Field>
          <Field label="Stock status">
            <Select value={form.stockStatus} onChange={(e) => setForm({ ...form, stockStatus: e.target.value })}>
              <option value="available">Available</option>
              <option value="low_stock">Low stock</option>
              <option value="out_of_stock">Out of stock</option>
            </Select>
          </Field>
          <Field label="Variants (comma separated)">
            <Input value={form.variants} onChange={(e) => setForm({ ...form, variants: e.target.value })} placeholder="S, M, L" />
          </Field>
          <div className="md:col-span-3">
            <Field label="Description (optional)">
              <TextArea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Soft premium cotton, hand-stitched collar…" />
            </Field>
          </div>
          <div className="md:col-span-3">
            {error && <p className="mb-2 text-sm text-danger">{error}</p>}
            <Button type="submit" disabled={saving}>
              {saving ? "Adding…" : "Add product"}
            </Button>
          </div>
        </form>
      </Card>

      {loading ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <EmptyState title="No products yet. Add products so the AI can sell them." />
      ) : (
        <Table head={["Product", "Price", "Stock", "Keywords", ""]}>
          {rows.map((p) => (
            <tr key={p.id} className="hover:bg-paper">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <img src={p.imageUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />
                  <span className="font-medium text-ink">{p.name}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-ink">{fmtTaka(p.price)}</td>
              <td className="px-4 py-3">
                <Badge tone={statusTone(p.stockStatus)}>{p.stockStatus.replaceAll("_", " ")}</Badge>
              </td>
              <td className="px-4 py-3 text-xs text-mute">{p.keywords}</td>
              <td className="px-4 py-3 text-right">
                <div className="flex justify-end gap-2">
                  <Select
                    value={p.stockStatus}
                    onChange={(e) => setStock(p, e.target.value)}
                    className="py-1.5 text-xs"
                  >
                    <option value="available">Available</option>
                    <option value="low_stock">Low stock</option>
                    <option value="out_of_stock">Out of stock</option>
                  </Select>
                  <Button variant="ghost" onClick={() => remove(p)} className="py-1.5 text-xs">
                    Remove
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </Table>
      )}

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-xl border border-line bg-surface p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="font-display text-base font-semibold text-ink">Upload product images</p>
              <button onClick={() => setModalOpen(false)} className="text-sm text-mute hover:text-ink">
                Close
              </button>
            </div>

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-line p-8 text-center transition-colors hover:border-leaf"
            >
              <p className="text-sm text-ink">Drag & drop images here, or click to browse</p>
              <p className="mt-1 text-xs text-mute">Multiple images supported</p>
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

            {uploading && <p className="mt-3 text-sm text-mute">Uploading…</p>}
            {error && <p className="mt-3 text-sm text-danger">{error}</p>}

            {images.length > 0 && (
              <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
                {images.map((url, i) => (
                  <div key={`${url}-${i}`} className="relative">
                    <img src={url} alt="" className="h-20 w-full rounded-lg object-cover" />
                    <button
                      type="button"
                      onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-danger text-xs text-white"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-5 flex justify-end">
              <Button onClick={() => setModalOpen(false)}>Done</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
