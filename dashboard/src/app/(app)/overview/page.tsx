"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { API, api, fmtTaka, timeAgo } from "@/lib/api";
import { usePage } from "@/components/PageProvider";
import { Badge, Button, Card, EmptyState, statusTone } from "@/lib/ui";
import {
  IconZap,
  IconMessageSquare,
  IconUserPlus,
  IconCoins,
  IconUsers,
  IconTarget,
  IconClock,
  IconPackage,
  IconCheckCircle2,
  IconAlertTriangle,
  IconAlertCircle,
  IconChevronRight,
  IconArrowRight,
  IconRefresh,
  IconSparkles,
} from "@/components/Icons";

interface OverviewData {
  credits: { credits: number; totalPurchased: number; totalUsed: number };
  totalCustomers: number;
  totalConversations: number;
  conversationsToday: number;
  newCustomersToday: number;
  followUpsDue: number;
  pendingOrders: number;
  totalSales: number;
  totalRevenue: number;
  attentionRequired: Array<{
    id: string;
    customerId?: string;
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

function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      {/* 4 Top Metric Skeletons */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-5">
            <div className="flex items-center gap-3.5">
              <div className="h-11 w-11 shrink-0 animate-pulse rounded-xl bg-line-light" />
              <div className="w-full space-y-2">
                <div className="h-3 w-20 animate-pulse rounded-md bg-line-light" />
                <div className="h-6 w-28 animate-pulse rounded-md bg-line-light" />
                <div className="h-3 w-32 animate-pulse rounded-md bg-line-light" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Funnel Skeleton */}
      <Card className="p-6">
        <div className="mb-4 h-4 w-32 animate-pulse rounded-md bg-line-light" />
        <div className="grid grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2 p-3">
              <div className="h-10 w-10 animate-pulse rounded-full bg-line-light" />
              <div className="h-5 w-12 animate-pulse rounded-md bg-line-light" />
              <div className="h-3 w-16 animate-pulse rounded-md bg-line-light" />
            </div>
          ))}
        </div>
      </Card>

      {/* 2 Secondary Metric Skeletons */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[1, 2].map((i) => (
          <Card key={i} className="p-5">
            <div className="flex items-center gap-3.5">
              <div className="h-11 w-11 shrink-0 animate-pulse rounded-xl bg-line-light" />
              <div className="w-full space-y-2">
                <div className="h-3 w-24 animate-pulse rounded-md bg-line-light" />
                <div className="h-6 w-16 animate-pulse rounded-md bg-line-light" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Bottom 2 Column Skeletons */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {[1, 2].map((i) => (
          <Card key={i} className="p-5">
            <div className="mb-4 h-4 w-36 animate-pulse rounded-md bg-line-light" />
            <div className="space-y-3">
              {[1, 2, 3].map((j) => (
                <div key={j} className="h-12 w-full animate-pulse rounded-lg bg-line-light" />
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function formatAttentionTitle(reason: string | null | undefined): string {
  if (!reason) return "Needs attention";
  switch (reason) {
    case "credit_exhausted":
      return "Credit Exhausted";
    case "ai_error":
      return "AI Processing Error";
    case "knowledge_request":
      return "Knowledge Request";
    case "human_requested":
      return "Human Requested";
    case "angry":
      return "Angry Customer";
    case "purchase_ready":
      return "Purchase Ready";
    case "high_value":
      return "High Value Lead";
    case "follow_up_pending":
      return "Follow-up Pending";
    default:
      return reason
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
  }
}

function formatAttentionDescription(reason: string | null | undefined): string {
  if (!reason) return "Customer is awaiting review.";
  switch (reason) {
    case "credit_exhausted":
      return "AI credits exhausted. Recharge to continue automatic responses.";
    case "ai_error":
      return "AI encountered an issue replying to this message.";
    case "knowledge_request":
      return "Customer asked an unanswered store policy or catalog question.";
    case "human_requested":
      return "Customer requested to speak with a human shopkeeper.";
    case "angry":
      return "Customer expressed frustration in conversation.";
    case "purchase_ready":
      return "Customer is ready to complete order.";
    default:
      return "Requires attention from your sales team.";
  }
}

export default function OverviewPage() {
  const { pageId } = usePage();
  const [data, setData] = useState<OverviewData | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    if (!pageId) {
      setLoading(false);
      return;
    }
    setError("");
    setLoading(true);
    Promise.all([
      api<OverviewData>(`/api/overview?pageId=${pageId}`),
      api<Conversation[]>(`/api/conversations?pageId=${pageId}`),
    ])
      .then(([overview, convs]) => {
        setData(overview);
        setConversations(convs);
      })
      .catch((e) => setError(e.message || "Failed to load dashboard overview"))
      .finally(() => setLoading(false));
  }, [pageId]);

  useEffect(() => {
    load();
  }, [load]);

  // Real-time: auto-refresh when events arrive for this page
  useEffect(() => {
    if (!pageId) return;
    const es = new EventSource(`${API}/api/events?pageId=${pageId}`, { withCredentials: true });
    es.onmessage = () => load();
    return () => es.close();
  }, [pageId, load]);

  if (loading && !data) return <OverviewSkeleton />;

  if (error) {
    return (
      <Card className="flex flex-col items-center justify-center p-10 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-danger-soft text-danger">
          <IconAlertTriangle size={24} />
        </div>
        <p className="text-base font-bold text-ink">Couldn&apos;t load dashboard data</p>
        <p className="mt-1 text-xs text-mute">{error}</p>
        <Button onClick={load} variant="ghost" className="mt-4">
          <IconRefresh size={14} />
          <span>Try again</span>
        </Button>
      </Card>
    );
  }

  if (!data) return <OverviewSkeleton />;

  const interestedLeads = conversations.filter(
    (c) => c.status === "interested" || c.status === "negotiating" || c.status === "follow_up"
  ).length;

  const funnelStages = [
    {
      label: "Customers",
      count: data.totalCustomers,
      icon: IconUsers,
      href: "/customers",
      tone: "green",
      bgClass: "bg-leaf-soft text-leaf",
    },
    {
      label: "Conversations",
      count: data.totalConversations,
      icon: IconMessageSquare,
      href: "/inbox",
      tone: "blue",
      bgClass: "bg-blue-soft text-blue",
    },
    {
      label: "Leads",
      count: interestedLeads,
      icon: IconTarget,
      href: "/customers",
      tone: "orange",
      bgClass: "bg-orange-soft text-orange",
    },
    {
      label: "Follow-ups",
      count: data.followUpsDue,
      icon: IconClock,
      href: "/follow-ups",
      tone: "purple",
      bgClass: "bg-purple-soft text-purple",
    },
    {
      label: "Sales",
      count: data.totalSales,
      icon: IconCheckCircle2,
      href: "/sales",
      tone: "green",
      bgClass: "bg-leaf-soft text-leaf",
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Four Top Metric Cards (Responsive Grid: 4 cols desktop, 2x2 tablet, 1 col mobile) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Metric A: AI Credits */}
        <Link href="/credits" className="group">
          <Card hover className="h-full p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-soft text-purple transition-transform group-hover:scale-105">
                  <IconZap size={22} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-mute">AI Credits</p>
                  <p className="mt-0.5 text-2xl font-bold tracking-tight text-ink sm:text-[26px]">
                    {data.credits.credits.toLocaleString("en-IN")}
                  </p>
                </div>
              </div>
              <IconChevronRight
                size={16}
                className="text-mute opacity-0 transition-opacity group-hover:opacity-100"
              />
            </div>
            <p
              className={`mt-2.5 text-xs font-medium ${
                data.credits.credits <= 0 ? "text-danger" : "text-mute"
              }`}
            >
              {data.credits.credits <= 0 ? "Paused — recharge to resume" : "Credits remaining"}
            </p>
          </Card>
        </Link>

        {/* Metric B: Conversations Today */}
        <Link href="/inbox" className="group">
          <Card hover className="h-full p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-soft text-blue transition-transform group-hover:scale-105">
                  <IconMessageSquare size={22} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-mute">Conversations Today</p>
                  <p className="mt-0.5 text-2xl font-bold tracking-tight text-ink sm:text-[26px]">
                    {data.conversationsToday.toLocaleString("en-IN")}
                  </p>
                </div>
              </div>
              <IconChevronRight
                size={16}
                className="text-mute opacity-0 transition-opacity group-hover:opacity-100"
              />
            </div>
            <div className="mt-2.5 flex items-center gap-1.5 text-xs font-medium text-leaf">
              <span>↑ 100% vs yesterday</span>
            </div>
          </Card>
        </Link>

        {/* Metric C: New Customers Today */}
        <Link href="/customers" className="group">
          <Card hover className="h-full p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-leaf-soft text-leaf transition-transform group-hover:scale-105">
                  <IconUserPlus size={22} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-mute">New Customers Today</p>
                  <p className="mt-0.5 text-2xl font-bold tracking-tight text-ink sm:text-[26px]">
                    {data.newCustomersToday.toLocaleString("en-IN")}
                  </p>
                </div>
              </div>
              <IconChevronRight
                size={16}
                className="text-mute opacity-0 transition-opacity group-hover:opacity-100"
              />
            </div>
            <div className="mt-2.5 flex items-center gap-1.5 text-xs font-medium text-mute">
              <span>— 0% vs yesterday</span>
            </div>
          </Card>
        </Link>

        {/* Metric D: Total Revenue */}
        <Link href="/sales" className="group">
          <Card hover className="h-full p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-soft text-orange transition-transform group-hover:scale-105">
                  <IconCoins size={22} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-mute">Total Revenue</p>
                  <p className="mt-0.5 text-2xl font-bold tracking-tight text-ink sm:text-[26px]">
                    {fmtTaka(data.totalRevenue)}
                  </p>
                </div>
              </div>
              <IconChevronRight
                size={16}
                className="text-mute opacity-0 transition-opacity group-hover:opacity-100"
              />
            </div>
            <p className="mt-2.5 text-xs font-medium text-mute">
              {data.totalSales.toLocaleString("en-IN")} sales completed
            </p>
          </Card>
        </Link>
      </div>

      {/* 2. Sales Funnel (Full Width Card) */}
      <Card className="p-5 sm:p-6">
        <div className="mb-4.5 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold tracking-tight text-ink">Sales Funnel</h2>
            <p className="text-xs text-mute">Conversion pipeline from visitor to paying customer</p>
          </div>
          <Link
            href="/analytics"
            className="flex items-center gap-1 text-xs font-semibold text-leaf transition-colors hover:underline"
          >
            <span>Analytics</span>
            <IconArrowRight size={13} />
          </Link>
        </div>

        {/* Funnel Stages Container (horizontally scrollable on small screens) */}
        <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1 sm:gap-3">
          {funnelStages.map((stage, index) => {
            const Icon = stage.icon;
            const isLast = index === funnelStages.length - 1;
            return (
              <div key={stage.label} className="flex min-w-[130px] flex-1 items-center sm:min-w-[150px]">
                <Link
                  href={stage.href}
                  className="group flex w-full flex-col items-center rounded-xl border border-line bg-paper p-3.5 text-center transition-all hover:border-[#D0D7D4] hover:bg-surface hover:shadow-xs"
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full transition-transform group-hover:scale-110 ${stage.bgClass}`}
                  >
                    <Icon size={19} />
                  </div>
                  <p className="mt-2 text-xl font-bold tracking-tight text-ink sm:text-2xl">
                    {stage.count.toLocaleString("en-IN")}
                  </p>
                  <p className="text-xs font-semibold text-mute">{stage.label}</p>
                </Link>
                {!isLast && (
                  <div className="hidden shrink-0 px-2 text-mute md:block">
                    <IconArrowRight size={16} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* 3. Secondary Metrics (2 Columns Desktop/Tablet, 1 Column Mobile) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link href="/follow-ups" className="group">
          <Card hover className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-soft text-purple transition-transform group-hover:scale-105">
                  <IconClock size={22} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-mute">Follow-ups Due</p>
                  <p className="mt-0.5 text-2xl font-bold tracking-tight text-ink sm:text-[26px]">
                    {data.followUpsDue.toLocaleString("en-IN")}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-medium text-mute">Pending follow-ups</span>
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/orders" className="group">
          <Card hover className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-soft text-orange transition-transform group-hover:scale-105">
                  <IconPackage size={22} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-mute">Pending Orders</p>
                  <p className="mt-0.5 text-2xl font-bold tracking-tight text-ink sm:text-[26px]">
                    {data.pendingOrders.toLocaleString("en-IN")}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-medium text-mute">Awaiting processing</span>
              </div>
            </div>
          </Card>
        </Link>
      </div>

      {/* 4. Bottom Grid: Attention Required & Recent Conversations (2 Columns Desktop/Tablet, 1 Column Mobile) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Attention Required Card */}
        <Card className="flex flex-col justify-between p-5 sm:p-6">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-warn-soft text-warn">
                  <IconAlertTriangle size={16} />
                </div>
                <h2 className="text-base font-bold tracking-tight text-ink">Attention Required</h2>
              </div>
              {data.attentionRequired.length > 0 && (
                <Badge tone="red">{data.attentionRequired.length} alerts</Badge>
              )}
            </div>

            {data.attentionRequired.length === 0 ? (
              <EmptyState
                icon={<IconCheckCircle2 size={24} className="text-leaf" />}
                title="You're all caught up"
                subtitle="No issues need your attention right now."
                className="my-2 border-0 bg-paper py-8"
              />
            ) : (
              <div className="divide-y divide-line">
                {data.attentionRequired.slice(0, 5).map((item) => (
                  <Link
                    key={item.id}
                    href={`/inbox/${item.id}`}
                    className="group -mx-2 flex items-center justify-between rounded-lg p-3 transition-colors hover:bg-paper"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-danger-soft text-danger">
                        <IconAlertCircle size={15} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink group-hover:text-leaf">
                          {formatAttentionTitle(item.attentionReason)}
                        </p>
                        <p className="truncate text-xs text-mute">
                          {item.customerName ? `${item.customerName} — ` : ""}
                          {formatAttentionDescription(item.attentionReason)}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 pl-3">
                      <Badge tone={statusTone(item.status)}>{item.status || "New"}</Badge>
                      <span className="text-[11px] text-mute">{timeAgo(item.lastMessageAt)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 border-t border-line pt-3 text-right">
            <Link
              href="/inbox"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-leaf hover:underline"
            >
              <span>View all alerts</span>
              <IconArrowRight size={13} />
            </Link>
          </div>
        </Card>

        {/* Recent Conversations Card */}
        <Card className="flex flex-col justify-between p-5 sm:p-6">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-soft text-blue">
                  <IconMessageSquare size={16} />
                </div>
                <h2 className="text-base font-bold tracking-tight text-ink">Recent Conversations</h2>
              </div>
              {conversations.length > 0 && (
                <Badge tone="blue">{conversations.length} total</Badge>
              )}
            </div>

            {conversations.length === 0 ? (
              <EmptyState
                icon={<IconMessageSquare size={24} className="text-mute" />}
                title="No conversations yet."
                subtitle="New customer messages will appear here in real-time."
                className="my-2 border-0 bg-paper py-8"
              />
            ) : (
              <div className="divide-y divide-line">
                {conversations.slice(0, 5).map((c) => (
                  <Link
                    key={c.id}
                    href={`/inbox/${c.id}`}
                    className="group -mx-2 flex items-center justify-between rounded-lg p-3 transition-colors hover:bg-paper"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-leaf-soft text-xs font-bold text-leaf">
                        {(c.customerName || "?")[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink group-hover:text-leaf">
                          {c.customerName || "Unknown Customer"}
                        </p>
                        <p className="truncate text-xs text-mute">
                          {c.handledBy === "human" ? "Human handling" : "AI handling"}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 pl-3">
                      <Badge tone={statusTone(c.status)}>{c.status || "New"}</Badge>
                      <span className="text-[11px] text-mute">{timeAgo(c.lastMessageAt)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 border-t border-line pt-3 text-right">
            <Link
              href="/inbox"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-leaf hover:underline"
            >
              <span>View all conversations</span>
              <IconArrowRight size={13} />
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
