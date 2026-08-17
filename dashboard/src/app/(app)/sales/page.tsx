"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { API, api, fmtTaka, timeAgo } from "@/lib/api";
import { usePage } from "@/components/PageProvider";
import { Badge, Button, Card, Spinner } from "@/lib/ui";
import {
  IconPlus,
  IconSearch,
  IconFilter,
  IconCalendar,
  IconShoppingBag,
  IconWallet,
  IconSparkles,
  IconTrendingUp,
  IconCircleDollar,
  IconMoreVertical,
  IconTrash,
  IconX,
  IconChevronDown,
  IconCheck,
  IconInfo,
} from "@/components/Icons";

interface Sale {
  id: string;
  quantity: number;
  amount: number;
  source: string;
  aiAssisted: boolean;
  createdAt: string;
  customerName: string | null;
  productName: string | null;
}

interface Customer {
  id: string;
  name: string | null;
}

interface Product {
  id: string;
  name: string;
  price?: number | null;
}

const SOURCES = [
  { value: "inbox", label: "AI Chat" },
  { value: "direct", label: "Manual" },
  { value: "follow_up", label: "Follow-up" },
  { value: "comment", label: "Other" },
];

export default function SalesPage() {
  const { pageId } = usePage();
  const [rows, setRows] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters & State
  const [dateRange, setDateRange] = useState<"7D" | "30D" | "90D" | "custom">("7D");
  const [metricSelector, setMetricSelector] = useState<"revenue" | "orders" | "aov">("revenue");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSource, setFilterSource] = useState<string>("all");
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Record Sale Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({
    customerId: "",
    productId: "",
    quantity: "1",
    amount: "",
    source: "inbox",
    aiAssisted: "true",
  });

  // Action popover
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [hoveredChartPoint, setHoveredChartPoint] = useState<{
    date: string;
    revenue: number;
    orders: number;
    x: number;
    y: number;
  } | null>(null);

  // Load data
  const load = useCallback(() => {
    if (!pageId) return;
    setLoading(true);
    setError("");
    Promise.all([
      api<Sale[]>(`/api/sales?pageId=${pageId}`),
      api<Customer[]>(`/api/customers?pageId=${pageId}`),
      api<Product[]>(`/api/products?pageId=${pageId}`),
    ])
      .then(([sales, custs, prods]) => {
        setRows(sales || []);
        setCustomers(custs || []);
        setProducts(prods || []);
      })
      .catch((e) => setError(e.message || "Failed to load sales data"))
      .finally(() => setLoading(false));
  }, [pageId]);

  useEffect(() => {
    load();
  }, [load]);

  // Real-time SSE listener
  useEffect(() => {
    if (!pageId) return;
    const es = new EventSource(`${API}/api/events?pageId=${pageId}`, { withCredentials: true });
    es.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.type === "sale") load();
      } catch {}
    };
    return () => es.close();
  }, [pageId, load]);

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside() {
      setActiveMenuId(null);
    }
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  // Filter rows by date range
  const filteredByDateRows = useMemo(() => {
    const now = new Date().getTime();
    let days = 7;
    if (dateRange === "30D") days = 30;
    if (dateRange === "90D") days = 90;
    if (dateRange === "custom") days = 14; // default custom window

    const cutoff = now - days * 24 * 60 * 60 * 1000;
    return rows.filter((r) => {
      const saleTime = new Date(r.createdAt).getTime();
      return saleTime >= cutoff;
    });
  }, [rows, dateRange]);

  // Filtered rows for the table (date + search + source)
  const displayRows = useMemo(() => {
    let list = filteredByDateRows;
    if (filterSource !== "all") {
      list = list.filter((r) => {
        if (filterSource === "inbox") return r.source === "inbox";
        if (filterSource === "direct") return r.source === "direct" || r.source === "manual";
        if (filterSource === "follow_up") return r.source === "follow_up";
        return r.source !== "inbox" && r.source !== "direct" && r.source !== "follow_up";
      });
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (r) =>
          (r.customerName && r.customerName.toLowerCase().includes(q)) ||
          (r.productName && r.productName.toLowerCase().includes(q)) ||
          r.id.toLowerCase().includes(q)
      );
    }
    return list;
  }, [filteredByDateRows, filterSource, searchQuery]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(displayRows.length / pageSize));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return displayRows.slice(start, start + pageSize);
  }, [displayRows, currentPage, pageSize]);

  // KPI Calculations
  const totalRevenue = useMemo(
    () => filteredByDateRows.reduce((sum, r) => sum + r.amount, 0),
    [filteredByDateRows]
  );
  const totalOrders = filteredByDateRows.length;
  const aov = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
  const aiAssistedCount = filteredByDateRows.filter((r) => r.aiAssisted).length;
  const aiPct = totalOrders > 0 ? Math.round((aiAssistedCount / totalOrders) * 100) : 0;

  // Range text
  const rangeLabelText = useMemo(() => {
    const end = new Date();
    let startDays = 7;
    if (dateRange === "30D") startDays = 30;
    if (dateRange === "90D") startDays = 90;
    if (dateRange === "custom") startDays = 14;

    const start = new Date(end.getTime() - startDays * 24 * 60 * 60 * 1000);
    const fmt = (d: Date) =>
      d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    return `${fmt(start)} - ${fmt(end)}`;
  }, [dateRange]);

  // Chart data: daily trend over the period
  const trendPoints = useMemo(() => {
    const daysCount = dateRange === "90D" ? 14 : dateRange === "30D" ? 10 : 7;
    const now = new Date();
    const points: Array<{ dateStr: string; label: string; revenue: number; orders: number }> = [];

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

      const daySales = filteredByDateRows.filter(
        (r) => r.createdAt.slice(0, 10) === dateStr
      );
      const rev = daySales.reduce((sum, r) => sum + r.amount, 0);
      points.push({ dateStr, label, revenue: rev, orders: daySales.length });
    }
    return points;
  }, [filteredByDateRows, dateRange]);

  // Sales by Source counts
  const sourceStats = useMemo(() => {
    let ai = 0;
    let manual = 0;
    let followUp = 0;
    let other = 0;

    filteredByDateRows.forEach((r) => {
      if (r.source === "inbox") ai++;
      else if (r.source === "direct" || r.source === "manual") manual++;
      else if (r.source === "follow_up") followUp++;
      else other++;
    });

    const total = filteredByDateRows.length;
    return {
      ai: { count: ai, pct: total ? Math.round((ai / total) * 100) : 0 },
      manual: { count: manual, pct: total ? Math.round((manual / total) * 100) : 0 },
      followUp: { count: followUp, pct: total ? Math.round((followUp / total) * 100) : 0 },
      other: { count: other, pct: total ? Math.round((other / total) * 100) : 0 },
      total,
    };
  }, [filteredByDateRows]);

  // Record Sale Form Handler
  async function handleRecordSale(e: React.FormEvent) {
    e.preventDefault();
    if (!form.customerId) {
      setFormError("Please select a customer.");
      return;
    }
    if (!form.amount || Number(form.amount) <= 0) {
      setFormError("Please enter a valid sale amount in BDT.");
      return;
    }

    setSaving(true);
    setFormError("");
    try {
      await api("/api/sales", {
        method: "POST",
        body: JSON.stringify({
          pageId,
          customerId: form.customerId,
          productId: form.productId || null,
          quantity: Number(form.quantity) || 1,
          amount: Number(form.amount),
          source: form.source,
          aiAssisted: form.aiAssisted === "true",
        }),
      });
      setModalOpen(false);
      setForm({
        customerId: "",
        productId: "",
        quantity: "1",
        amount: "",
        source: "inbox",
        aiAssisted: "true",
      });
      load();
    } catch (err: any) {
      setFormError(err.message || "Failed to record sale.");
    } finally {
      setSaving(false);
    }
  }

  // Delete sale handler
  async function handleDeleteSale(id: string) {
    try {
      await api(`/api/sales/${id}`, { method: "DELETE" });
      setDeleteConfirmId(null);
      load();
    } catch (err: any) {
      setError(err.message || "Failed to delete sale.");
    }
  }

  // Auto-fill amount when product is selected in form
  function handleProductSelect(productId: string) {
    setForm((prev) => {
      const prod = products.find((p) => p.id === productId);
      const newAmount = prod?.price ? String(prod.price * (Number(prev.quantity) || 1)) : prev.amount;
      return { ...prev, productId, amount: newAmount };
    });
  }

  // SVG Chart Dimensions & Math
  const chartHeight = 180;
  const chartWidth = 520;
  const paddingX = 45;
  const paddingY = 25;

  const maxVal = useMemo(() => {
    const vals = trendPoints.map((p) =>
      metricSelector === "revenue"
        ? p.revenue
        : metricSelector === "orders"
        ? p.orders
        : p.orders ? Math.round(p.revenue / p.orders) : 0
    );
    const m = Math.max(...vals, 0);
    if (metricSelector === "revenue") {
      return m > 0 ? Math.ceil(m / 1000) * 1000 : 4000;
    }
    return m > 0 ? Math.ceil(m / 5) * 5 : 10;
  }, [trendPoints, metricSelector]);

  const svgCoordinates = useMemo(() => {
    const n = trendPoints.length;
    if (n === 0) return [];
    const stepX = (chartWidth - paddingX * 2) / (n - 1 || 1);

    return trendPoints.map((p, i) => {
      const val =
        metricSelector === "revenue"
          ? p.revenue
          : metricSelector === "orders"
          ? p.orders
          : p.orders ? Math.round(p.revenue / p.orders) : 0;
      const x = paddingX + i * stepX;
      const y = chartHeight - paddingY - (val / (maxVal || 1)) * (chartHeight - paddingY * 2);
      return { x, y, point: p, val };
    });
  }, [trendPoints, metricSelector, maxVal]);

  const linePathD = useMemo(() => {
    if (svgCoordinates.length === 0) return "";
    return svgCoordinates.reduce(
      (acc, c, i) => (i === 0 ? `M ${c.x} ${c.y}` : `${acc} L ${c.x} ${c.y}`),
      ""
    );
  }, [svgCoordinates]);

  const areaPathD = useMemo(() => {
    if (svgCoordinates.length === 0) return "";
    const first = svgCoordinates[0];
    const last = svgCoordinates[svgCoordinates.length - 1];
    const bottomY = chartHeight - paddingY;
    return `${linePathD} L ${last.x} ${bottomY} L ${first.x} ${bottomY} Z`;
  }, [svgCoordinates, linePathD]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-16">
      {/* 1. Header Section */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[28px] font-bold leading-tight tracking-tight text-[#101828]">
            Sales Overview
          </h1>
          <p className="mt-0.5 text-xs text-[#64748B]">
            Track and analyze your sales performance.
          </p>
        </div>

        <Button
          onClick={() => setModalOpen(true)}
          className="h-10 rounded-lg bg-[#087F5B] px-4.5 text-xs font-semibold text-white shadow-xs hover:bg-[#066B4D] active:bg-[#05573D]"
        >
          <IconPlus size={16} />
          <span>Record Sale</span>
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-danger/30 bg-danger-soft p-4 text-xs font-medium text-danger">
          <IconInfo size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* 2. Top 4 KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI 1: Total Revenue */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B]">Total Revenue</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E8F5EF] text-[#087F5B]">
              <IconCircleDollar size={18} />
            </div>
          </div>
          <div className="mt-2">
            <span className="font-display text-2xl font-bold tracking-tight text-[#101828]">
              {loading ? "…" : fmtTaka(totalRevenue)}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-[#087F5B]">
            <IconTrendingUp size={14} />
            <span>0% vs last {dateRange === "7D" ? "7 days" : dateRange}</span>
          </div>
        </Card>

        {/* KPI 2: Orders */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B]">Orders</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EFF6FF] text-[#2563EB]">
              <IconShoppingBag size={18} />
            </div>
          </div>
          <div className="mt-2">
            <span className="font-display text-2xl font-bold tracking-tight text-[#101828]">
              {loading ? "…" : totalOrders}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-[#087F5B]">
            <IconTrendingUp size={14} />
            <span>0% vs last {dateRange === "7D" ? "7 days" : dateRange}</span>
          </div>
        </Card>

        {/* KPI 3: Average Order Value */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B]">
              Average Order Value
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F3E8FF] text-[#8B5CF6]">
              <IconWallet size={18} />
            </div>
          </div>
          <div className="mt-2">
            <span className="font-display text-2xl font-bold tracking-tight text-[#101828]">
              {loading ? "…" : fmtTaka(aov)}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-[#087F5B]">
            <IconTrendingUp size={14} />
            <span>0% vs last {dateRange === "7D" ? "7 days" : dateRange}</span>
          </div>
        </Card>

        {/* KPI 4: AI-Assisted Orders */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B]">
              AI-Assisted Orders
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FFF4E5] text-[#D97706]">
              <IconSparkles size={18} />
            </div>
          </div>
          <div className="mt-2">
            <span className="font-display text-2xl font-bold tracking-tight text-[#101828]">
              {loading ? "…" : aiAssistedCount}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-[#64748B]">
            <span>{aiPct}% of total orders</span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#F1F5F9]">
            <div
              className="h-full rounded-full bg-[#087F5B] transition-all duration-300"
              style={{ width: `${Math.min(100, aiPct)}%` }}
            />
          </div>
        </Card>
      </div>

      {/* 3. Date Range Filter Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Quick Range Pills */}
        <div className="inline-flex items-center rounded-lg border border-[#E5E7EB] bg-white p-1 shadow-2xs">
          {(["7D", "30D", "90D", "custom"] as const).map((r) => {
            const active = dateRange === r;
            return (
              <button
                key={r}
                type="button"
                onClick={() => setDateRange(r)}
                className={`flex items-center gap-1 rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                  active
                    ? "border border-[#B7DEC9] bg-[#E8F5EF] text-[#087F5B]"
                    : "text-[#64748B] hover:text-[#172033]"
                }`}
              >
                <span>{r === "custom" ? "Custom" : r}</span>
                {r === "custom" && <IconCalendar size={13} />}
              </button>
            );
          })}
        </div>

        {/* Right Filter & Date Picker Display */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={() => setShowFilterDrawer(!showFilterDrawer)}
            className="h-9 border-[#D9E2E8] bg-white px-3 text-xs font-semibold text-[#172033]"
          >
            <IconFilter size={14} className="text-[#64748B]" />
            <span>Filters</span>
          </Button>

          <div className="flex h-9 items-center gap-1.5 rounded-lg border border-[#D9E2E8] bg-white px-3 text-xs font-medium text-[#334155] shadow-2xs">
            <span>{rangeLabelText}</span>
            <IconCalendar size={14} className="text-[#64748B]" />
          </div>
        </div>
      </div>

      {/* Filter Drawer (if toggled) */}
      {showFilterDrawer && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-2xs">
          <div className="w-48">
            <label className="mb-1 block text-[11px] font-semibold text-[#64748B]">
              Filter by Source
            </label>
            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
              className="h-8 w-full rounded-lg border border-[#D9E2E8] bg-white px-2.5 text-xs text-[#172033] focus:border-[#087F5B] focus:outline-none"
            >
              <option value="all">All Sources</option>
              <option value="inbox">AI Chat</option>
              <option value="direct">Manual</option>
              <option value="follow_up">Follow-up</option>
              <option value="comment">Other</option>
            </select>
          </div>

          <div className="flex-1">
            <label className="mb-1 block text-[11px] font-semibold text-[#64748B]">
              Search Customer or Product
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search sales..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 w-full rounded-lg border border-[#D9E2E8] bg-white pr-7 pl-2.5 text-xs text-[#172033] placeholder:text-[#94A3B8] focus:border-[#087F5B] focus:outline-none"
              />
              <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[#94A3B8]">
                <IconSearch size={13} />
              </div>
            </div>
          </div>

          <div className="mt-4">
            <Button
              variant="ghost"
              onClick={() => {
                setFilterSource("all");
                setSearchQuery("");
              }}
              className="h-8 px-3 text-xs text-[#64748B]"
            >
              Reset
            </Button>
          </div>
        </div>
      )}

      {/* 4. Analytics Section (2 Columns: Revenue Trend + Sales by Source) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Card: Revenue Trend (~65% width / 8 cols) */}
        <Card className="p-6 lg:col-span-8">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#172033]">
              Revenue Trend
            </h2>
            <select
              value={metricSelector}
              onChange={(e) => setMetricSelector(e.target.value as any)}
              className="h-8 rounded-lg border border-[#D9E2E8] bg-white px-2.5 text-xs font-semibold text-[#172033] shadow-2xs focus:border-[#087F5B] focus:outline-none"
            >
              <option value="revenue">Revenue</option>
              <option value="orders">Orders</option>
              <option value="aov">Average Order Value</option>
            </select>
          </div>

          {/* SVG Line Chart */}
          <div className="relative mt-6 h-56 w-full">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="h-full w-full overflow-visible"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#087F5B" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#087F5B" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Horizontal Gridlines */}
              {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                const y = chartHeight - paddingY - pct * (chartHeight - paddingY * 2);
                const valLabel =
                  metricSelector === "revenue"
                    ? `৳${Math.round((maxVal * pct) / 1000)}k`
                    : `${Math.round(maxVal * pct)}`;
                return (
                  <g key={idx}>
                    <line
                      x1={paddingX}
                      y1={y}
                      x2={chartWidth - 10}
                      y2={y}
                      stroke="#E5E7EB"
                      strokeDasharray={pct === 0 ? "0" : "3 3"}
                      strokeWidth="1"
                    />
                    <text
                      x={paddingX - 8}
                      y={y + 4}
                      textAnchor="end"
                      fontSize="9"
                      fill="#94A3B8"
                      fontFamily="Inter, sans-serif"
                    >
                      {pct === 0 ? "৳0" : valLabel}
                    </text>
                  </g>
                );
              })}

              {/* Area Gradient Fill */}
              {areaPathD && <path d={areaPathD} fill="url(#salesGrad)" />}

              {/* Primary Green Line */}
              {linePathD && (
                <path
                  d={linePathD}
                  fill="none"
                  stroke="#087F5B"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Data Point Circles */}
              {svgCoordinates.map((c, idx) => (
                <g key={idx}>
                  <circle
                    cx={c.x}
                    cy={c.y}
                    r="4"
                    fill="#FFFFFF"
                    stroke="#087F5B"
                    strokeWidth="2"
                    className="cursor-pointer transition-transform hover:scale-150"
                    onMouseEnter={() =>
                      setHoveredChartPoint({
                        date: c.point.label,
                        revenue: c.point.revenue,
                        orders: c.point.orders,
                        x: c.x,
                        y: c.y,
                      })
                    }
                    onMouseLeave={() => setHoveredChartPoint(null)}
                  />
                  {/* X-axis date labels */}
                  <text
                    x={c.x}
                    y={chartHeight - 6}
                    textAnchor="middle"
                    fontSize="9"
                    fill="#64748B"
                    fontFamily="Inter, sans-serif"
                  >
                    {c.point.label}
                  </text>
                </g>
              ))}
            </svg>

            {/* Interactive Tooltip */}
            {hoveredChartPoint && (
              <div
                className="pointer-events-none absolute z-20 rounded-lg border border-[#E5E7EB] bg-[#101828] px-2.5 py-1.5 text-[11px] text-white shadow-lg"
                style={{
                  left: `${(hoveredChartPoint.x / chartWidth) * 100}%`,
                  top: `${Math.max(0, (hoveredChartPoint.y / chartHeight) * 100 - 35)}%`,
                  transform: "translate(-50%, -100%)",
                }}
              >
                <div className="font-semibold">{hoveredChartPoint.date}</div>
                <div className="text-[#34D399]">
                  Revenue: {fmtTaka(hoveredChartPoint.revenue)}
                </div>
                <div className="text-[#94A3B8]">
                  Orders: {hoveredChartPoint.orders}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Right Card: Sales by Source (~35% width / 4 cols) */}
        <Card className="p-6 lg:col-span-4">
          <h2 className="text-base font-semibold text-[#172033]">
            Sales by Source
          </h2>

          <div className="mt-4 flex flex-col items-center justify-center">
            {/* SVG Donut Ring */}
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
                {sourceStats.total > 0 && (
                  <>
                    {/* AI Chat slice */}
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="transparent"
                      stroke="#3B82F6"
                      strokeWidth="12"
                      strokeDasharray={`${(sourceStats.ai.pct * 238.76) / 100} 238.76`}
                      strokeDashoffset="0"
                    />
                    {/* Manual slice */}
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="transparent"
                      stroke="#F59E0B"
                      strokeWidth="12"
                      strokeDasharray={`${(sourceStats.manual.pct * 238.76) / 100} 238.76`}
                      strokeDashoffset={`-${(sourceStats.ai.pct * 238.76) / 100}`}
                    />
                    {/* Follow-up slice */}
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="transparent"
                      stroke="#8B5CF6"
                      strokeWidth="12"
                      strokeDasharray={`${(sourceStats.followUp.pct * 238.76) / 100} 238.76`}
                      strokeDashoffset={`-${
                        ((sourceStats.ai.pct + sourceStats.manual.pct) * 238.76) / 100
                      }`}
                    />
                  </>
                )}
              </svg>

              {/* Donut Center text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                {sourceStats.total === 0 ? (
                  <div className="text-xs font-semibold text-[#94A3B8]">
                    No data
                    <br />
                    yet
                  </div>
                ) : (
                  <>
                    <span className="font-display text-xl font-bold text-[#101828]">
                      {sourceStats.total}
                    </span>
                    <span className="text-[10px] text-[#64748B]">Total Sales</span>
                  </>
                )}
              </div>
            </div>

            {/* Legend List */}
            <div className="mt-4 w-full space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#3B82F6]" />
                  <span className="text-[#334155]">AI Chat</span>
                </div>
                <span className="font-semibold text-[#172033]">
                  {sourceStats.ai.count} ({sourceStats.ai.pct}%)
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#F59E0B]" />
                  <span className="text-[#334155]">Manual</span>
                </div>
                <span className="font-semibold text-[#172033]">
                  {sourceStats.manual.count} ({sourceStats.manual.pct}%)
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#8B5CF6]" />
                  <span className="text-[#334155]">Follow-up</span>
                </div>
                <span className="font-semibold text-[#172033]">
                  {sourceStats.followUp.count} ({sourceStats.followUp.pct}%)
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#64748B]" />
                  <span className="text-[#334155]">Other</span>
                </div>
                <span className="font-semibold text-[#172033]">
                  {sourceStats.other.count} ({sourceStats.other.pct}%)
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* 5. Recent Sales Section */}
      <Card className="overflow-hidden p-0">
        <div className="border-b border-[#E5E7EB] p-5">
          <h2 className="text-base font-semibold text-[#172033]">Recent Sales</h2>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Spinner />
          </div>
        ) : displayRows.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] text-2xl shadow-2xs">
              🛍️
            </div>
            <h3 className="mt-4 text-base font-bold text-[#101828]">
              No sales recorded yet.
            </h3>
            <p className="mt-1 text-xs text-[#64748B]">
              Record your first sale to see it here.
            </p>
            <Button
              onClick={() => setModalOpen(true)}
              className="mt-5 h-9 bg-[#087F5B] px-4 text-xs font-semibold text-white hover:bg-[#066B4D]"
            >
              Record Sale
            </Button>
          </div>
        ) : (
          /* Data Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#E5E7EB] bg-[#F8FAFC] text-[11px] font-semibold text-[#64748B]">
                <tr>
                  <th className="px-5 py-3">Date & Time</th>
                  <th className="px-4 py-3">Order ID</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Items</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">AI Assisted</th>
                  <th className="px-4 py-3">Payment Method</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {paginatedRows.map((s) => {
                  const initials = s.customerName
                    ? s.customerName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()
                    : "CU";

                  return (
                    <tr key={s.id} className="hover:bg-[#FAFCFB]">
                      {/* Date & Time */}
                      <td className="px-5 py-3.5 text-[#334155]">
                        <div className="font-medium text-[#172033]">
                          {new Date(s.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </div>
                        <div className="text-[11px] text-[#64748B]">
                          {timeAgo(s.createdAt)}
                        </div>
                      </td>

                      {/* Order ID */}
                      <td className="px-4 py-3.5 font-mono text-[11px] text-[#64748B]">
                        #ORD-{s.id.slice(0, 6).toUpperCase()}
                      </td>

                      {/* Customer */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#E8F5EF] text-[11px] font-bold text-[#087F5B]">
                            {initials}
                          </div>
                          <span className="font-semibold text-[#172033]">
                            {s.customerName ?? "Guest"}
                          </span>
                        </div>
                      </td>

                      {/* Source */}
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center rounded-md bg-[#F1F5F9] px-2 py-0.5 text-[11px] font-medium text-[#334155] capitalize">
                          {s.source === "inbox" ? "AI Chat" : s.source.replace("_", " ")}
                        </span>
                      </td>

                      {/* Items */}
                      <td className="px-4 py-3.5 text-[#172033]">
                        {s.productName ? (
                          <span>
                            {s.productName}{" "}
                            <span className="text-[#64748B]">(x{s.quantity})</span>
                          </span>
                        ) : (
                          <span className="text-[#64748B]">Custom Item (x{s.quantity})</span>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3.5 font-display font-bold text-[#172033]">
                        {fmtTaka(s.amount)}
                      </td>

                      {/* AI Assisted */}
                      <td className="px-4 py-3.5">
                        {s.aiAssisted ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#087F5B]">
                            <IconCheck size={13} /> Yes
                          </span>
                        ) : (
                          <span className="text-[11px] text-[#94A3B8]">— No</span>
                        )}
                      </td>

                      {/* Payment Method */}
                      <td className="px-4 py-3.5 text-[#64748B]">Cash on Delivery</td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center rounded-full bg-[#E8F5EF] px-2.5 py-0.5 text-[11px] font-semibold text-[#087F5B]">
                          Completed
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="relative px-4 py-3.5 text-right">
                        <button
                          type="button"
                          aria-label="Actions"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(activeMenuId === s.id ? null : s.id);
                          }}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#172033]"
                        >
                          <IconMoreVertical size={15} />
                        </button>

                        {/* Action Menu */}
                        {activeMenuId === s.id && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-4 z-30 mt-1 w-32 rounded-xl border border-[#E5E7EB] bg-white p-1 text-left shadow-lg"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuId(null);
                                setDeleteConfirmId(s.id);
                              }}
                              className="flex w-full items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-[#C24141] hover:bg-[#FEECEC]"
                            >
                              <IconTrash size={13} />
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Bottom Pagination Bar */}
        {displayRows.length > 0 && (
          <div className="flex flex-col items-center justify-between gap-3 border-t border-[#E5E7EB] p-4 text-xs text-[#64748B] sm:flex-row">
            <div className="flex items-center gap-2">
              <span>Show</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="h-8 rounded-lg border border-[#D9E2E8] bg-white px-2 text-xs text-[#172033] focus:outline-none"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span>entries</span>
            </div>

            <div className="flex items-center gap-3">
              <span>
                {(currentPage - 1) * pageSize + 1}–
                {Math.min(currentPage * pageSize, displayRows.length)} of {displayRows.length}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="h-8 px-2.5 text-xs"
                >
                  Previous
                </Button>
                <Button
                  variant="ghost"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="h-8 px-2.5 text-xs"
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* 6. Record Sale Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#101828]">Record Sale</h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-[#64748B] hover:bg-[#F1F5F9]"
              >
                <IconX size={16} />
              </button>
            </div>

            <form onSubmit={handleRecordSale} className="mt-4 space-y-4">
              {/* Customer */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#334155]">
                  Customer <span className="text-danger">*</span>
                </label>
                <select
                  required
                  value={form.customerId}
                  onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                  className="h-10 w-full rounded-lg border border-[#D9E2E8] bg-white px-3 text-xs text-[#172033] shadow-2xs focus:border-[#087F5B] focus:outline-none"
                >
                  <option value="">Select customer…</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name ? `${c.name} (${c.id.slice(0, 8)})` : `Customer ${c.id.slice(0, 8)}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Product */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#334155]">
                  Product (Optional)
                </label>
                <select
                  value={form.productId}
                  onChange={(e) => handleProductSelect(e.target.value)}
                  className="h-10 w-full rounded-lg border border-[#D9E2E8] bg-white px-3 text-xs text-[#172033] shadow-2xs focus:border-[#087F5B] focus:outline-none"
                >
                  <option value="">None / Custom Item</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.price ? `(৳${p.price})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity & Amount */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#334155]">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    className="h-10 w-full rounded-lg border border-[#D9E2E8] bg-white px-3 text-xs text-[#172033] shadow-2xs focus:border-[#087F5B] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#334155]">
                    Amount (BDT) <span className="text-danger">*</span>
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-xs font-semibold text-[#64748B]">
                      ৳
                    </span>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="1790"
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                      className="h-10 w-full rounded-lg border border-[#D9E2E8] bg-white pr-3 pl-7 text-xs font-semibold text-[#172033] shadow-2xs focus:border-[#087F5B] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Source & AI Assisted */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#334155]">
                    Source
                  </label>
                  <select
                    value={form.source}
                    onChange={(e) => setForm({ ...form, source: e.target.value })}
                    className="h-10 w-full rounded-lg border border-[#D9E2E8] bg-white px-3 text-xs text-[#172033] shadow-2xs focus:border-[#087F5B] focus:outline-none"
                  >
                    {SOURCES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#334155]">
                    Assisted By
                  </label>
                  <select
                    value={form.aiAssisted}
                    onChange={(e) => setForm({ ...form, aiAssisted: e.target.value })}
                    className="h-10 w-full rounded-lg border border-[#D9E2E8] bg-white px-3 text-xs text-[#172033] shadow-2xs focus:border-[#087F5B] focus:outline-none"
                  >
                    <option value="true">AI Assistant</option>
                    <option value="false">Human Agent</option>
                  </select>
                </div>
              </div>

              {formError && <p className="text-xs text-danger">{formError}</p>}

              <div className="mt-6 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-[#087F5B] text-white hover:bg-[#066B4D]"
                >
                  {saving ? "Saving…" : "Save Sale"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs"
          onClick={() => setDeleteConfirmId(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-[#101828]">Delete sale?</h3>
            <p className="mt-2 text-xs text-[#64748B]">
              This sale record will be removed. This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setDeleteConfirmId(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => handleDeleteSale(deleteConfirmId)}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
