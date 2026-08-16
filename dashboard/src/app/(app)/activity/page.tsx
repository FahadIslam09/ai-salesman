"use client";

import { useCallback, useEffect, useState } from "react";
import { API, api, timeAgo } from "@/lib/api";
import { usePage } from "@/components/PageProvider";
import { Badge, EmptyState, Spinner, Stat, Table } from "@/lib/ui";

interface Usage {
  id: string;
  kind: string;
  tokensIn: number | null;
  tokensOut: number | null;
  creditsDeducted: number | null;
  createdAt: string;
}

interface UsageStats {
  calls: number;
  tokensIn: number;
  tokensOut: number;
  credits: number;
}

const KIND_META: Record<string, { label: string; tone: string }> = {
  inbox_reply: { label: "Inbox reply", tone: "green" },
  comment_reply: { label: "Comment reply", tone: "blue" },
  follow_up: { label: "Follow-up", tone: "amber" },
  voice_transcription: { label: "Voice transcription", tone: "blue" },
  summarization: { label: "Summarization", tone: "gray" },
  order_extraction: { label: "Order extraction", tone: "amber" },
};

function kindMeta(kind: string) {
  return KIND_META[kind] ?? { label: kind.replaceAll("_", " "), tone: "gray" };
}

export default function ActivityPage() {
  const { pageId } = usePage();
  const [rows, setRows] = useState<Usage[]>([]);
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!pageId) return;
    setLoading(true);
    Promise.all([
      api<Usage[]>(`/api/credits/usage?pageId=${pageId}`),
      api<UsageStats>(`/api/credits/usage/stats?pageId=${pageId}`),
    ])
      .then(([usage, s]) => {
        setRows(usage);
        setStats(s);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [pageId]);

  useEffect(() => {
    load();
  }, [load]);

  // Real-time: refresh whenever any AI action happens on this page.
  useEffect(() => {
    if (!pageId) return;
    const es = new EventSource(`${API}/api/events?pageId=${pageId}`, { withCredentials: true });
    es.onmessage = () => load();
    return () => es.close();
  }, [pageId, load]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="AI calls" value={stats?.calls ?? 0} />
        <Stat label="Tokens in" value={(stats?.tokensIn ?? 0).toLocaleString("en-IN")} />
        <Stat label="Tokens out" value={(stats?.tokensOut ?? 0).toLocaleString("en-IN")} />
        <Stat label="Credits used" value={stats?.credits ?? 0} />
      </div>

      {loading ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <EmptyState title="No AI activity yet. Replies, voice transcription, summaries, and order extraction will appear here." />
      ) : (
        <Table head={["Action", "Tokens in", "Tokens out", "Credits", "When"]}>
          {rows.map((r) => {
            const meta = kindMeta(r.kind);
            const credits = r.creditsDeducted != null && r.creditsDeducted !== 0 ? `-${r.creditsDeducted}` : "—";
            return (
              <tr key={r.id} className="hover:bg-paper">
                <td className="px-4 py-3">
                  <Badge tone={meta.tone}>{meta.label}</Badge>
                </td>
                <td className="px-4 py-3 text-sm text-ink">{r.tokensIn ?? 0}</td>
                <td className="px-4 py-3 text-sm text-ink">{r.tokensOut ?? 0}</td>
                <td className="px-4 py-3 text-sm text-ink">{credits}</td>
                <td className="px-4 py-3 text-xs text-mute">{timeAgo(r.createdAt)}</td>
              </tr>
            );
          })}
        </Table>
      )}
    </div>
  );
}
