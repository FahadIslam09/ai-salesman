"use client";

import { useEffect, useState } from "react";
import { api, timeAgo } from "@/lib/api";
import { Badge, Card, EmptyState, Spinner, Table } from "@/lib/ui";

interface Usage {
  id: string;
  kind: string;
  tokensIn: number | null;
  tokensOut: number | null;
  creditsDeducted: number | null;
  createdAt: string;
}

export default function ActivityPage() {
  const [rows, setRows] = useState<Usage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<Usage[]>("/api/credits/usage")
      .then(setRows)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      {rows.length === 0 ? (
        <EmptyState title="No AI activity yet. Replies, comment replies and follow-ups will show up here." />
      ) : (
        <Table head={["Action", "Tokens in", "Tokens out", "Credits", "When"]}>
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-paper">
              <td className="px-4 py-3">
                <Badge tone={r.kind === "inbox_reply" ? "green" : r.kind === "comment_reply" ? "blue" : "amber"}>
                  {r.kind.replaceAll("_", " ")}
                </Badge>
              </td>
              <td className="px-4 py-3 text-sm text-ink">{r.tokensIn ?? "—"}</td>
              <td className="px-4 py-3 text-sm text-ink">{r.tokensOut ?? "—"}</td>
              <td className="px-4 py-3 text-sm text-ink">-{r.creditsDeducted ?? 0}</td>
              <td className="px-4 py-3 text-sm text-mute">{timeAgo(r.createdAt)}</td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
