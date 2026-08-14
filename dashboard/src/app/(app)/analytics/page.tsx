"use client";

import { useEffect, useState } from "react";
import { api, fmtTaka } from "@/lib/api";
import { usePage } from "@/components/PageProvider";
import { Card, Select, Spinner, Stat } from "@/lib/ui";

const PERIODS = [
  { value: "day", label: "Today" },
  { value: "week", label: "Last 7 days" },
  { value: "month", label: "Last 30 days" },
];

export default function AnalyticsPage() {
  const { pageId } = usePage();
  const [period, setPeriod] = useState("week");
  const [data, setData] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    if (!pageId) return;
    setData(null);
    const base = `/api/analytics?pageId=${pageId}&period=${period}`;
    Promise.all([
      api(`${base.replace("/api/analytics", "/api/analytics/customers")}`),
      api(`${base.replace("/api/analytics", "/api/analytics/conversations")}`),
      api(`${base.replace("/api/analytics", "/api/analytics/sales")}`),
      api(`${base.replace("/api/analytics", "/api/analytics/credits")}`),
    ])
      .then(([customers, conversations, sales, credits]) =>
        setData({ customers, conversations, sales, credits })
      )
      .catch(() => setData({}));
  }, [pageId, period]);

  if (!data) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-mute">Business and AI performance over time</p>
        <Select value={period} onChange={(e) => setPeriod(e.target.value)}>
          {PERIODS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Total customers" value={data.customers?.total ?? 0} sub={`${data.customers?.newCustomers ?? 0} new this period`} />
        <Stat label="Conversations" value={data.conversations?.conversations ?? 0} sub={`${data.conversations?.aiReplies ?? 0} AI replies`} />
        <Stat label="Sales" value={data.sales?.count ?? 0} sub={`${data.sales?.aiAssisted ?? 0} AI-assisted`} />
        <Stat label="Credits used" value={data.credits?.used ?? 0} sub={`${data.credits?.aiCalls ?? 0} AI calls`} />
      </div>

      <Card className="p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-mute">Revenue this period</p>
        <p className="mt-2 font-display text-4xl font-semibold text-leaf">{fmtTaka(data.sales?.revenue ?? 0)}</p>
        <p className="mt-1 text-xs text-mute">From {data.sales?.count ?? 0} recorded orders</p>
      </Card>

      <Card className="p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-mute">Conversion</p>
        <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-paper">
          <div
            className="h-full rounded-full bg-leaf transition-all"
            style={{
              width: `${Math.min(100, Math.round(((data.sales?.count ?? 0) / Math.max(1, data.conversations?.conversations ?? 1)) * 100))}%`,
            }}
          />
        </div>
        <p className="mt-2 text-sm text-mute">
          {Math.round(((data.sales?.count ?? 0) / Math.max(1, data.conversations?.conversations ?? 1)) * 100)}% of conversations became a sale this period
        </p>
      </Card>
    </div>
  );
}
