"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, timeAgo } from "@/lib/api";
import { usePage } from "@/components/PageProvider";
import { Badge, Card, EmptyState, Input, Spinner, Table, statusTone } from "@/lib/ui";

interface Customer {
  id: string;
  name: string | null;
  psid: string;
  status: string;
  tags: string[] | null;
  lastActiveAt: string;
  firstSeenAt: string;
}

export default function CustomersPage() {
  const { pageId } = usePage();
  const [rows, setRows] = useState<Customer[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!pageId) return;
    setLoading(true);
    const params = new URLSearchParams({ pageId });
    if (q) params.set("q", q);
    api<Customer[]>(`/api/customers?${params}`)
      .then(setRows)
      .finally(() => setLoading(false));
  }, [pageId, q]);

  return (
    <div className="space-y-4">
      <Input placeholder="Search name or PSID…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
      {loading ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <EmptyState title="No customers yet." />
      ) : (
        <Table head={["Name", "Status", "Tags", "First seen", "Last active"]}>
          {rows.map((c) => (
            <tr key={c.id} className="hover:bg-paper">
              <td className="px-4 py-3">
                <Link href={`/customers/${c.id}`} className="font-medium text-ink hover:text-leaf">
                  {c.name ?? "Unknown"}
                </Link>
              </td>
              <td className="px-4 py-3">
                <Badge tone={statusTone(c.status)}>{c.status}</Badge>
              </td>
              <td className="px-4 py-3">{(c.tags ?? []).map((t) => <Badge key={t}>{t}</Badge>)}</td>
              <td className="px-4 py-3 text-mute">{timeAgo(c.firstSeenAt)}</td>
              <td className="px-4 py-3 text-mute">{timeAgo(c.lastActiveAt)}</td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
