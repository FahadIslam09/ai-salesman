"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Card, Spinner } from "@/lib/ui";
import {
  IconUsers,
  IconStore,
  IconCoins,
  IconSparkles,
  IconTrendingUp,
  IconShoppingBag,
  IconServer,
  IconChevronRight,
  IconActivity,
  IconShield,
  IconLayers,
  IconCheck,
} from "@/components/Icons";

interface OverviewData {
  kpis: {
    totalUsers: number;
    newUsersToday: number;
    newUsersMonth: number;
    bannedUsers: number;
    totalBusinesses: number;
    totalPages: number;
    activeBots: number;
    totalOrders: number;
    totalOrdersAmount: number;
    totalRevenueBdt: number;
    revenueToday: number;
    totalAiRequests: number;
    totalTokensIn: number;
    totalTokensOut: number;
    credits: {
      inCirculation: number;
      purchased: number;
      used: number;
    };
    arbitrage: {
      apiCostUsd: number;
      billableUsd: number;
      grossProfitUsd: number;
      profitMarginPct: number;
    };
  };
  recentActivity: Array<{
    id: string;
    kind: string;
    model: string;
    userName: string;
    pageName: string;
    tokensIn: number;
    tokensOut: number;
    creditsUsed: number;
    createdAt: string;
  }>;
  health: {
    api: string;
    database: string;
    openRouter: string;
    gemini: string;
    deepSeek: string;
    facebookGraph: string;
    webhooks: string;
    uptimeSeconds: number;
  };
}

function timeAgo(dateStr: string) {
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDays = Math.floor(diffHr / 24);
    return `${diffDays}d ago`;
  } catch {
    return "just now";
  }
}

