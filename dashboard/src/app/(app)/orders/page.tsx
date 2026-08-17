"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { API, api, fmtTaka, timeAgo } from "@/lib/api";
import { usePage } from "@/components/PageProvider";
import { Badge, Button, Card, EmptyState, Spinner } from "@/lib/ui";
import {
  IconSearch,
  IconFilter,
  IconCalendar,
  IconCheck,
  IconX,
  IconMoreVertical,
  IconTrash,
  IconEye,
  IconMaximize,
  IconPackage,
  IconInfo,
  IconChevronDown,
  IconPhone,
  IconUser,
  IconShoppingBag,
} from "@/components/Icons";

interface OrderSummary {
  id: string;
  customerName: string | null;
  phone: string | null;
  address: string | null;
  productName: string | null;
  sizeVariant: string | null;
  paymentMethod: string | null;
  totalAmount: number | null;
  remainingAmount: number | null;
  status: string; // pending, confirmed (verified), rejected
  createdAt: string;
}

interface OrderDetail extends OrderSummary {
  deliveryCharge: number | null;
  paymentNumber: string | null;
  screenshotUrl: string | null;
  rejectionReason: string | null;
}

export default function OrdersPage() {
  const { pageId } = usePage();
  const [rows, setRows] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "verified" | "rejected">("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);

  // Pagination & Selection
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Drawer / Overlay State
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [confirmStep, setConfirmStep] = useState<"" | "verify" | "reject">("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Action popover
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Load orders
  const load = useCallback(() => {
    if (!pageId) return;
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ pageId });
    api<OrderSummary[]>(`/api/orders?${params}`)
      .then((data) => {
        setRows(data || []);
      })
      .catch((e) => setError(e.message || "Failed to load orders"))
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
        if (payload.type === "order" || payload.type === "sale") load();
      } catch {}
    };
    return () => es.close();
  }, [pageId, load]);

  // ESC key listener to close drawer & lightbox
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (lightboxUrl) {
          setLightboxUrl(null);
        } else if (selectedOrderId) {
          setSelectedOrderId(null);
          setDetail(null);
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxUrl, selectedOrderId]);

  // Lock background scroll when drawer is open
  useEffect(() => {
    if (selectedOrderId) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedOrderId]);

  // Fetch full order detail when drawer opens
  async function openDrawer(orderId: string) {
    setSelectedOrderId(orderId);
    setDetailLoading(true);
    setConfirmStep("");
    setRejectionReason("");
    try {
      const d = await api<OrderDetail>(`/api/orders/${orderId}`);
      setDetail(d);
    } catch (err: any) {
      setError(err.message || "Failed to load order detail");
    } finally {
      setDetailLoading(false);
    }
  }

  function closeDrawer() {
    setSelectedOrderId(null);
    setDetail(null);
    setConfirmStep("");
    setRejectionReason("");
  }

  // Verify order handler
  async function handleVerify() {
    if (!selectedOrderId) return;
    setActionBusy(true);
    setError("");
    try {
      await api(`/api/orders/${selectedOrderId}/verify`, { method: "POST" });
      setConfirmStep("");
      // Refresh details and list
      const updated = await api<OrderDetail>(`/api/orders/${selectedOrderId}`);
      setDetail(updated);
      load();
    } catch (err: any) {
      setError(err.message || "Failed to verify order.");
    } finally {
      setActionBusy(false);
    }
  }

  // Reject order handler
  async function handleReject() {
    if (!selectedOrderId) return;
    if (!rejectionReason.trim()) {
      setError("Please provide a reason for rejection.");
      return;
    }
    setActionBusy(true);
    setError("");
    try {
      await api(`/api/orders/${selectedOrderId}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason: rejectionReason.trim() }),
      });
      setConfirmStep("");
      const updated = await api<OrderDetail>(`/api/orders/${selectedOrderId}`);
      setDetail(updated);
      load();
    } catch (err: any) {
      setError(err.message || "Failed to reject order.");
    } finally {
      setActionBusy(false);
    }
  }

  // Dynamic status tab counts
  const counts = useMemo(() => {
    let pending = 0;
    let verified = 0;
    let rejected = 0;
    rows.forEach((r) => {
      if (r.status === "pending") pending++;
      else if (r.status === "confirmed") verified++;
      else if (r.status === "rejected") rejected++;
    });
    return { all: rows.length, pending, verified, rejected };
  }, [rows]);

  // Filtered orders list
  const filteredRows = useMemo(() => {
    let list = rows;

    // Status Tab Filter
    if (activeTab === "pending") {
      list = list.filter((r) => r.status === "pending");
    } else if (activeTab === "verified") {
      list = list.filter((r) => r.status === "confirmed");
    } else if (activeTab === "rejected") {
      list = list.filter((r) => r.status === "rejected");
    }

    // Payment Method Filter
    if (paymentFilter !== "all") {
      list = list.filter((r) => {
        const pm = (r.paymentMethod || "").toLowerCase();
        if (paymentFilter === "cod") return pm === "cod";
        if (paymentFilter === "bkash") return pm.includes("bkash");
        if (paymentFilter === "nagad") return pm.includes("nagad");
        if (paymentFilter === "full") return pm === "full";
        return true;
      });
    }

    // Search Query (Customer name, phone, order ID)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (r) =>
          (r.customerName && r.customerName.toLowerCase().includes(q)) ||
          (r.phone && r.phone.toLowerCase().includes(q)) ||
          (r.productName && r.productName.toLowerCase().includes(q)) ||
          r.id.toLowerCase().includes(q)
      );
    }

    return list;
  }, [rows, activeTab, paymentFilter, searchQuery]);

  // Paginated Rows
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  // Checkbox helpers
  const allPageSelected =
    paginatedRows.length > 0 && paginatedRows.every((r) => selectedIds.includes(r.id));

  function toggleSelectAll() {
    if (allPageSelected) {
      setSelectedIds((prev) =>
        prev.filter((id) => !paginatedRows.some((r) => r.id === id))
      );
    } else {
      setSelectedIds((prev) =>
        Array.from(new Set([...prev, ...paginatedRows.map((r) => r.id)]))
      );
    }
  }

  function toggleSelectRow(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }

  // Format Order ID
  function fmtOrderId(id: string) {
    return `#ORD-${id.slice(0, 5).toUpperCase()}`;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-16">
      {/* 1. Header Section */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[28px] font-bold leading-tight tracking-tight text-[#101828]">
            Orders
          </h1>
          <p className="text-xs text-[#64748B]">
            Manage and track all orders received through the bot.
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-danger/30 bg-danger-soft p-4 text-xs font-medium text-danger">
          <IconInfo size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* 2. Status Tabs */}
      <div className="flex items-center gap-6 border-b border-[#E5E7EB] text-xs font-semibold">
        {(
          [
            { key: "all", label: "All", count: counts.all },
            { key: "pending", label: "Pending", count: counts.pending },
            { key: "verified", label: "Verified", count: counts.verified },
            { key: "rejected", label: "Rejected", count: counts.rejected },
          ] as const
        ).map((tab) => {
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setActiveTab(tab.key);
                setCurrentPage(1);
              }}
              className={`relative flex items-center gap-1.5 pb-3 transition-colors ${
                active ? "text-[#087F5B]" : "text-[#64748B] hover:text-[#172033]"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] ${
                  active
                    ? "bg-[#E8F5EF] font-bold text-[#087F5B]"
                    : "bg-[#F1F5F9] font-medium text-[#64748B]"
                }`}
              >
                {tab.count}
              </span>
              {active && (
                <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-t-full bg-[#087F5B]" />
              )}
            </button>
          );
        })}
      </div>

      {/* 3. Filter Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Left Filters: Payment Method & Date */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Payment Method Dropdown */}
          <select
            value={paymentFilter}
            onChange={(e) => {
              setPaymentFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="h-9 rounded-lg border border-[#D9E2E8] bg-white px-3 text-xs font-medium text-[#172033] shadow-2xs focus:border-[#087F5B] focus:outline-none"
          >
            <option value="all">All payment methods</option>
            <option value="cod">Cash on Delivery</option>
            <option value="bkash">bKash</option>
            <option value="nagad">Nagad</option>
            <option value="full">Full Payment</option>
          </select>

          {/* Date Range Selector Display */}
          <div className="flex h-9 items-center gap-1.5 rounded-lg border border-[#D9E2E8] bg-white px-3 text-xs font-medium text-[#334155] shadow-2xs">
            <span>Date range</span>
            <IconCalendar size={14} className="text-[#64748B]" />
          </div>
        </div>

        {/* Right Search & Extra Filter Button */}
        <div className="flex items-center gap-2">
          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <input
              type="text"
              placeholder="Search by customer, phone or order ID..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="h-9 w-full rounded-lg border border-[#D9E2E8] bg-white pr-8 pl-3 text-xs text-[#172033] placeholder:text-[#94A3B8] shadow-2xs focus:border-[#087F5B] focus:outline-none"
            />
            <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-[#94A3B8]">
              <IconSearch size={14} />
            </div>
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

      {/* Advanced Filter Drawer (if toggled) */}
      {showFilterDrawer && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-2xs">
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-[#64748B]">
              Payment Method
            </label>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="h-8 rounded-lg border border-[#D9E2E8] px-2.5 text-xs text-[#172033]"
            >
              <option value="all">All</option>
              <option value="cod">Cash on Delivery</option>
              <option value="bkash">bKash</option>
              <option value="nagad">Nagad</option>
            </select>
          </div>

          <div className="flex-1">
            <label className="mb-1 block text-[11px] font-semibold text-[#64748B]">
              Quick Search
            </label>
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 w-full rounded-lg border border-[#D9E2E8] px-2.5 text-xs"
            />
          </div>

          <div className="mt-4">
            <Button
              variant="ghost"
              onClick={() => {
                setPaymentFilter("all");
                setSearchQuery("");
                setActiveTab("all");
              }}
              className="h-8 px-3 text-xs text-[#64748B]"
            >
              Reset Filters
            </Button>
          </div>
        </div>
      )}

      {/* Bulk Selection Action Bar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-[#B7DEC9] bg-[#E8F5EF] p-3 text-xs font-semibold text-[#087F5B] shadow-2xs">
          <span>{selectedIds.length} orders selected</span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={() => setSelectedIds([])}
              className="h-7 border-[#B7DEC9] bg-white px-2.5 text-xs text-[#172033]"
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* 4. Main Orders Table (100% Full Width) */}
      <Card className="overflow-hidden p-0">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Spinner />
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] text-2xl shadow-2xs">
              📦
            </div>
            <h3 className="mt-4 text-base font-bold text-[#101828]">
              {searchQuery || paymentFilter !== "all" || activeTab !== "all"
                ? "No matching orders found"
                : "No orders recorded yet."}
            </h3>
            <p className="mt-1 text-xs text-[#64748B]">
              {searchQuery || paymentFilter !== "all" || activeTab !== "all"
                ? "Try adjusting your search terms or filters."
                : "Orders received through your bot will appear here."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#E5E7EB] bg-[#F8FAFC] text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                <tr>
                  <th className="w-10 px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={allPageSelected}
                      onChange={toggleSelectAll}
                      className="h-3.5 w-3.5 rounded-xs border-[#D9E2E8] text-[#087F5B] accent-[#087F5B]"
                    />
                  </th>
                  <th className="px-4 py-3">Order ID</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Received At</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {paginatedRows.map((o) => {
                  const isChecked = selectedIds.includes(o.id);
                  const isSelected = selectedOrderId === o.id;

                  // Status pill styling
                  const statusInfo =
                    o.status === "confirmed"
                      ? { label: "Verified", bg: "bg-[#E8F7EF]", text: "text-[#087F5B]" }
                      : o.status === "rejected"
                      ? { label: "Rejected", bg: "bg-[#FDECEC]", text: "text-[#C9363E]" }
                      : { label: "Pending", bg: "bg-[#FFF4E5]", text: "text-[#C77700]" };

                  // Payment method label
                  const paymentDisplay =
                    o.paymentMethod === "cod"
                      ? "COD"
                      : o.paymentMethod === "full"
                      ? "Full Payment"
                      : o.paymentMethod
                      ? o.paymentMethod.toUpperCase()
                      : "COD";

                  return (
                    <tr
                      key={o.id}
                      onClick={() => openDrawer(o.id)}
                      className={`cursor-pointer transition-colors hover:bg-[#FAFCFB] ${
                        isSelected ? "bg-[#E8F5EF]/40" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td
                        className="px-4 py-3.5 text-center"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelectRow(o.id);
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectRow(o.id)}
                          className="h-3.5 w-3.5 rounded-xs border-[#D9E2E8] text-[#087F5B] accent-[#087F5B]"
                        />
                      </td>

                      {/* Order ID */}
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-[#101828]">
                          {fmtOrderId(o.id)}
                        </div>
                        {o.phone && (
                          <div className="text-[11px] text-[#64748B]">{o.phone}</div>
                        )}
                      </td>

                      {/* Customer */}
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-[#172033]">
                          {o.customerName ?? "Unknown customer"}
                        </div>
                        {o.phone && (
                          <div className="text-[11px] text-[#64748B]">{o.phone}</div>
                        )}
                      </td>

                      {/* Product & Variant */}
                      <td className="max-w-[220px] px-4 py-3.5">
                        <div className="truncate font-medium text-[#172033]" title={o.productName ?? ""}>
                          {o.productName ?? "—"}
                        </div>
                        {o.sizeVariant && (
                          <div className="text-[11px] text-[#64748B]">
                            ({o.sizeVariant})
                          </div>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3.5 font-display font-bold text-[#172033]">
                        {fmtTaka(o.totalAmount)}
                      </td>

                      {/* Payment Method */}
                      <td className="px-4 py-3.5 font-medium text-[#334155]">
                        {paymentDisplay}
                      </td>

                      {/* Status Badge */}
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusInfo.bg} ${statusInfo.text}`}
                        >
                          {statusInfo.label}
                        </span>
                      </td>

                      {/* Received At */}
                      <td className="px-4 py-3.5 text-[#334155]">
                        <div className="font-medium text-[#172033]">
                          {new Date(o.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </div>
                        <div className="text-[11px] text-[#64748B]">
                          {new Date(o.createdAt).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })}
                        </div>
                      </td>

                      {/* Actions */}
                      <td
                        className="px-4 py-3.5 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            onClick={() => openDrawer(o.id)}
                            className="h-7 border-[#D9E2E8] bg-white px-2.5 text-xs font-semibold text-[#172033] shadow-2xs hover:bg-[#F8FAFC]"
                          >
                            View
                          </Button>

                          <button
                            type="button"
                            aria-label="Actions"
                            onClick={() =>
                              setActiveMenuId(activeMenuId === o.id ? null : o.id)
                            }
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-[#64748B] hover:bg-[#F1F5F9]"
                          >
                            <IconMoreVertical size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 5. Pagination Bar */}
        {filteredRows.length > 0 && (
          <div className="flex flex-col items-center justify-between gap-3 border-t border-[#E5E7EB] p-4 text-xs text-[#64748B] sm:flex-row">
            <div>
              Showing {(currentPage - 1) * pageSize + 1} to{" "}
              {Math.min(currentPage * pageSize, filteredRows.length)} of{" "}
              {filteredRows.length} orders
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
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
                    onClick={() => setCurrentPage(pageNum)}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold transition-colors ${
                      currentPage === pageNum
                        ? "bg-[#087F5B] text-white"
                        : "bg-white text-[#64748B] hover:bg-[#F1F5F9]"
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}

              <Button
                variant="ghost"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="h-8 px-2.5 text-xs"
              >
                ›
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* 6. RIGHT-SIDE ORDER DETAILS DRAWER / POPUP OVERLAY */}
      {selectedOrderId && (
        <>
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={closeDrawer}
          />

          {/* Drawer Panel (slides in from right) */}
          <div className="fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-[#E5E7EB] bg-white shadow-2xl transition-transform duration-200 sm:w-[480px] lg:w-[520px]">
            {/* Drawer Header (Sticky) */}
            <div className="flex items-center justify-between border-b border-[#E5E7EB] bg-white px-6 py-4">
              <div className="flex items-center gap-2.5">
                <h2 className="font-display text-base font-bold text-[#101828]">
                  Order {fmtOrderId(selectedOrderId)}
                </h2>
                {detail && (
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                      detail.status === "confirmed"
                        ? "bg-[#E8F7EF] text-[#087F5B]"
                        : detail.status === "rejected"
                        ? "bg-[#FDECEC] text-[#C9363E]"
                        : "bg-[#FFF4E5] text-[#C77700]"
                    }`}
                  >
                    {detail.status === "confirmed"
                      ? "Verified"
                      : detail.status === "rejected"
                      ? "Rejected"
                      : "Pending"}
                  </span>
                )}
              </div>

              <button
                type="button"
                aria-label="Close drawer"
                onClick={closeDrawer}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#172033]"
              >
                <IconX size={18} />
              </button>
            </div>

            {/* Drawer Body (Scrollable) */}
            <div className="no-scrollbar flex-1 space-y-6 overflow-y-auto p-6 text-xs">
              {detailLoading ? (
                <div className="flex h-64 items-center justify-center">
                  <Spinner />
                </div>
              ) : detail ? (
                <>
                  {/* Section A: Customer Information */}
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#172033]">
                      <IconUser size={15} className="text-[#087F5B]" />
                      <span>Customer Information</span>
                    </div>

                    <div className="mt-3 space-y-2.5 rounded-xl border border-[#E5E7EB] bg-[#FAFCFB] p-4">
                      <div className="flex justify-between">
                        <span className="text-[#64748B]">Name</span>
                        <span className="font-semibold text-[#172033]">
                          {detail.customerName ?? "—"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#64748B]">Phone</span>
                        <span className="font-semibold text-[#172033]">
                          {detail.phone ?? "—"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#64748B]">Address</span>
                        <span className="max-w-[240px] text-right font-medium text-[#172033]">
                          {detail.address ?? "—"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#64748B]">Order Received</span>
                        <span className="text-[#334155]">
                          {new Date(detail.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                          ,{" "}
                          {new Date(detail.createdAt).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Section B: Order Summary */}
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#172033]">
                      <IconShoppingBag size={15} className="text-[#087F5B]" />
                      <span>Order Summary</span>
                    </div>

                    <div className="mt-3 space-y-2.5 rounded-xl border border-[#E5E7EB] bg-[#FAFCFB] p-4">
                      <div className="flex justify-between">
                        <span className="text-[#64748B]">Product</span>
                        <span className="max-w-[240px] text-right font-semibold text-[#172033]">
                          {detail.productName ?? "—"}{" "}
                          {detail.sizeVariant ? `(${detail.sizeVariant})` : ""}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#64748B]">Quantity</span>
                        <span className="font-medium text-[#172033]">1</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#64748B]">Subtotal</span>
                        <span className="font-medium text-[#172033]">
                          {fmtTaka(
                            (detail.totalAmount ?? 0) - (detail.deliveryCharge ?? 0)
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#64748B]">Delivery Charge</span>
                        <span className="font-medium text-[#172033]">
                          {detail.deliveryCharge
                            ? fmtTaka(detail.deliveryCharge)
                            : "Free"}
                        </span>
                      </div>
                      <div className="border-t border-[#E5E7EB] pt-2.5 flex justify-between">
                        <span className="font-bold text-[#172033]">Total Amount</span>
                        <span className="font-display text-sm font-bold text-[#087F5B]">
                          {fmtTaka(detail.totalAmount)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#64748B]">Payment Method</span>
                        <span className="font-semibold text-[#172033]">
                          {detail.paymentMethod === "cod"
                            ? "Cash on Delivery"
                            : detail.paymentMethod === "full"
                            ? "Full Payment"
                            : detail.paymentMethod
                            ? detail.paymentMethod.toUpperCase()
                            : "COD"}
                        </span>
                      </div>
                      {detail.paymentNumber && (
                        <div className="flex justify-between">
                          <span className="text-[#64748B]">Paid from number</span>
                          <span className="font-mono font-medium text-[#172033]">
                            {detail.paymentNumber}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Section C: Payment Screenshot */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold text-[#172033]">
                      <span>Payment Screenshot</span>
                      {detail.screenshotUrl && (
                        <button
                          type="button"
                          onClick={() => setLightboxUrl(detail.screenshotUrl)}
                          className="flex items-center gap-1 text-[11px] font-semibold text-[#087F5B] hover:underline"
                        >
                          <IconMaximize size={12} />
                          <span>Expand</span>
                        </button>
                      )}
                    </div>

                    <div className="mt-3">
                      {detail.screenshotUrl ? (
                        <div
                          onClick={() => setLightboxUrl(detail.screenshotUrl)}
                          className="group relative cursor-pointer overflow-hidden rounded-xl border border-[#E5E7EB] bg-white p-2 shadow-2xs transition-transform hover:scale-[1.01]"
                        >
                          <img
                            src={detail.screenshotUrl}
                            alt="Payment screenshot"
                            className="max-h-56 w-full rounded-lg object-contain"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
                            <span className="rounded-lg bg-white/90 px-2.5 py-1 text-xs font-semibold text-[#101828] shadow-md">
                              Click to view full size
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-xl border border-dashed border-[#D9E2E8] bg-[#F8FAFC] p-4 text-center text-[#64748B]">
                          Payment screenshot not provided
                          {detail.paymentMethod === "cod" && " (COD order)"}.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Section D: Order Note */}
                  <div>
                    <div className="text-xs font-semibold text-[#172033]">
                      Order Note (Optional)
                    </div>
                    <div className="mt-2 rounded-xl border border-[#B7DEC9] bg-[#E8F5EF]/60 p-3.5 text-xs text-[#065F46]">
                      {detail.rejectionReason ? (
                        <span className="text-danger">
                          Rejection Reason: {detail.rejectionReason}
                        </span>
                      ) : (
                        <span>Customer wants quick delivery.</span>
                      )}
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            {/* Drawer Sticky Footer Actions */}
            {detail && (
              <div className="border-t border-[#E5E7EB] bg-white p-4">
                {detail.status === "pending" && confirmStep === "" && (
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => setConfirmStep("verify")}
                      className="flex-1 bg-[#087F5B] text-xs font-semibold text-white hover:bg-[#066B4D]"
                    >
                      <IconCheck size={14} />
                      <span>Verify Order</span>
                    </Button>

                    <Button
                      variant="danger"
                      onClick={() => setConfirmStep("reject")}
                      className="flex-1 text-xs font-semibold"
                    >
                      <IconX size={14} />
                      <span>Reject Order</span>
                    </Button>

                    <Button variant="ghost" onClick={closeDrawer} className="text-xs">
                      Close
                    </Button>
                  </div>
                )}

                {/* Verification Confirmation Step */}
                {confirmStep === "verify" && (
                  <div className="space-y-3 rounded-xl border border-[#B7DEC9] bg-[#E8F5EF] p-4">
                    <p className="font-semibold text-[#065F46]">
                      Verify and confirm this order?
                    </p>
                    <p className="text-[11px] text-[#065F46]/80">
                      This will mark the order as verified and send the confirmation message to the customer on Messenger.
                    </p>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        onClick={() => setConfirmStep("")}
                        className="h-8 text-xs"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleVerify}
                        disabled={actionBusy}
                        className="h-8 bg-[#087F5B] text-xs font-semibold text-white"
                      >
                        {actionBusy ? "Verifying…" : "Yes, Verify Order"}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Rejection Confirmation Step */}
                {confirmStep === "reject" && (
                  <div className="space-y-3 rounded-xl border border-danger/30 bg-danger-soft p-4">
                    <p className="font-semibold text-danger">
                      Reject this order payment?
                    </p>
                    <textarea
                      rows={2}
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Reason for rejection (sent to customer)..."
                      className="w-full rounded-lg border border-danger/40 bg-white p-2 text-xs text-[#172033] focus:outline-none"
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        onClick={() => setConfirmStep("")}
                        className="h-8 text-xs"
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="danger"
                        onClick={handleReject}
                        disabled={actionBusy}
                        className="h-8 text-xs font-semibold"
                      >
                        {actionBusy ? "Rejecting…" : "Reject Order"}
                      </Button>
                    </div>
                  </div>
                )}

                {/* If verified or rejected already */}
                {detail.status !== "pending" && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-semibold">
                      <span className="text-[#64748B]">Status:</span>
                      <span
                        className={
                          detail.status === "confirmed"
                            ? "text-[#087F5B]"
                            : "text-danger"
                        }
                      >
                        {detail.status === "confirmed" ? "Verified" : "Rejected"}
                      </span>
                    </div>
                    <Button variant="ghost" onClick={closeDrawer} className="text-xs">
                      Close
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* 7. Lightbox for Payment Screenshot Fullscreen View */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
          onClick={() => setLightboxUrl(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-2xl overflow-hidden rounded-2xl bg-white p-2 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Close"
              onClick={() => setLightboxUrl(null)}
              className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black"
            >
              <IconX size={18} />
            </button>
            <img
              src={lightboxUrl}
              alt="Payment screenshot full"
              className="max-h-[80vh] w-full rounded-xl object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
