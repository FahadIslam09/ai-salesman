"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, timeAgo } from "@/lib/api";
import { usePage } from "@/components/PageProvider";
import { Badge, Card, EmptyState, Spinner, Stat, statusTone } from "@/lib/ui";

interface OverviewData {
  credits: { credits: number; totalPurchased: number; totalUsed: number };
  totalConversations: number;
  conversationsToday: number;
  newCustomersToday: number;
  followUpsDue: number;
  totalSales: number;
  attentionRequired: Array<{
    id: string;
    customerName: string | null;
    status: string;
    attentionReason: string | null;
    lastMessageAt: string;
  }>;
}

interface Conversation {
  id: string;
  customerName: string | null;
  status: string;
  handledBy: string;
  attentionReason: string | null;
  lastMessageAt: string;
}

export default function OverviewPage() {
  const { pageId } = usePage();
  const [data, setData] = useState<OverviewData | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!pageId) return;
    setData(null);
    setError("");
    Promise.all([
      api<OverviewData>(`/api/overview?pageId=${pageId}`),
      api<Conversation[]>(`/api/conversations?pageId=${pageId}`),
    ])
      .then(([overview, convs]) => {
        setData(overview);
        setConversations(convs);
      })
      .catch((e) => setError(e.message));
  }, [pageId]);

  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (!data) return <Spinner />;

  const interested = conversations.filter((c) => c.status === "interested" || c.status === "negotiating").length;

  const funnel = [
    { label: "Customers", count: conversations.length, href: "/customers" },
    { label: "Conversations", count: data.totalConversations, href: "/inbox" },
    { label: "Leads", count: interested, href: "/customers" },
    { label: "Follow-ups", count: data.followUpsDue, href: "/follow-ups" },
    { label: "Sales", count: data.totalSales, href: "/sales" },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="AI Credits" value={data.credits.credits.toLocaleString("en-IN")} sub="remaining" />
        <Stat label="Conversations today" value={data.conversationsToday} />
        <Stat label="New customers today" value={data.newCustomersToday} />
        <Stat label="Total sales" value={data.totalSales} />
      </div>

      <Card className="p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-mute">Sales funnel</p>
        <div className="mt-4 flex items-center gap-0 overflow-x-auto">
          {funnel.map((stage, i) => (
            <div key={stage.label} className="flex min-w-0 flex-1 items-center">
              <div className={`min-w-[110px] rounded-xl px-4 py-3 ${i === funnel.length - 1 ? "bg-leaf text-white" : "bg-leaf-soft"}`}>
                <p className="font-display text-2xl font-semibold">{stage.count}</p>
                <p className={`text-xs ${i === funnel.length - 1 ? "text-leaf-soft" : "text-mute"}`}>{stage.label}</p>
              </div>
              {i < funnel.length - 1 && <div className="mx-1 h-px flex-1 bg-line" />}
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 font-display text-base font-semibold text-ink">Attention required</h2>
          {data.attentionRequired.length === 0 ? (
            <EmptyState title="Nothing needs your attention right now." />
          ) : (
            <Card className="divide-y divide-line">
              {data.attentionRequired.map((item) => (
                <Link key={item.id} href={`/inbox/${item.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-paper">
                  <div>
                    <p className="text-sm font-medium text-ink">{item.customerName ?? "Unknown"}</p>
                    <p className="text-xs text-mute">{item.attentionReason?.replaceAll("_", " ")}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={statusTone(item.status)}>{item.status}</Badge>
                    <span className="text-xs text-mute">{timeAgo(item.lastMessageAt)}</span>
                  </div>
                </Link>
              ))}
            </Card>
          )}
        </section>

        <section>
          <h2 className="mb-3 font-display text-base font-semibold text-ink">Recent conversations</h2>
          {conversations.length === 0 ? (
            <EmptyState title="No conversations yet. Messages from your page will appear here." />
          ) : (
            <Card className="divide-y divide-line">
              {conversations.slice(0, 8).map((c) => (
                <Link key={c.id} href={`/inbox/${c.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-paper">
                  <div>
                    <p className="text-sm font-medium text-ink">{c.customerName ?? "Unknown"}</p>
                    <p className="text-xs text-mute">
                      {c.handledBy === "human" ? "Human handling" : "AI handling"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={statusTone(c.status)}>{c.status}</Badge>
                    <span className="text-xs text-mute">{timeAgo(c.lastMessageAt)}</span>
                  </div>
                </Link>
              ))}
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}
