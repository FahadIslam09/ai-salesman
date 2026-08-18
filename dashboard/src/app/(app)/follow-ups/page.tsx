"use client";

import { useCallback, useEffect, useState } from "react";
import { API, api, fmtDateTimeDhaka } from "@/lib/api";
import { usePage } from "@/components/PageProvider";
import { Badge, Button, EmptyState, Field, Input, Select, Spinner, Stat, Table, statusTone } from "@/lib/ui";

interface FollowUp {
  id: string;
  customerId: string;
  customerName: string | null;
  reason: string | null;
  scheduledAt: string;
  status: string;
}

interface Customer {
  id: string;
  name: string | null;
}

interface FollowUpStats {
  scheduled: number;
  due: number;
  sent: number;
  completed: number;
}

const STATUSES = ["scheduled", "sent", "replied", "completed", "cancelled"];

export default function FollowUpsPage() {
  const { pageId } = usePage();
  const [rows, setRows] = useState<FollowUp[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<FollowUpStats | null>(null);
  const [status, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ customerId: "", scheduledAt: "", reason: "" });

  const load = useCallback(() => {
    if (!pageId) return;
    setLoading(true);
    const params = new URLSearchParams({ pageId });
    if (status) params.set("status", status);
    Promise.all([
      api<FollowUp[]>(`/api/follow-ups?${params}`),
      api<Customer[]>(`/api/customers?pageId=${pageId}`),
      api<FollowUpStats>(`/api/follow-ups/stats?pageId=${pageId}`),
    ])
      .then(([fus, custs, st]) => {
        setRows(fus);
        setCustomers(custs);
        setStats(st);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [pageId, status]);

  useEffect(() => {
    load();
  }, [load]);

  // Real-time: refresh when a follow-up is scheduled, sent, or updated.
  useEffect(() => {
    if (!pageId) return;
    const es = new EventSource(`${API}/api/events?pageId=${pageId}`, { withCredentials: true });
    es.onmessage = () => load();
    return () => es.close();
  }, [pageId, load]);

  async function schedule(e: React.FormEvent) {
    e.preventDefault();
    if (!form.customerId || !form.scheduledAt) return;
    setSaving(true);
    setError("");
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
      setModalOpen(false);
      setForm({ customerId: "", scheduledAt: "", reason: "" });
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(fu: FollowUp, newStatus: string) {
    await api(`/api/follow-ups/${fu.id}`, { method: "PATCH", body: JSON.stringify({ status: newStatus }) });
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-mute">Live follow-up overview for this page</p>
        <Button onClick={() => setModalOpen(true)}>Schedule follow-up</Button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Scheduled" value={stats?.scheduled ?? 0} />
        <Stat label="Due now" value={stats?.due ?? 0} sub={stats?.due ? "ready to send" : "nothing due"} />
        <Stat label="Sent" value={stats?.sent ?? 0} />
        <Stat label="Completed" value={stats?.completed ?? 0} />
      </div>

      <div className="flex gap-3">
        <Select
          sizeVariant="md"
          value={status}
          onChange={(e) => setStatusFilter(e.target.value)}
          wrapperClassName="max-w-[180px]"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replaceAll("_", " ")}
            </option>
          ))}
        </Select>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {loading ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <EmptyState title="No follow-ups. They appear here when the AI schedules one, or you can schedule one manually." />
      ) : (
        <Table head={["Customer", "Reason", "Scheduled", "Status", ""]}>
          {rows.map((fu) => (
            <tr key={fu.id} className="hover:bg-paper">
              <td className="px-4 py-3 font-medium text-ink">{fu.customerName ?? "Unknown"}</td>
              <td className="px-4 py-3 text-sm text-mute">{fu.reason ?? "—"}</td>
              <td className="px-4 py-3 text-sm text-ink">{fmtDateTimeDhaka(fu.scheduledAt)}</td>
              <td className="px-4 py-3">
                <Badge tone={statusTone(fu.status)}>{fu.status.replaceAll("_", " ")}</Badge>
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
          ))}
        </Table>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setModalOpen(false)}>
          <div className="w-full max-w-md rounded-xl border border-line bg-surface p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="font-display text-base font-semibold text-ink">Schedule a follow-up</p>
              <button onClick={() => setModalOpen(false)} className="text-sm text-mute hover:text-ink">
                Close
              </button>
            </div>

            <form onSubmit={schedule} className="mt-4 space-y-3">
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
              <Field label="Reason (optional)">
                <Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Customer said later" />
              </Field>

              {error && <p className="text-sm text-danger">{error}</p>}

              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? "Scheduling…" : "Schedule follow-up"}
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
