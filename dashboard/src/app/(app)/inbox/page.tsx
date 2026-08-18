"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, timeAgo } from "@/lib/api";
import { usePage } from "@/components/PageProvider";
import { Badge, Card, EmptyState, Input, Select, Spinner, statusTone } from "@/lib/ui";

interface Conversation {
  id: string;
  customerName: string | null;
  status: string;
  handledBy: string;
  attentionReason: string | null;
  lastMessageAt: string;
}

export default function InboxPage() {
  const { pageId } = usePage();
  const [rows, setRows] = useState<Conversation[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!pageId) return;
    setLoading(true);
    const params = new URLSearchParams({ pageId });
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    api<Conversation[]>(`/api/conversations?${params}`)
      .then(setRows)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [pageId, q, status]);

  if (error) return <p className="text-sm text-danger">{error}</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <Input placeholder="Search name or PSID…" value={q} onChange={(e) => setQ(e.target.value)} className="w-full sm:max-w-xs" />
        <Select sizeVariant="md" value={status} onChange={(e) => setStatus(e.target.value)} wrapperClassName="w-full sm:max-w-[180px]">
          <option value="">All statuses</option>
          <option value="new">New</option>
          <option value="interested">Interested</option>
          <option value="negotiating">Negotiating</option>
          <option value="follow_up">Follow-up</option>
          <option value="purchased">Purchased</option>
          <option value="not_interested">Not interested</option>
        </Select>
      </div>

      {loading ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <EmptyState title="No conversations found." />
      ) : (
        <Card className="divide-y divide-line">
          {rows.map((c) => (
            <Link key={c.id} href={`/inbox/${c.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-paper">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-leaf-soft text-sm font-semibold text-leaf">
                  {(c.customerName ?? "?")[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-ink">{c.customerName ?? "Unknown"}</p>
                  <p className="text-xs text-mute">
                    {c.handledBy === "human" ? "Human handling" : "AI handling"}
                    {c.attentionReason ? ` · ${c.attentionReason.replaceAll("_", " ")}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={statusTone(c.status)}>{c.status}</Badge>
                <span className="w-16 text-right text-xs text-mute">{timeAgo(c.lastMessageAt)}</span>
              </div>
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}