export default function AdminOverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    api<OverviewData>("/api/admin/overview")
      .then(setData)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  if (loading || !data) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const { kpis, recentActivity, health } = data;

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#0F172A] tracking-tight">
            Platform Command Center
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Real-time platform metrics, tenant activity, AI token economics, and system health.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-xl border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs text-[#334155] shadow-2xs">
            <span className="h-2 w-2 rounded-full bg-[#10B981]" />
            <span className="font-medium text-[11px]">Database: {health.database}</span>
          </div>
          <button
            type="button"
            onClick={load}
            className="flex items-center gap-1 rounded-xl bg-[#087F5B] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-[#066B4D] transition-colors"
          >
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Grid (6 Cards) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {/* Card 1: Total Users */}
        <Card className="p-4.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
              Total Users
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E8F5EF] text-[#087F5B]">
              <IconUsers size={16} />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold tracking-tight text-[#0F172A]">
              {kpis.totalUsers}
            </div>
            <div className="mt-1 text-[11px] text-[#10B981] font-semibold">
              +{kpis.newUsersToday} new today
            </div>
          </div>
        </Card>

        {/* Card 2: Active Businesses */}
        <Card className="p-4.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
              Businesses
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E8F5EF] text-[#087F5B]">
              <IconStore size={16} />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold tracking-tight text-[#0F172A]">
              {kpis.totalBusinesses}
            </div>
            <div className="mt-1 text-[11px] text-[#64748B]">
              {kpis.activeBots} active bots
            </div>
          </div>
        </Card>

        {/* Card 3: Total Revenue */}
        <Card className="p-4.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
              Total Revenue
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E8F5EF] text-[#087F5B]">
              <IconCoins size={16} />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold tracking-tight text-[#0F172A]">
              ৳{kpis.totalRevenueBdt.toLocaleString()}
            </div>
            <div className="mt-1 text-[11px] text-[#10B981] font-semibold">
              ৳{kpis.revenueToday.toLocaleString()} today
            </div>
          </div>
        </Card>

        {/* Card 4: AI Credits Used */}
        <Card className="p-4.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
              Credits Used
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E8F5EF] text-[#087F5B]">
              <IconSparkles size={16} />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold tracking-tight text-[#0F172A]">
              {Math.round(kpis.credits.used).toLocaleString()}
            </div>
            <div className="mt-1 text-[11px] text-[#64748B]">
              {Math.round(kpis.credits.inCirculation).toLocaleString()} available
            </div>
          </div>
        </Card>

        {/* Card 5: AI Profit Margin */}
        <Card className="p-4.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
              Gross Margin
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E8F5EF] text-[#087F5B]">
              <IconTrendingUp size={16} />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold tracking-tight text-[#087F5B]">
              {kpis.arbitrage.profitMarginPct}%
            </div>
            <div className="mt-1 text-[11px] text-[#64748B]">
              API Cost: ${kpis.arbitrage.apiCostUsd}
            </div>
          </div>
        </Card>

        {/* Card 6: System Health */}
        <Card className="p-4.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
              System Status
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E8F5EF] text-[#087F5B]">
              <IconServer size={16} />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-base font-bold tracking-tight text-[#10B981] flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#10B981]" />
              <span>Healthy</span>
            </div>
            <div className="mt-1 text-[11px] text-[#64748B]">
              All 7 services 100%
            </div>
          </div>
        </Card>
      </div>

      {/* Middle Grid: Token Economics & System Status Overview */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: AI Token Economics (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="p-5">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
              <div>
                <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
                  <IconSparkles size={16} className="text-[#087F5B]" />
                  <span>Platform AI Token Economics</span>
                </h3>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Aggregate prompt and completion tokens processed across all stores
                </p>
              </div>

              <Link
                href="/admin/ai-usage"
                className="text-xs font-semibold text-[#087F5B] hover:underline"
              >
                Detailed token audit →
              </Link>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-[#E2E8F0] bg-[#FAFBFB] p-3.5">
                <span className="text-xs font-medium text-[#64748B]">Total AI Invocations</span>
                <div className="mt-1 font-mono text-xl font-bold text-[#0F172A]">
                  {kpis.totalAiRequests.toLocaleString()}
                </div>
                <p className="text-[10px] text-[#94A3B8] mt-0.5">Chat, Intent, Summaries</p>
              </div>

              <div className="rounded-xl border border-[#E2E8F0] bg-[#FAFBFB] p-3.5">
                <span className="text-xs font-medium text-[#64748B]">Input Tokens (Prompts)</span>
                <div className="mt-1 font-mono text-xl font-bold text-[#087F5B]">
                  {kpis.totalTokensIn.toLocaleString()}
                </div>
                <p className="text-[10px] text-[#94A3B8] mt-0.5">Customer queries + context</p>
              </div>

              <div className="rounded-xl border border-[#E2E8F0] bg-[#FAFBFB] p-3.5">
                <span className="text-xs font-medium text-[#64748B]">Output Tokens (Replies)</span>
                <div className="mt-1 font-mono text-xl font-bold text-[#2563EB]">
                  {kpis.totalTokensOut.toLocaleString()}
                </div>
                <p className="text-[10px] text-[#94A3B8] mt-0.5">Generated sales closer replies</p>
              </div>
            </div>

            {/* Arbitrage summary bar */}
            <div className="mt-4 flex flex-col sm:flex-row items-center justify-between rounded-xl bg-[#E8F5EF] p-4 text-xs">
              <div>
                <span className="font-bold text-[#087F5B]">AI Profit Arbitrage:</span>{" "}
                <span className="text-[#334155]">
                  Real API Cost (${kpis.arbitrage.apiCostUsd}) vs Customer Billed (${kpis.arbitrage.billableUsd})
                </span>
              </div>
              <span className="font-bold text-[#087F5B] mt-1 sm:mt-0">
                Gross Profit: ${kpis.arbitrage.grossProfitUsd} ({kpis.arbitrage.profitMarginPct}%)
              </span>
            </div>
          </Card>

          {/* Store Commerce Impact */}
          <Card className="p-5">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
              <div>
                <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
                  <IconShoppingBag size={16} className="text-[#087F5B]" />
                  <span>Store Commerce Impact</span>
                </h3>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Total store orders closed autonomously by AI sales agents
                </p>
              </div>

              <Link
                href="/admin/businesses"
                className="text-xs font-semibold text-[#087F5B] hover:underline"
              >
                View all businesses →
              </Link>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-[#E2E8F0] bg-[#FAFBFB] p-3.5">
                <span className="text-xs font-medium text-[#64748B]">Total Orders Closed</span>
                <div className="mt-1 font-mono text-xl font-bold text-[#0F172A]">
                  {kpis.totalOrders.toLocaleString()}
                </div>
              </div>

              <div className="rounded-xl border border-[#E2E8F0] bg-[#FAFBFB] p-3.5">
                <span className="text-xs font-medium text-[#64748B]">Total Order Value (GMV)</span>
                <div className="mt-1 font-mono text-xl font-bold text-[#087F5B]">
                  ৳{kpis.totalOrdersAmount.toLocaleString()}
                </div>
              </div>

              <div className="rounded-xl border border-[#E2E8F0] bg-[#FAFBFB] p-3.5">
                <span className="text-xs font-medium text-[#64748B]">Active Facebook Stores</span>
                <div className="mt-1 font-mono text-xl font-bold text-[#0F172A]">
                  {kpis.totalPages}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: System Health Status (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="p-5">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3.5">
              <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
                <IconServer size={16} className="text-[#087F5B]" />
                <span>System Health</span>
              </h3>
              <Link href="/admin/system-health" className="text-xs font-semibold text-[#087F5B] hover:underline">
                Full health →
              </Link>
            </div>

            <div className="mt-3.5 space-y-2.5">
              <div className="flex items-center justify-between rounded-xl bg-[#FAFBFB] p-2.5 border border-[#E2E8F0]">
                <span className="text-xs font-medium text-[#334155]">SaaS API Engine</span>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#10B981]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                  Operational
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-[#FAFBFB] p-2.5 border border-[#E2E8F0]">
                <span className="text-xs font-medium text-[#334155]">Neon PostgreSQL</span>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#10B981]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                  Operational
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-[#FAFBFB] p-2.5 border border-[#E2E8F0]">
                <span className="text-xs font-medium text-[#334155]">OpenRouter (Luna)</span>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#10B981]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                  Operational
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-[#FAFBFB] p-2.5 border border-[#E2E8F0]">
                <span className="text-xs font-medium text-[#334155]">Google Gemini 2.5</span>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#10B981]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                  Operational
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-[#FAFBFB] p-2.5 border border-[#E2E8F0]">
                <span className="text-xs font-medium text-[#334155]">Facebook Graph API</span>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#10B981]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                  Operational
                </span>
              </div>
            </div>
          </Card>

          {/* Quick Management Shortcuts */}
          <Card className="p-5">
            <h3 className="text-sm font-bold text-[#0F172A] mb-3">Management Shortcuts</h3>
            <div className="space-y-2">
              <Link
                href="/admin/users"
                className="flex items-center justify-between rounded-xl border border-[#E2E8F0] bg-[#FAFBFB] px-3.5 py-2.5 text-xs font-semibold text-[#334155] hover:bg-[#F1F5F9] transition-colors"
              >
                <span>Manage Users & Adjust Credits</span>
                <IconChevronRight size={14} className="text-[#94A3B8]" />
              </Link>
              <Link
                href="/admin/finance"
                className="flex items-center justify-between rounded-xl border border-[#E2E8F0] bg-[#FAFBFB] px-3.5 py-2.5 text-xs font-semibold text-[#334155] hover:bg-[#F1F5F9] transition-colors"
              >
                <span>Record Offline Payment</span>
                <IconChevronRight size={14} className="text-[#94A3B8]" />
              </Link>
              <Link
                href="/admin/settings"
                className="flex items-center justify-between rounded-xl border border-[#E2E8F0] bg-[#FAFBFB] px-3.5 py-2.5 text-xs font-semibold text-[#334155] hover:bg-[#F1F5F9] transition-colors"
              >
                <span>Platform Settings & Maintenance</span>
                <IconChevronRight size={14} className="text-[#94A3B8]" />
              </Link>
            </div>
          </Card>
        </div>
      </div>

      {/* Live Platform Activity Stream */}
      <Card className="p-5">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4 mb-4">
          <div>
            <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#10B981] animate-pulse" />
              <span>Recent Platform-Wide Activity</span>
            </h3>
            <p className="text-xs text-[#64748B] mt-0.5">
              Live stream of tenant AI interactions, token usage, and automated responses
            </p>
          </div>

          <Link href="/admin/ai-usage" className="text-xs font-semibold text-[#087F5B] hover:underline">
            View all activity →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E2E8F0] text-[#64748B] uppercase text-[10px] tracking-wider font-bold">
                <th className="py-2.5 px-3">Tenant / Store</th>
                <th className="py-2.5 px-3">Task Kind</th>
                <th className="py-2.5 px-3">Model</th>
                <th className="py-2.5 px-3 text-right">Tokens (In / Out)</th>
                <th className="py-2.5 px-3 text-right">Credits Used</th>
                <th className="py-2.5 px-3 text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {recentActivity.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-[#94A3B8]">
                    No recent AI activity recorded yet.
                  </td>
                </tr>
              ) : (
                recentActivity.map((a) => (
                  <tr key={a.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-bold text-[#0F172A]">{a.userName}</div>
                      <div className="text-[11px] text-[#64748B]">{a.pageName}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-flex rounded-md bg-[#F1F5F9] px-2 py-0.5 text-[11px] font-semibold text-[#334155]">
                        {a.kind}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-[#475569]">
                      {a.model.replace("openai/", "").replace("google/", "").replace("deepseek/", "")}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-[#334155]">
                      <span className="text-[#087F5B] font-bold">{a.tokensIn}</span> /{" "}
                      <span className="text-[#2563EB] font-bold">{a.tokensOut}</span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-[#087F5B]">
                      -{a.creditsUsed.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right text-[#64748B] whitespace-nowrap">
                      {timeAgo(a.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
