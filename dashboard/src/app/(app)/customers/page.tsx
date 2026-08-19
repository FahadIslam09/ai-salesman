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
  profilePicUrl?: string | null;
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
        <>
          {/* Desktop Table View (>= 768px) */}
          <div className="hidden md:block">
            <Table head={["Customer", "Status", "Tags", "First seen", "Last active"]}>
              {rows.map((c) => (
                <tr key={c.id} className="hover:bg-paper">
                  <td className="px-4 py-3">
                    <Link href={`/customers/${c.id}`} className="flex items-center gap-3 group">
                      {c.profilePicUrl ? (
                        <img
                          src={c.profilePicUrl}
                          alt={c.name ?? "Customer"}
                          className="h-8 w-8 rounded-full object-cover border border-[#E2E8F0]"
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-leaf-soft text-xs font-bold text-leaf">
                          {(c.name ?? "U")[0]?.toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-ink group-hover:text-leaf transition-colors">
                          {c.name ?? "Unknown Customer"}
                        </div>
                        <div className="font-mono text-[11px] text-[#94A3B8]">PSID: {c.psid}</div>
                      </div>
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
          </div>

          {/* Mobile Card List View (< 768px) */}
          <Card className="divide-y divide-[#E5E7EB] md:hidden">
            {rows.map((c) => (
              <Link key={c.id} href={`/customers/${c.id}`} className="block p-4 space-y-2 hover:bg-[#FAFCFB] transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {c.profilePicUrl ? (
                      <img
                        src={c.profilePicUrl}
                        alt={c.name ?? "Customer"}
                        className="h-8 w-8 rounded-full object-cover border border-[#E2E8F0]"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-leaf-soft text-xs font-bold text-leaf">
                        {(c.name ?? "U")[0]?.toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="font-semibold text-sm text-[#172033]">
                        {c.name ?? "Unknown Customer"}
                      </div>
                      <div className="font-mono text-[11px] text-[#64748B]">PSID: {c.psid}</div>
                    </div>
                  </div>

                  <Badge tone={statusTone(c.status)}>{c.status}</Badge>
                </div>

                {c.tags && c.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {c.tags.map((t) => (
                      <Badge key={t}>{t}</Badge>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between pt-1 text-[11px] text-[#64748B]">
                  <span>First seen: {timeAgo(c.firstSeenAt)}</span>
                  <span>Active: {timeAgo(c.lastActiveAt)}</span>
                </div>
              </Link>
            ))}
          </Card>
        </>
      )}
    </div>
  );
}
