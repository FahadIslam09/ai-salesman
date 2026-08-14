"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, timeAgo } from "@/lib/api";
import { usePage } from "@/components/PageProvider";
import { Badge, Card, EmptyState, Spinner } from "@/lib/ui";

interface Balance {
  credits: number;
  level: string;
}

interface Attention {
  id: string;
  customerName: string | null;
  attentionReason: string | null;
  lastMessageAt: string;
}

export default function NotificationsPage() {
  const { pageId } = usePage();
  const [balance, setBalance] = useState<Balance | null>(null);
  const [attention, setAttention] = useState<Attention[]>([]);

  useEffect(() => {
    api<Balance>("/api/credits/balance").then(setBalance).catch(() => {});
    if (pageId) {
      api<{ attentionRequired: Attention[] }>(`/api/overview?pageId=${pageId}`)
        .then((o) => setAttention(o.attentionRequired))
        .catch(() => {});
    }
  }, [pageId]);

  if (!balance) return <Spinner />;

  const items = [
    ...(balance.level !== "ok"
      ? [
          {
            key: "credit",
            title: balance.level === "zero" ? "AI Credits exhausted" : "AI Credits running low",
            detail:
              balance.level === "zero"
                ? "The AI has paused replying. Recharge to resume."
                : `Only ${balance.credits.toLocaleString("en-IN")} credits left. Recharge soon to keep your AI selling.`,
            href: "/credits",
            tone: balance.level === "zero" ? "red" : "amber",
          },
        ]
      : []),
    ...attention.map((a) => ({
      key: a.id,
      title: `${a.customerName ?? "A customer"} needs attention`,
      detail: a.attentionReason?.replaceAll("_", " ") ?? "Needs your review",
      href: `/inbox/${a.id}`,
      tone: "blue",
    })),
  ];

  return (
    <div className="max-w-2xl space-y-4">
      {items.length === 0 ? (
        <EmptyState title="All clear. No notifications right now." />
      ) : (
        items.map((item) => (
          <Link key={item.key} href={item.href}>
            <Card className="flex items-center justify-between px-5 py-4 transition-colors hover:bg-paper">
              <div>
                <p className="text-sm font-medium text-ink">{item.title}</p>
                <p className="mt-0.5 text-xs text-mute">{item.detail}</p>
              </div>
              <Badge tone={item.tone}>{item.tone === "red" ? "Critical" : item.tone === "amber" ? "Low" : "Review"}</Badge>
            </Card>
          </Link>
        ))
      )}
      <p className="pt-4 text-xs text-mute">
        Notifications appear when credits run low, the AI needs an answer, or a conversation needs your attention.
      </p>
    </div>
  );
}
