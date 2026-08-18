"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, fmtTaka, timeAgo } from "@/lib/api";
import { Badge, Button, Card, Field, Input, Select, Spinner, TextArea, statusTone } from "@/lib/ui";

interface CustomerDetail {
  id: string;
  name: string | null;
  psid: string;
  status: string;
  tags: string[] | null;
  notes: string | null;
  firstSeenAt: string;
  lastActiveAt: string;
  conversations: Array<{ id: string; status: string; lastMessageAt: string }>;
  sales: Array<{ id: string; amount: number; createdAt: string; source: string }>;
}

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [tags, setTags] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("");

  const load = useCallback(() => {
    api<CustomerDetail>(`/api/customers/${id}`).then((c) => {
      setCustomer(c);
      setTags((c.tags ?? []).join(", "));
      setNotes(c.notes ?? "");
      setStatus(c.status);
    });
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (!customer) return <Spinner />;

  async function save() {
    await api(`/api/customers/${customer!.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        notes,
        status,
      }),
    });
    load();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="space-y-4 p-6 lg:col-span-1">
        <div>
          <p className="font-display text-xl font-semibold text-ink">{customer.name ?? "Unknown customer"}</p>
          <p className="text-xs text-mute">
            PSID {customer.psid} · first seen {timeAgo(customer.firstSeenAt)}
          </p>
        </div>
        <div className="space-y-3">
          <Field label="Status">
            <Select
              sizeVariant="md"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {["new", "interested", "negotiating", "purchased", "not_interested"].map((s) => (
                <option key={s} value={s}>
                  {s.replaceAll("_", " ")}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Tags (comma separated)">
            <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="VIP, Hot Lead" />
          </Field>
          <Field label="Internal notes">
            <TextArea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes only you can see…" />
          </Field>
          <Button onClick={save} className="w-full">
            Save changes
          </Button>
        </div>
      </Card>

      <div className="space-y-6 lg:col-span-2">
        <section>
          <h2 className="mb-3 font-display text-base font-semibold text-ink">Purchases</h2>
          <Card className="divide-y divide-line">
            {customer.sales.length === 0 ? (
              <p className="p-4 text-sm text-mute">No sales recorded for this customer.</p>
            ) : (
              customer.sales.map((s) => (
                <div key={s.id} className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-ink">{s.source.replaceAll("_", " ")}</span>
                  <span className="flex items-center gap-3">
                    <span className="text-xs text-mute">{timeAgo(s.createdAt)}</span>
                    <span className="font-display font-semibold text-leaf">{fmtTaka(s.amount)}</span>
                  </span>
                </div>
              ))
            )}
          </Card>
        </section>
        <section>
          <h2 className="mb-3 font-display text-base font-semibold text-ink">Conversations</h2>
          <Card className="divide-y divide-line">
            {customer.conversations.map((c) => (
              <a key={c.id} href={`/inbox/${c.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-paper">
                <span className="text-sm font-medium text-ink">Conversation</span>
                <span className="flex items-center gap-3">
                  <Badge tone={statusTone(c.status)}>{c.status}</Badge>
                  <span className="text-xs text-mute">{timeAgo(c.lastMessageAt)}</span>
                </span>
              </a>
            ))}
          </Card>
        </section>
      </div>
    </div>
  );
}
