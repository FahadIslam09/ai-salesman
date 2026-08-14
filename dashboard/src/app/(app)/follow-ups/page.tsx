"use client";

import { useEffect, useState } from "react";
import { api, timeAgo } from "@/lib/api";
import { usePage } from "@/components/PageProvider";
import { Badge, Button, Card, EmptyState, Field, Input, Select, Spinner, Table, statusTone } from "@/lib/ui";

interface FollowUp {
  id: string;
  customerId: string;
  reason: string | null;
  scheduledAt: string;
  status: string;
}

interface Customer {
  id: string;
  name: string | null;
}

export default function FollowUpsPage() {
  const { pageId } = usePage();
  const [rows, setRows] = useState<FollowUp[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [form, setForm] = useState({ customerId: "", scheduledAt: "", reason: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = () => {
    if (!pageId) return;
    setLoading(true);
    Promise.all([
      api<FollowUp[]>(`/api/follow-ups?pageId=${pageId}`),
      api<Customer[]>(`/api/customers?pageId=${pageId}`),
    ])
      .then(([fus, custs]) => {
        setRows(fus);
        setCustomers(custs);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [pageId]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!form.customerId || !form.scheduledAt) return;
    setSaving(true);
    try {
      await api("/api/follow-ups", {
        method: "POST",
        body: JSON.stringify({
          pageId,
          customerId: form.customerId,
          scheduledAt: new Date(form.scheduledAt).toISOString(),
          reason: form.reason || null,
        }),
      });
      setForm({ customerId: "", scheduledAt: "", reason: "" });
      load();
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(fu: FollowUp, status: string) {
    await api(`/api/follow-ups/${fu.id}`, { method: "PATCH", body: JSON.stringify({ status }) });
    load();
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <p className="mb-4 font-display text-base font-semibold text-ink">Schedule a follow-up</p>
        <form onSubmit={add} className="grid gap-3 md:grid-cols-3">
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
          <Field label="Follow-up time">
            <Input type="datetime-local" required value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} />
          </Field>
          <Field label="Reason">
            <Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Customer said later" />
          </Field>
          <div className="md:col-span-3">
            <Button type="submit" disabled={saving}>
              {saving ? "Scheduling…" : "Schedule follow-up"}
            </Button>
          </div>
        </form>
      </Card>

      {loading ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <EmptyState title="No follow-ups scheduled." />
      ) : (
        <Table head={["Customer", "Reason", "Scheduled", "Status", ""]}>
          {rows.map((fu) => {
            const customer = customers.find((c) => c.id === fu.customerId);
            return (
              <tr key={fu.id} className="hover:bg-paper">
                <td className="px-4 py-3 font-medium text-ink">{customer?.name ?? "Unknown"}</td>
                <td className="px-4 py-3 text-sm text-mute">{fu.reason ?? "—"}</td>
                <td className="px-4 py-3 text-sm text-ink">{new Date(fu.scheduledAt).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <Badge tone={statusTone(fu.status)}>{fu.status}</Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    {fu.status === "scheduled" && (
                      <>
                        <Button variant="ghost" className="py-1.5 text-xs" onClick={() => setStatus(fu, "sent")}>
                          Mark sent
                        </Button>
                        <Button variant="ghost" className="py-1.5 text-xs" onClick={() => setStatus(fu, "cancelled")}>
                          Cancel
                        </Button>
                      </>
                    )}
                    {fu.status === "sent" && (
                      <Button variant="ghost" className="py-1.5 text-xs" onClick={() => setStatus(fu, "completed")}>
                        Mark completed
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </Table>
      )}
    </div>
  );
}
