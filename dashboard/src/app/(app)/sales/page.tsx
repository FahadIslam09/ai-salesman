"use client";

import { useEffect, useState } from "react";
import { api, fmtTaka, timeAgo } from "@/lib/api";
import { usePage } from "@/components/PageProvider";
import { Badge, Button, Card, EmptyState, Field, Input, Select, Spinner, Table, statusTone } from "@/lib/ui";

interface Sale {
  id: string;
  amount: number;
  quantity: number;
  source: string;
  aiAssisted: boolean;
  createdAt: string;
}

interface Customer {
  id: string;
  name: string | null;
}

export default function SalesPage() {
  const { pageId } = usePage();
  const [rows, setRows] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [form, setForm] = useState({ customerId: "", amount: "", source: "inbox", aiAssisted: "true" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = () => {
    if (!pageId) return;
    setLoading(true);
    Promise.all([
      api<Sale[]>(`/api/sales?pageId=${pageId}`),
      api<Customer[]>(`/api/customers?pageId=${pageId}`),
    ])
      .then(([sales, custs]) => {
        setRows(sales);
        setCustomers(custs);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [pageId]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!form.customerId || !form.amount) return;
    setSaving(true);
    try {
      await api("/api/sales", {
        method: "POST",
        body: JSON.stringify({
          pageId,
          customerId: form.customerId,
          amount: Number(form.amount),
          source: form.source,
          aiAssisted: form.aiAssisted === "true",
        }),
      });
      setForm({ ...form, amount: "" });
      load();
    } finally {
      setSaving(false);
    }
  }

  const total = rows.reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <p className="mb-4 font-display text-base font-semibold text-ink">Record a sale</p>
        <form onSubmit={add} className="grid gap-3 md:grid-cols-4">
          <Field label="Customer">
            <Select required value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })}>
              <option value="">Select customer…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name ?? c.id.slice(0, 8)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Amount (BDT)">
            <Input type="number" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="550" />
          </Field>
          <Field label="Source">
            <Select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
              <option value="inbox">Inbox</option>
              <option value="comment">Post comment</option>
              <option value="follow_up">Follow-up</option>
              <option value="direct">Direct</option>
            </Select>
          </Field>
          <Field label="Assisted by">
            <Select value={form.aiAssisted} onChange={(e) => setForm({ ...form, aiAssisted: e.target.value })}>
              <option value="true">AI</option>
              <option value="false">Human</option>
            </Select>
          </Field>
          <div className="md:col-span-4">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Record sale"}
            </Button>
          </div>
        </form>
      </Card>

      {loading ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <EmptyState title="No sales recorded yet." />
      ) : (
        <>
          <p className="font-display text-lg font-semibold text-ink">
            Total: <span className="text-leaf">{fmtTaka(total)}</span> across {rows.length} orders
          </p>
          <Table head={["Amount", "Source", "Assisted", "When"]}>
            {rows.map((s) => (
              <tr key={s.id} className="hover:bg-paper">
                <td className="px-4 py-3 font-display font-semibold text-ink">{fmtTaka(s.amount)}</td>
                <td className="px-4 py-3">
                  <Badge tone="gray">{s.source.replaceAll("_", " ")}</Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge tone={s.aiAssisted ? "green" : "blue"}>{s.aiAssisted ? "AI" : "Human"}</Badge>
                </td>
                <td className="px-4 py-3 text-mute">{timeAgo(s.createdAt)}</td>
              </tr>
            ))}
          </Table>
        </>
      )}
    </div>
  );
}
