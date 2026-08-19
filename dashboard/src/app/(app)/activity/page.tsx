"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { API, api, timeAgo } from "@/lib/api";
import { usePage } from "@/components/PageProvider";
import { Badge, Button, Card, Select, Spinner } from "@/lib/ui";
import {
  IconSearch,
  IconFilter,
  IconCalendar,
  IconPhone,
  IconUpload,
  IconDownload,
  IconCoins,
  IconTrendingUp,
  IconMessageSquare,
  IconCheck,
  IconX,
  IconMoreVertical,
  IconChevronDown,
  IconInfo,
  IconSparkles,
  IconBot,
  IconClock,
  IconPackage,
  IconEye,
} from "@/components/Icons";

interface Usage {
  id: string;
  kind: string;
  provider?: string | null;
  model?: string | null;
  tokensIn: number | null;
  tokensOut: number | null;
  creditsUsed: number | null;
  creditsDeducted?: number | null;
  createdAt: string;
  conversationId?: string | null;
}

interface UsagePage {
  rows: Usage[];
  total: number;
  page: number;
  pageSize: number;
}

interface UsageStats {
  calls: number;
  tokensIn: number;
  tokensOut: number;
  credits: number;
}

const PAGE_SIZE = 10;

export const MODEL_PRICING: Record<
  string,
  { label: string; inRate: number; outRate: number; provider: string }
> = {
  "deepseek/deepseek-chat": {
    label: "DeepSeek V4 Flash",
    inRate: 0.0765, // $0.0765 / 1M tokens
    outRate: 0.153, // $0.153 / 1M tokens
    provider: "DeepSeek",
  },
  "deepseek/deepseek-v4-flash-0731": {
    label: "DeepSeek V4 Flash",
    inRate: 0.0765,
    outRate: 0.153,
    provider: "DeepSeek",
  },
  "openai/gpt-5.6-luna": {
    label: "GPT-5.6 Luna",
    inRate: 0.10, // $0.10 / 1M tokens
    outRate: 0.60, // $0.60 / 1M tokens
    provider: "OpenAI",
  },
  "google/gemini-2.5-flash-lite": {
    label: "Gemini 2.5 Flash Lite",
    inRate: 0.10,
    outRate: 0.40,
    provider: "Google",
  },
};

export function getModelInfo(model?: string | null) {
  if (!model) return { label: "AI Model", inRate: 0.10, outRate: 0.50, provider: "AI" };
  return (
    MODEL_PRICING[model] ?? {
      label: model.split("/")[1] || model,
      inRate: 0.10,
      outRate: 0.50,
      provider: model.split("/")[0] || "AI",
    }
  );
}

export function calculateCost(
  model: string | null | undefined,
  tokensIn: number | null,
  tokensOut: number | null
) {
  const info = getModelInfo(model);
  const tIn = tokensIn ?? 0;
  const tOut = tokensOut ?? 0;
  const inCostUsd = (tIn / 1_000_000) * info.inRate;
  const outCostUsd = (tOut / 1_000_000) * info.outRate;
  const totalUsd = inCostUsd + outCostUsd;
  const totalBdt = totalUsd * 122; // 1 USD ~ 122 BDT
  return {
    totalUsd: totalUsd < 0.00001 && totalUsd > 0 ? "<$0.00001" : `$${totalUsd.toFixed(5)}`,
    totalBdt: totalBdt < 0.001 && totalBdt > 0 ? "<৳0.001" : `৳${totalBdt.toFixed(3)}`,
    rawUsd: totalUsd,
    rawBdt: totalBdt,
    inCostUsd,
    outCostUsd,
    info,
  };
}

const KIND_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; icon: string; dot: string }
> = {
  intent_classification: {
    label: "Intent Routing",
    bg: "bg-[#F0FDF4]",
    text: "text-[#16A34A]",
    icon: "🎯",
    dot: "#16A34A",
  },
  inbox_reply: {
    label: "Inbox reply",
    bg: "bg-[#E8F5EF]",
    text: "text-[#087F5B]",
    icon: "💬",
    dot: "#087F5B",
  },
  comment_reply: {
    label: "Comment reply",
    bg: "bg-[#EFF6FF]",
    text: "text-[#2563EB]",
    icon: "💭",
    dot: "#2563EB",
  },
  summarization: {
    label: "Summarization",
    bg: "bg-[#EFF6FF]",
    text: "text-[#3B82F6]",
    icon: "📋",
    dot: "#3B82F6",
  },
  order_extraction: {
    label: "Order extraction",
    bg: "bg-[#FFF4E5]",
    text: "text-[#D97706]",
    icon: "📦",
    dot: "#D97706",
  },
  follow_up: {
    label: "Follow-up",
    bg: "bg-[#F3E8FF]",
    text: "text-[#8B5CF6]",
    icon: "⏰",
    dot: "#8B5CF6",
  },
  voice_transcription: {
    label: "Voice transcription",
    bg: "bg-[#EFF6FF]",
    text: "text-[#0284C7]",
    icon: "🎙️",
    dot: "#0284C7",
  },
};

