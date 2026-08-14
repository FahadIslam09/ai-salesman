"use client";

import { useEffect, useState } from "react";
import { api, fmtTaka } from "@/lib/api";
import { usePage } from "@/components/PageProvider";
import { Badge, Button, Card, EmptyState, Field, Input, Select, Spinner, Table, statusTone } from "@/lib/ui";

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
};

export default function ProductsPage() {
  const { pageId } = usePage();
  const [rows, setRows] = useState<Product[]>([]);
  const [form, setForm] = useState<Record<string, string>>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
    setSaving(true);
    try {
      await api("/api/products", {
        method: "POST",
        body: JSON.stringify({
          pageId,
          name: form.name,
          keywords: form.keywords,
          imageUrl: form.imageUrl,
          price: form.price ? Number(form.price) : null,
          stockStatus: form.stockStatus,
          category: form.category || null,
          variants: form.variants ? form.variants.split(",").map((v) => v.trim()) : null,
        }),
      });
      setForm(EMPTY);
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
          <Field label="Image URL">
            <Input required value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://…" />
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
    </div>
  );
}
