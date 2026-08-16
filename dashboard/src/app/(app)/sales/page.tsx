"use client";

import { useCallback, useEffect, useState } from "react";
import { API, api, fmtTaka, timeAgo } from "@/lib/api";
import { usePage } from "@/components/PageProvider";
import { Badge, Button, Card, EmptyState, Field, Input, Select, Spinner, Stat, Table } from "@/lib/ui";

interface Sale {
  id: string;
  quantity: number;
  amount: number;
  source: string;
  aiAssisted: boolean;
  createdAt: string;
  customerName: string | null;
  productName: string | null;
}

interface Customer {
  id: string;
  name: string | null;
}

interface Product {
  id: string;
  name: string;
}

const SOURCES = [
  { value: "inbox", label: "Inbox" },
  { value: "comment", label: "Post comment" },
  { value: "follow_up", label: "Follow-up" },
  { value: "direct", label: "Direct" },
];

export default function SalesPage() {
  const { pageId } = usePage();
  const [rows, setRows] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    customerId: "",
    productId: "",
    quantity: "1",
    amount: "",
    source: "inbox",
    aiAssisted: "true",
  });

  const load = useCallback(() => {
    if (!pageId) return;
    setLoading(true);
    Promise.all([
      api<Sale[]>(`/api/sales?pageId=${pageId}`),
      api<Customer[]>(`/api/customers?pageId=${pageId}`),
      api<Product[]>(`/api/products?pageId=${pageId}`),
    ])
      .then(([sales, custs, prods]) => {
        setRows(sales);
        setCustomers(custs);
        setProducts(prods);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [pageId]);

  useEffect(() => {
    load();
  }, [load]);

  // Real-time: refresh when a new sale is recorded for this page.
  useEffect(() => {
    if (!pageId) return;
    const es = new EventSource(`${API}/api/events?pageId=${pageId}`, { withCredentials: true });
    es.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.type === "sale") load();
      } catch {
        // ignore malformed events
      }
    };
    return () => es.close();
  }, [pageId, load]);

  async function recordSale(e: React.FormEvent) {
    e.preventDefault();
    if (!form.customerId || !form.amount) return;
    setSaving(true);
    setError("");
    try {
      await api("/api/sales", {
        method: "POST",
        body: JSON.stringify({
          pageId,
          customerId: form.customerId,
          productId: form.productId || null,
          quantity: Number(form.quantity) || 1,
          amount: Number(form.amount),
          source: form.source,
          aiAssisted: form.aiAssisted === "true",
        }),
      });
      setModalOpen(false);
      setForm({ customerId: "", productId: "", quantity: "1", amount: "", source: "inbox", aiAssisted: "true" });
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const total = rows.reduce((sum, r) => sum + r.amount, 0);
  const aiCount = rows.filter((r) => r.aiAssisted).length;
  const avg = rows.length ? Math.round(total / rows.length) : 0;
  const aiPct = rows.length ? Math.round((aiCount / rows.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-mute">Live sales overview for this page</p>
        <Button onClick={() => setModalOpen(true)}>Record sale</Button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Total revenue" value={fmtTaka(total)} />
        <Stat label="Orders" value={rows.length} />
        <Stat label="Average order" value={fmtTaka(avg)} />
        <Stat label="AI-assisted" value={aiCount} sub={`${aiPct}% of orders`} />
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {loading ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <EmptyState title="No sales recorded yet." />
      ) : (
        <Table head={["Customer", "Product", "Qty", "Amount", "Source", "Assisted", "When"]}>
          {rows.map((s) => (
            <tr key={s.id} className="hover:bg-paper">
              <td className="px-4 py-3 font-medium text-ink">{s.customerName ?? "—"}</td>
              <td className="px-4 py-3 text-ink">{s.productName ?? "—"}</td>
              <td className="px-4 py-3 text-mute">{s.quantity}</td>
              <td className="px-4 py-3 font-display font-semibold text-ink">{fmtTaka(s.amount)}</td>
              <td className="px-4 py-3">
                <Badge tone="gray">{s.source.replaceAll("_", " ")}</Badge>
              </td>
              <td className="px-4 py-3">
                <Badge tone={s.aiAssisted ? "green" : "blue"}>{s.aiAssisted ? "AI" : "Human"}</Badge>
              </td>
              <td className="px-4 py-3 text-xs text-mute">{timeAgo(s.createdAt)}</td>
            </tr>
          ))}
        </Table>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setModalOpen(false)}>
          <div className="w-full max-w-lg rounded-xl border border-line bg-surface p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="font-display text-base font-semibold text-ink">Record a sale</p>
              <button onClick={() => setModalOpen(false)} className="text-sm text-mute hover:text-ink">
                Close
              </button>
            </div>

            <form onSubmit={recordSale} className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field label="Customer (required)">
                <Select required value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })}>
                  <option value="">Select customer…</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name ?? c.id.slice(0, 8)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Product">
                <Select value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })}>
                  <option value="">None</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Quantity">
                <Input type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
              </Field>
              <Field label="Amount (BDT, required)">
                <Input type="number" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="550" />
              </Field>
              <Field label="Source">
                <Select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
                  {SOURCES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Assisted by">
                <Select value={form.aiAssisted} onChange={(e) => setForm({ ...form, aiAssisted: e.target.value })}>
                  <option value="true">AI</option>
                  <option value="false">Human</option>
                </Select>
              </Field>

              {error && <p className="sm:col-span-2 text-sm text-danger">{error}</p>}

              <div className="sm:col-span-2 flex gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving…" : "Save sale"}
                </Button>
                <Button variant="ghost" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