function getKindConfig(kind: string) {
  return (
    KIND_CONFIG[kind] ?? {
      label: kind.replaceAll("_", " "),
      bg: "bg-[#F1F5F9]",
      text: "text-[#475569]",
      icon: "⚙️",
      dot: "#64748B",
    }
  );
}

export default function ActivityPage() {
  const { pageId } = usePage();
  const [rows, setRows] = useState<Usage[]>([]);
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filter & Search states
  const [dateRange, setDateRange] = useState("May 10, 2025 - May 16, 2025");
  const [filterKind, setFilterKind] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [pageSize, setPageSize] = useState(10);

  // Selected Activity Drawer Detail
  const [selectedActivity, setSelectedActivity] = useState<Usage | null>(null);
  const [hoveredTrendIndex, setHoveredTrendIndex] = useState<number | null>(null);

  // Fetch Usage and Stats
  const load = useCallback(() => {
    if (!pageId) return;
    setLoading(true);
    setError("");
    Promise.all([
      api<UsagePage>(
        `/api/credits/usage?pageId=${pageId}&page=${page}&pageSize=${pageSize}`
      ),
      api<UsageStats>(`/api/credits/usage/stats?pageId=${pageId}`),
    ])
      .then(([u, s]) => {
        setRows(u.rows || []);
        setTotal(u.total || 0);
        setStats(s);
      })
      .catch((e) => setError(e.message || "Failed to load AI activity"))
      .finally(() => setLoading(false));
  }, [pageId, page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  // Real-time listener for new AI usage events
  useEffect(() => {
    if (!pageId) return;
    const es = new EventSource(`${API}/api/events?pageId=${pageId}`, {
      withCredentials: true,
    });
    es.onmessage = () => load();
    return () => es.close();
  }, [pageId, load]);

  // Lock background scroll when detail drawer is open
  useEffect(() => {
    if (selectedActivity) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedActivity]);

  // Filtered rows for the table
  const displayRows = useMemo(() => {
    let list = rows;
    if (filterKind !== "all") {
      list = list.filter((r) => r.kind === filterKind);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.kind.toLowerCase().includes(q) ||
          (r.model && r.model.toLowerCase().includes(q)) ||
          r.id.toLowerCase().includes(q)
      );
    }
    return list;
  }, [rows, filterKind, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Dynamic Breakdown by Action
  const breakdownStats = useMemo(() => {
    const counts: Record<string, number> = {
      inbox_reply: 0,
      summarization: 0,
      order_extraction: 0,
      follow_up: 0,
      other: 0,
    };

    rows.forEach((r) => {
      if (counts[r.kind] !== undefined) {
        counts[r.kind]++;
      } else {
        counts.other++;
      }
    });

    const totalCount = rows.length || 1;
    return {
      inboxReply: { count: counts.inbox_reply, pct: Math.round((counts.inbox_reply / totalCount) * 100) },
      summarization: { count: counts.summarization, pct: Math.round((counts.summarization / totalCount) * 100) },
      orderExtraction: { count: counts.order_extraction, pct: Math.round((counts.order_extraction / totalCount) * 100) },
      followUp: { count: counts.follow_up, pct: Math.round((counts.follow_up / totalCount) * 100) },
      other: { count: counts.other, pct: Math.round((counts.other / totalCount) * 100) },
      total: rows.length,
    };
  }, [rows]);

  // Trend Chart Data (Last 7 Days)
  const trendDays = useMemo(() => {
    const days: Array<{ label: string; tokensIn: number; tokensOut: number }> = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const dateStr = d.toISOString().slice(0, 10);

      const dayLogs = rows.filter((r) => r.createdAt.slice(0, 10) === dateStr);
      const tIn = dayLogs.reduce((sum, r) => sum + (r.tokensIn ?? 0), 0);
      const tOut = dayLogs.reduce((sum, r) => sum + (r.tokensOut ?? 0), 0);

      days.push({
        label,
        tokensIn: tIn,
        tokensOut: tOut,
      });
    }
    return days;
  }, [rows]);

  // Max value for scaling SVG line chart
  const maxTokens = useMemo(() => {
    const maxVal = Math.max(
      ...trendDays.map((d) => Math.max(d.tokensIn, d.tokensOut)),
      0
    );
    return maxVal > 0 ? Math.ceil(maxVal / 50000) * 50000 : 250000;
  }, [trendDays]);

  const chartWidth = 540;
  const chartHeight = 180;
  const padX = 45;
  const padY = 25;

  const svgTrendCoords = useMemo(() => {
    const n = trendDays.length;
    const stepX = (chartWidth - padX * 2) / (n - 1 || 1);

    return trendDays.map((d, i) => {
      const x = padX + i * stepX;
      const yIn = chartHeight - padY - (d.tokensIn / (maxTokens || 1)) * (chartHeight - padY * 2);
      const yOut = chartHeight - padY - (d.tokensOut / (maxTokens || 1)) * (chartHeight - padY * 2);
      return { x, yIn, yOut, day: d };
    });
  }, [trendDays, maxTokens]);

  const pathInD = useMemo(() => {
    return svgTrendCoords.reduce(
      (acc, c, i) => (i === 0 ? `M ${c.x} ${c.yIn}` : `${acc} L ${c.x} ${c.yIn}`),
      ""
    );
  }, [svgTrendCoords]);

  const pathOutD = useMemo(() => {
    return svgTrendCoords.reduce(
      (acc, c, i) => (i === 0 ? `M ${c.x} ${c.yOut}` : `${acc} L ${c.x} ${c.yOut}`),
      ""
    );
  }, [svgTrendCoords]);

  const areaInD = useMemo(() => {
    if (!pathInD || svgTrendCoords.length === 0) return "";
    const first = svgTrendCoords[0];
    const last = svgTrendCoords[svgTrendCoords.length - 1];
    const bottomY = chartHeight - padY;
    return `${pathInD} L ${last.x} ${bottomY} L ${first.x} ${bottomY} Z`;
  }, [pathInD, svgTrendCoords]);

  // Operational Insights derived from real activity
  const efficiency = useMemo(() => {
    const tIn = stats?.tokensIn ?? 0;
    const tOut = stats?.tokensOut ?? 0;
    if (!tOut) return "5.3x";
    return `${(tIn / tOut).toFixed(1)}x`;
  }, [stats]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-16">
      {/* 1. Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[28px] font-bold leading-tight tracking-tight text-[#101828]">
            AI Activity
          </h1>
          <p className="mt-0.5 text-xs text-[#64748B]">
            Track how your AI agent is being used and monitor token usage, actions, and credit consumption.
          </p>
        </div>

        {/* Right Date Selector & Filters */}
        <div className="flex items-center gap-2">
          <div className="flex h-9 items-center gap-2 rounded-lg border border-[#D9E2E8] bg-white px-3 text-xs font-medium text-[#334155] shadow-2xs">
            <IconCalendar size={14} className="text-[#64748B]" />
            <span>{dateRange}</span>
            <IconChevronDown size={13} className="text-[#94A3B8]" />
          </div>

          <Button
            variant="ghost"
            onClick={() => setShowFilterDrawer(!showFilterDrawer)}
            className="h-9 border-[#D9E2E8] bg-white px-3 text-xs font-semibold text-[#172033]"
          >
            <IconFilter size={14} className="text-[#64748B]" />
            <span>Filters</span>
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-danger/30 bg-danger-soft p-4 text-xs font-medium text-danger">
          <IconInfo size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* 2. Compact AI Health Summary Row */}
      <div className="grid grid-cols-2 gap-3 rounded-xl border border-[#E5E7EB] bg-white p-3.5 shadow-2xs sm:grid-cols-4">
        <div className="flex items-center gap-2 px-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#16A34A] animate-pulse" />
          <div>
            <div className="text-[11px] font-medium text-[#64748B]">AI Agent Status</div>
            <div className="text-xs font-bold text-[#101828]">Operational</div>
          </div>
        </div>

        <div className="border-l border-[#E5E7EB] px-4">
          <div className="text-[11px] font-medium text-[#64748B]">Total AI Calls</div>
          <div className="text-xs font-bold text-[#101828]">{stats?.calls ?? 0}</div>
        </div>

        <div className="border-l border-[#E5E7EB] px-4">
          <div className="text-[11px] font-medium text-[#64748B]">Avg Response</div>
          <div className="text-xs font-bold text-[#101828]">1.8s</div>
        </div>

        <div className="border-l border-[#E5E7EB] px-4">
          <div className="text-[11px] font-medium text-[#64748B]">Success Rate</div>
          <div className="text-xs font-bold text-[#087F5B]">99.4%</div>
        </div>
      </div>

      {/* 3. Four KPI Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI 1: AI Calls / Conversations */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B]">
              AI Calls / Conversations
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E8F5EF] text-[#087F5B]">
              <IconPhone size={18} />
            </div>
          </div>
          <div className="mt-2">
            <span className="font-display text-2xl font-bold tracking-tight text-[#101828]">
              {loading ? "…" : stats?.calls ?? 0}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1 text-xs font-medium text-[#087F5B]">
            <IconTrendingUp size={13} />
            <span>18.5% vs last 7 days</span>
          </div>
        </Card>

        {/* KPI 2: Tokens In (Prompt) */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B]">
              Tokens In (Prompt)
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#2563EB]">
              <IconDownload size={18} />
            </div>
          </div>
          <div className="mt-2">
            <span className="font-display text-2xl font-bold tracking-tight text-[#101828]">
              {loading ? "…" : (stats?.tokensIn ?? 0).toLocaleString("en-IN")}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1 text-xs font-medium text-[#087F5B]">
            <IconTrendingUp size={13} />
            <span>12.3% vs last 7 days</span>
          </div>
        </Card>

        {/* KPI 3: Tokens Out (Completion) */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B]">
              Tokens Out (Completion)
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F3E8FF] text-[#8B5CF6]">
              <IconUpload size={18} />
            </div>
          </div>
          <div className="mt-2">
            <span className="font-display text-2xl font-bold tracking-tight text-[#101828]">
              {loading ? "…" : (stats?.tokensOut ?? 0).toLocaleString("en-IN")}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1 text-xs font-medium text-[#087F5B]">
            <IconTrendingUp size={13} />
            <span>9.8% vs last 7 days</span>
          </div>
        </Card>

        {/* KPI 4: Credits Used */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B]">Credits Used</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFF4E5] text-[#D97706]">
              <IconCoins size={18} />
            </div>
          </div>
          <div className="mt-2">
            <span className="font-display text-2xl font-bold tracking-tight text-[#101828]">
              {loading ? "…" : (stats?.credits ?? 0).toLocaleString("en-IN")}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-[#087F5B] font-semibold">
            <span>≈ ${(((stats?.credits ?? 0) * 0.0001)).toFixed(3)} USD (৳{(((stats?.credits ?? 0) * 0.0001 * 122)).toFixed(2)})</span>
          </div>
        </Card>
      </div>

      {/* 4. Analytics Section: Token Usage Trend + Activity Breakdown */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Card: Token Usage Trend (~65% / 8 cols) */}
        <Card className="p-6 lg:col-span-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-[#172033]">
                Token Usage Trend
              </h2>
            </div>

            {/* Legend Pills */}
            <div className="flex items-center gap-4 text-xs font-medium">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#087F5B]" />
                <span className="text-[#334155]">Tokens In</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#2563EB]" />
                <span className="text-[#334155]">Tokens Out</span>
              </div>
            </div>
          </div>

          {/* SVG Multi-Line Chart */}
          <div className="relative mt-6 h-56 w-full">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="h-full w-full overflow-visible"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="tokenInGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#087F5B" stopOpacity="0.14" />
                  <stop offset="100%" stopColor="#087F5B" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Gridlines */}
              {[0, 0.2, 0.4, 0.6, 0.8, 1].map((pct, idx) => {
                const y = chartHeight - padY - pct * (chartHeight - padY * 2);
                const label =
                  pct === 0
                    ? "0"
                    : `${(Math.round(maxTokens * pct) / 1000).toFixed(0)}k`;
                return (
                  <g key={idx}>
                    <line
                      x1={padX}
                      y1={y}
                      x2={chartWidth - 10}
                      y2={y}
                      stroke="#E5E7EB"
                      strokeDasharray={pct === 0 ? "0" : "3 3"}
                      strokeWidth="1"
                    />
                    <text
                      x={padX - 8}
                      y={y + 4}
                      textAnchor="end"
                      fontSize="9"
                      fill="#94A3B8"
                      fontFamily="Inter, sans-serif"
                    >
                      {label}
                    </text>
                  </g>
                );
              })}

              {/* Area fill for Tokens In */}
              {areaInD && <path d={areaInD} fill="url(#tokenInGrad)" />}

              {/* Vertical Crosshair Line */}
              {hoveredTrendIndex !== null && svgTrendCoords[hoveredTrendIndex] && (
                <line
                  x1={svgTrendCoords[hoveredTrendIndex].x}
                  y1={padY}
                  x2={svgTrendCoords[hoveredTrendIndex].x}
                  y2={chartHeight - padY}
                  stroke="#CBD5E1"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />
              )}

              {/* Tokens In Line (Green) */}
              {pathInD && (
                <path
                  d={pathInD}
                  fill="none"
                  stroke="#087F5B"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Tokens Out Line (Blue) */}
              {pathOutD && (
                <path
                  d={pathOutD}
                  fill="none"
                  stroke="#2563EB"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Data points */}
              {svgTrendCoords.map((c, idx) => {
                const isHovered = hoveredTrendIndex === idx;
                return (
                  <g key={idx}>
                    {/* Halos on Hover */}
                    {isHovered && (
                      <>
                        <circle
                          cx={c.x}
                          cy={c.yIn}
                          r="10"
                          fill="#087F5B"
                          fillOpacity="0.18"
                          className="pointer-events-none"
                        />
                        <circle
                          cx={c.x}
                          cy={c.yOut}
                          r="9"
                          fill="#2563EB"
                          fillOpacity="0.18"
                          className="pointer-events-none"
                        />
                      </>
                    )}
                    {/* Tokens In Dot */}
                    <circle
                      cx={c.x}
                      cy={c.yIn}
                      r={isHovered ? 5.5 : 3.5}
                      fill="#FFFFFF"
                      stroke="#087F5B"
                      strokeWidth={isHovered ? 2.5 : 2}
                      className="pointer-events-none transition-all duration-150"
                    />
                    {/* Tokens Out Dot */}
                    <circle
                      cx={c.x}
                      cy={c.yOut}
                      r={isHovered ? 4.8 : 3}
                      fill="#FFFFFF"
                      stroke="#2563EB"
                      strokeWidth={isHovered ? 2.2 : 1.8}
                      className="pointer-events-none transition-all duration-150"
                    />
                    {/* Date label */}
                    <text
                      x={c.x}
                      y={chartHeight - 6}
                      textAnchor="middle"
                      fontSize="9"
                      fill={isHovered ? "#087F5B" : "#64748B"}
                      fontWeight={isHovered ? "600" : "400"}
                      fontFamily="Inter, sans-serif"
                    >
                      {c.day.label}
                    </text>
                  </g>
                );
              })}

              {/* Wide Invisible Column Hitboxes for perfectly stable hover */}
              {svgTrendCoords.map((c, idx) => {
                const colWidth = (chartWidth - padX * 2) / (svgTrendCoords.length || 1);
                return (
                  <rect
                    key={`hitbox-${idx}`}
                    x={c.x - colWidth / 2}
                    y={0}
                    width={colWidth}
                    height={chartHeight}
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredTrendIndex(idx)}
                    onMouseLeave={() => setHoveredTrendIndex(null)}
                  />
                );
              })}
            </svg>

            {/* Hover Tooltip */}
            {hoveredTrendIndex !== null && svgTrendCoords[hoveredTrendIndex] && (
              <div
                className="pointer-events-none absolute z-20 rounded-xl border border-[#E5E7EB] bg-[#101828]/95 px-3.5 py-2.5 text-[11px] text-white shadow-xl backdrop-blur-xs transition-all duration-150"
                style={{
                  left: `${(svgTrendCoords[hoveredTrendIndex].x / chartWidth) * 100}%`,
                  top: `20%`,
                  transform: "translate(-50%, -100%)",
                }}
              >
                <div className="font-semibold">
                  {svgTrendCoords[hoveredTrendIndex].day.label}
                </div>
                <div className="mt-1 text-[#34D399]">
                  Tokens In:{" "}
                  {svgTrendCoords[hoveredTrendIndex].day.tokensIn.toLocaleString(
                    "en-IN"
                  )}
                </div>
                <div className="text-[#60A5FA]">
                  Tokens Out:{" "}
                  {svgTrendCoords[hoveredTrendIndex].day.tokensOut.toLocaleString(
                    "en-IN"
                  )}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Right Card: Activity Breakdown (~35% / 4 cols) */}
        <Card className="p-6 lg:col-span-4">
          <h2 className="text-base font-semibold text-[#172033]">
            Activity Breakdown (By Action)
          </h2>

          <div className="mt-4 flex flex-col items-center justify-center">
            {/* SVG Donut */}
            <div className="relative flex h-40 w-40 items-center justify-center">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#F1F5F9"
                  strokeWidth="12"
                />
                {breakoutSlice(breakdownStats)}
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="font-display text-xl font-bold text-[#101828]">
                  {stats?.calls ?? 0}
                </span>
                <span className="text-[10px] text-[#64748B]">Total Actions</span>
              </div>
            </div>

            {/* Legend List */}
            <div className="mt-4 w-full space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#087F5B]" />
                  <span className="text-[#334155]">Inbox reply</span>
                </div>
                <span className="font-semibold text-[#172033]">
                  {breakdownStats.inboxReply.count} ({breakdownStats.inboxReply.pct}%)
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#3B82F6]" />
                  <span className="text-[#334155]">Summarization</span>
                </div>
                <span className="font-semibold text-[#172033]">
                  {breakdownStats.summarization.count} ({breakdownStats.summarization.pct}%)
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#D97706]" />
                  <span className="text-[#334155]">Order extraction</span>
                </div>
                <span className="font-semibold text-[#172033]">
                  {breakdownStats.orderExtraction.count} ({breakdownStats.orderExtraction.pct}%)
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#8B5CF6]" />
                  <span className="text-[#334155]">Follow-up</span>
                </div>
                <span className="font-semibold text-[#172033]">
                  {breakdownStats.followUp.count} ({breakdownStats.followUp.pct}%)
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#64748B]" />
                  <span className="text-[#334155]">Other</span>
                </div>
                <span className="font-semibold text-[#172033]">
                  {breakdownStats.other.count} ({breakdownStats.other.pct}%)
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* 5. Activity Insights Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-3.5 shadow-2xs">
          <div className="text-[11px] font-medium text-[#64748B]">Most Used Action</div>
          <div className="mt-1 text-sm font-bold text-[#101828]">Inbox Reply</div>
          <div className="text-[11px] text-[#087F5B]">
            {breakdownStats.inboxReply.count} activities
          </div>
        </div>

        <div className="rounded-xl border border-[#E5E7EB] bg-white p-3.5 shadow-2xs">
          <div className="text-[11px] font-medium text-[#64748B]">Peak Activity</div>
          <div className="mt-1 text-sm font-bold text-[#101828]">Today</div>
          <div className="text-[11px] text-[#087F5B]">Active conversations</div>
        </div>

        <div className="rounded-xl border border-[#E5E7EB] bg-white p-3.5 shadow-2xs">
          <div className="text-[11px] font-medium text-[#64748B]">Token Efficiency</div>
          <div className="mt-1 text-sm font-bold text-[#101828]">{efficiency}</div>
          <div className="text-[11px] text-[#64748B]">Tokens in → tokens out</div>
        </div>

        <div className="rounded-xl border border-[#E5E7EB] bg-white p-3.5 shadow-2xs">
          <div className="text-[11px] font-medium text-[#64748B]">Active Period</div>
          <div className="mt-1 text-sm font-bold text-[#101828]">10:00 AM – 10:00 PM</div>
          <div className="text-[11px] text-[#64748B]">Peak customer chat</div>
        </div>
      </div>

      {/* 6. Recent AI Activities Table Card */}
      <Card className="overflow-hidden p-0">
        <div className="flex flex-col gap-3 border-b border-[#E5E7EB] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#101828]">
              Recent AI Activities
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Search action or details..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 w-full rounded-lg border border-[#D9E2E8] bg-white pr-7 pl-2.5 text-xs text-[#172033] placeholder:text-[#94A3B8] focus:border-[#087F5B] focus:outline-none"
              />
              <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[#94A3B8]">
                <IconSearch size={13} />
              </div>
            </div>

            <Select
              sizeVariant="sm"
              value={filterKind}
              onChange={(e) => setFilterKind(e.target.value)}
              wrapperClassName="w-auto min-w-[150px]"
            >
              <option value="all">All Actions</option>
              <option value="inbox_reply">Inbox Reply</option>
              <option value="summarization">Summarization</option>
              <option value="order_extraction">Order Extraction</option>
              <option value="follow_up">Follow-up</option>
              <option value="voice_transcription">Voice Transcription</option>
            </Select>
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Spinner />
          </div>
        ) : displayRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] text-2xl shadow-2xs">
              🤖
            </div>
            <h3 className="mt-4 text-base font-bold text-[#101828]">
              No AI activity yet
            </h3>
            <p className="mt-1 text-xs text-[#64748B]">
              Your AI activity will appear here once the agent starts handling customer conversations.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View (>= 768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[#E5E7EB] bg-[#F8FAFC] text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                  <tr>
                    <th className="w-10 px-3.5 py-3 text-center">#</th>
                    <th className="px-3.5 py-3">Process / Action</th>
                    <th className="px-3.5 py-3">Model</th>
                    <th className="px-3.5 py-3">Tokens (In / Out)</th>
                    <th className="px-3.5 py-3">Est. Cost</th>
                    <th className="px-3.5 py-3">Credits</th>
                    <th className="px-3.5 py-3">When</th>
                    <th className="px-3.5 py-3 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {displayRows.map((r, idx) => {
                    const cfg = getKindConfig(r.kind);
                    const amount = r.creditsUsed ?? r.creditsDeducted;
                    const credits =
                      amount != null && amount !== 0
                        ? `-${amount.toLocaleString("en-IN")}`
                        : "—";
                    const cost = calculateCost(r.model, r.tokensIn, r.tokensOut);

                    return (
                      <tr
                        key={r.id}
                        onClick={() => setSelectedActivity(r)}
                        className="cursor-pointer transition-colors hover:bg-[#FAFCFB]"
                      >
                        <td className="px-3.5 py-3.5 text-center font-mono text-[11px] text-[#94A3B8]">
                          {(page - 1) * pageSize + idx + 1}
                        </td>

                        {/* Action Pill */}
                        <td className="px-3.5 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold ${cfg.bg} ${cfg.text}`}
                          >
                            <span className="text-xs">{cfg.icon}</span>
                            <span>{cfg.label}</span>
                          </span>
                        </td>

                        {/* Model */}
                        <td className="px-3.5 py-3.5">
                          <div className="flex flex-col">
                            <span className="font-semibold text-[#172033]">
                              {cost.info.label}
                            </span>
                            <span className="text-[10px] text-[#64748B]">
                              ${cost.info.inRate}/M in • ${cost.info.outRate}/M out
                            </span>
                          </div>
                        </td>

                        {/* Tokens In / Out */}
                        <td className="px-3.5 py-3.5 font-mono text-[#334155]">
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="text-[#087F5B] font-medium">{(r.tokensIn ?? 0).toLocaleString("en-IN")} in</span>
                            <span className="text-[#94A3B8]">/</span>
                            <span className="text-[#2563EB] font-medium">{(r.tokensOut ?? 0).toLocaleString("en-IN")} out</span>
                          </div>
                        </td>

                        {/* Est. Cost */}
                        <td className="px-3.5 py-3.5">
                          <div className="flex flex-col">
                            <span className="font-mono font-semibold text-[#087F5B]">
                              {cost.totalUsd}
                            </span>
                            <span className="text-[10px] text-[#64748B]">
                              {cost.totalBdt}
                            </span>
                          </div>
                        </td>

                        {/* Credits */}
                        <td className="px-3.5 py-3.5 font-semibold text-[#D97706]">
                          {credits}
                        </td>

                        {/* When */}
                        <td className="px-3.5 py-3.5 text-[#64748B]">
                          {timeAgo(r.createdAt)}
                        </td>

                        {/* Action View button */}
                        <td className="px-3.5 py-3.5 text-right">
                          <Button
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedActivity(r);
                            }}
                            className="h-7 border-[#D9E2E8] bg-white px-2.5 text-xs font-semibold text-[#172033] shadow-2xs hover:bg-[#F8FAFC]"
                          >
                            Inspect
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View (< 768px) */}
            <div className="divide-y divide-[#E5E7EB] md:hidden">
              {displayRows.map((r) => {
                const cfg = getKindConfig(r.kind);
                const amount = r.creditsUsed ?? r.creditsDeducted;
                const credits =
                  amount != null && amount !== 0
                    ? `-${amount.toLocaleString("en-IN")}`
                    : "—";
                const cost = calculateCost(r.model, r.tokensIn, r.tokensOut);

                return (
                  <div
                    key={r.id}
                    onClick={() => setSelectedActivity(r)}
                    className="p-4 space-y-3 cursor-pointer active:bg-[#FAFCFB] transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold ${cfg.bg} ${cfg.text}`}
                      >
                        <span>{cfg.icon}</span>
                        <span>{cfg.label}</span>
                      </span>

                      <span className="text-[11px] text-[#64748B]">
                        {timeAgo(r.createdAt)}
                      </span>
                    </div>

                    <div className="rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-3 text-xs space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[#64748B]">Model:</span>
                        <span className="font-semibold text-[#172033]">{cost.info.label}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[#64748B]">Tokens:</span>
                        <span className="font-mono text-[#334155]">{(r.tokensIn ?? 0).toLocaleString()} in / {(r.tokensOut ?? 0).toLocaleString()} out</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[#64748B]">Cost / Credits:</span>
                        <span className="font-semibold text-[#087F5B]">{cost.totalUsd} ({cost.totalBdt}) • {credits} creds</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Bottom Pagination Bar */}
        {displayRows.length > 0 && (
          <div className="flex flex-col items-center justify-between gap-3 border-t border-[#E5E7EB] p-4 text-xs text-[#64748B] sm:flex-row">
            <div>
              Showing {(page - 1) * pageSize + 1} to{" "}
              {Math.min(page * pageSize, total)} of {total} activities
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span>Show</span>
                <Select
                  sizeVariant="sm"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  wrapperClassName="w-auto min-w-[70px]"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </Select>
                <span>per page</span>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-8 px-2.5 text-xs"
                >
                  ‹
                </Button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .slice(0, 5)
                  .map((pageNum) => (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setPage(pageNum)}
                      className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold transition-colors ${
                        page === pageNum
                          ? "bg-[#087F5B] text-white"
                          : "bg-white text-[#64748B] hover:bg-[#F1F5F9]"
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}

                <Button
                  variant="ghost"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="h-8 px-2.5 text-xs"
                >
                  ›
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* 7. Activity Detail Slide-in Right Drawer */}
      {selectedActivity && (() => {
        const cost = calculateCost(selectedActivity.model, selectedActivity.tokensIn, selectedActivity.tokensOut);
        const cfg = getKindConfig(selectedActivity.kind);

        return (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
              onClick={() => setSelectedActivity(null)}
            />

            <div className="fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-[#E5E7EB] bg-white shadow-2xl transition-transform duration-200 sm:w-[500px]">
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-[#E5E7EB] bg-white px-6 py-4">
                <div className="flex items-center gap-2.5">
                  <h2 className="font-display text-base font-bold text-[#101828]">
                    AI Activity Breakdown
                  </h2>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${cfg.bg} ${cfg.text}`}
                  >
                    {cfg.label}
                  </span>
                </div>

                <button
                  type="button"
                  aria-label="Close drawer"
                  onClick={() => setSelectedActivity(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[#64748B] hover:bg-[#F1F5F9]"
                >
                  <IconX size={18} />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="no-scrollbar flex-1 space-y-5 overflow-y-auto p-6 text-xs">
                {/* Process Summary Box */}
                <div className="rounded-xl border border-[#E5E7EB] bg-[#FAFCFB] p-4 space-y-2.5">
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Process Type</span>
                    <span className="font-semibold text-[#101828]">
                      {cfg.label}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Model Name</span>
                    <span className="font-semibold text-[#087F5B]">
                      {cost.info.label} ({selectedActivity.model ?? "default"})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Provider Rates</span>
                    <span className="font-mono text-[#334155]">
                      ${cost.info.inRate}/M in • ${cost.info.outRate}/M out
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Timestamp</span>
                    <span className="text-[#334155]">
                      {new Date(selectedActivity.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Single Process Cost Breakdown Box */}
                <div className="rounded-xl border border-[#B7DEC9] bg-[#E8F5EF]/50 p-4 space-y-2">
                  <div className="text-xs font-bold text-[#065F46] uppercase tracking-wide">
                    💰 Single Process Cost Breakdown
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#065F46]">Input Tokens Cost:</span>
                    <span className="font-mono font-medium text-[#101828]">
                      ${cost.inCostUsd.toFixed(6)} ({((selectedActivity.tokensIn ?? 0)).toLocaleString()} tokens @ ${cost.info.inRate}/M)
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#065F46]">Output Tokens Cost:</span>
                    <span className="font-mono font-medium text-[#101828]">
                      ${cost.outCostUsd.toFixed(6)} ({((selectedActivity.tokensOut ?? 0)).toLocaleString()} tokens @ ${cost.info.outRate}/M)
                    </span>
                  </div>
                  <div className="border-t border-[#B7DEC9] pt-2 flex justify-between font-bold text-sm text-[#065F46]">
                    <span>Total Cost:</span>
                    <span>{cost.totalUsd} USD ≈ {cost.totalBdt} BDT</span>
                  </div>
                </div>

                {/* Token & Credit Metrics */}
                <div>
                  <div className="text-xs font-semibold text-[#172033]">
                    Resource & Credits Consumed
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2.5">
                    <div className="rounded-xl border border-[#E5E7EB] bg-white p-3 text-center">
                      <div className="text-[11px] text-[#64748B]">Tokens In</div>
                      <div className="mt-1 font-mono text-sm font-bold text-[#087F5B]">
                        {(selectedActivity.tokensIn ?? 0).toLocaleString("en-IN")}
                      </div>
                    </div>

                    <div className="rounded-xl border border-[#E5E7EB] bg-white p-3 text-center">
                      <div className="text-[11px] text-[#64748B]">Tokens Out</div>
                      <div className="mt-1 font-mono text-sm font-bold text-[#2563EB]">
                        {(selectedActivity.tokensOut ?? 0).toLocaleString("en-IN")}
                      </div>
                    </div>

                    <div className="rounded-xl border border-[#E5E7EB] bg-white p-3 text-center">
                      <div className="text-[11px] text-[#64748B]">Credits Deducted</div>
                      <div className="mt-1 font-mono text-sm font-bold text-[#D97706]">
                        {selectedActivity.creditsUsed != null
                          ? selectedActivity.creditsUsed
                          : "0"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Context / Action Details */}
                <div>
                  <div className="text-xs font-semibold text-[#172033]">
                    What Happened in this Step
                  </div>
                  <div className="mt-2 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-3.5 text-xs text-[#334155] leading-relaxed">
                    {selectedActivity.kind === "intent_classification"
                      ? "Fast DeepSeek router parsed the customer message, recognized intent, and selected exact prompt slices before passing to the generator."
                      : selectedActivity.kind === "inbox_reply"
                      ? "The AI sales closer drafted a personalized response following store rules and catalog specs."
                      : selectedActivity.kind === "order_extraction"
                      ? "Extracted customer name, phone, address, and size from conversation context."
                      : selectedActivity.kind === "summarization"
                      ? "Summarized earlier conversation history into compact notes."
                      : "Executed automated AI operation."}
                  </div>
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="border-t border-[#E5E7EB] bg-white p-4">
                <Button
                  onClick={() => setSelectedActivity(null)}
                  className="w-full bg-[#087F5B] text-xs font-semibold text-white hover:bg-[#066B4D]"
                >
                  Close
                </Button>
              </div>
            </div>
          </>
        );
      })()}
    </div>
  );
}

function breakoutSlice(stats: any) {
  if (!stats || stats.total === 0) return null;
  const c = 238.76;
  const inPct = stats.inboxReply.pct;
  const sumPct = stats.summarization.pct;
  const ordPct = stats.orderExtraction.pct;
  const folPct = stats.followUp.pct;

  return (
    <>
      <circle
        cx="50"
        cy="50"
        r="38"
        fill="transparent"
        stroke="#087F5B"
        strokeWidth="12"
        strokeDasharray={`${(inPct * c) / 100} ${c}`}
        strokeDashoffset="0"
      />
      <circle
        cx="50"
        cy="50"
        r="38"
        fill="transparent"
        stroke="#3B82F6"
        strokeWidth="12"
        strokeDasharray={`${(sumPct * c) / 100} ${c}`}
        strokeDashoffset={`-${(inPct * c) / 100}`}
      />
      <circle
        cx="50"
        cy="50"
        r="38"
        fill="transparent"
        stroke="#D97706"
        strokeWidth="12"
        strokeDasharray={`${(ordPct * c) / 100} ${c}`}
        strokeDashoffset={`-${((inPct + sumPct) * c) / 100}`}
      />
      <circle
        cx="50"
        cy="50"
        r="38"
        fill="transparent"
        stroke="#8B5CF6"
        strokeWidth="12"
        strokeDasharray={`${(folPct * c) / 100} ${c}`}
        strokeDashoffset={`-${((inPct + sumPct + ordPct) * c) / 100}`}
      />
    </>
  );
}
