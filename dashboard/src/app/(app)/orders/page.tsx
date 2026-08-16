"use client";

import { useEffect, useState } from "react";
import { api, fmtTaka, timeAgo } from "@/lib/api";
import { usePage } from "@/components/PageProvider";
import { Badge, Button, Card, EmptyState, Select, Spinner, Table, TextArea } from "@/lib/ui";

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
  status: string;
  createdAt: string;
}

interface OrderDetail extends OrderSummary {
  deliveryCharge: number | null;
  paymentNumber: string | null;
  screenshotUrl: string | null;
  rejectionReason: string | null;
}

const STATUS_TONE: Record<string, string> = { pending: "amber", confirmed: "green", rejected: "red" };

export default function OrdersPage() {
  const { pageId } = usePage();
  const [rows, setRows] = useState<OrderSummary[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [confirmStep, setConfirmStep] = useState<"" | "verify" | "reject">("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    if (!pageId) return;
    setLoading(true);
    const params = new URLSearchParams({ pageId });
    if (status) params.set("status", status);
    api<OrderSummary[]>(`/api/orders?${params}`)
      .then(setRows)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, [pageId, status]);

  async function openDetail(id: string) {
    setError("");
    try {
      const d = await api<OrderDetail>(`/api/orders/${id}`);
      setDetail(d);
      setConfirmStep("");
      setReason("");
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function verify() {
    if (!detail) return;
    setBusy(true);
    setError("");
    try {
      await api(`/api/orders/${detail.id}/verify`, { method: "POST" });
      setDetail(null);
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function reject() {
    if (!detail) return;
    if (!reason.trim()) {
      setError("Please provide a reason for rejection.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api(`/api/orders/${detail.id}/reject`, { method: "POST", body: JSON.stringify({ reason: reason.trim() }) });
      setDetail(null);
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="max-w-[180px]">
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="rejected">Rejected</option>
        </Select>
      </div>

      {loading ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <EmptyState title="No orders yet. Orders appear here when the AI completes an order." />
      ) : (
        <Table head={["Product", "Customer", "Payment", "Amount", "Status", "When", ""]}>
          {rows.map((o) => (
            <tr key={o.id} className="hover:bg-paper">
              <td className="px-4 py-3">
                <p className="font-medium text-ink">{o.productName ?? "—"}</p>
                {o.sizeVariant && <p className="text-xs text-mute">{o.sizeVariant}</p>}
              </td>
              <td className="px-4 py-3 text-sm text-ink">
                {o.customerName ?? "—"}
                {o.phone && <p className="text-xs text-mute">{o.phone}</p>}
              </td>
              <td className="px-4 py-3 text-sm text-ink">{o.paymentMethod === "cod" ? "COD" : o.paymentMethod === "full" ? "Full Payment" : "—"}</td>
              <td className="px-4 py-3 font-display font-semibold text-ink">{fmtTaka(o.totalAmount)}</td>
              <td className="px-4 py-3">
                <Badge tone={STATUS_TONE[o.status] ?? "gray"}>{o.status}</Badge>
              </td>
              <td className="px-4 py-3 text-xs text-mute">{timeAgo(o.createdAt)}</td>
              <td className="px-4 py-3 text-right">
                <Button variant="ghost" className="py-1.5 text-xs" onClick={() => openDetail(o.id)}>
                  View
                </Button>
              </td>
            </tr>
          ))}
        </Table>
      )}

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setDetail(null)}>
          <div className="w-full max-w-lg rounded-xl border border-line bg-surface p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="font-display text-base font-semibold text-ink">Order details</p>
              <button onClick={() => setDetail(null)} className="text-sm text-mute hover:text-ink">
                Close
              </button>
            </div>

            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-mute">Product</span><span className="text-ink">{detail.productName ?? "—"}{detail.sizeVariant ? ` (${detail.sizeVariant})` : ""}</span></div>
              <div className="flex justify-between"><span className="text-mute">Customer</span><span className="text-ink">{detail.customerName ?? "—"}</span></div>
              <div className="flex justify-between"><span className="text-mute">Phone</span><span className="text-ink">{detail.phone ?? "—"}</span></div>
              <div className="flex justify-between"><span className="text-mute">Address</span><span className="text-ink">{detail.address ?? "—"}</span></div>
              <div className="flex justify-between"><span className="text-mute">Payment</span><span className="text-ink">{detail.paymentMethod === "cod" ? "Cash on Delivery" : detail.paymentMethod === "full" ? "Full Payment" : "—"}</span></div>
              {detail.totalAmount != null && <div className="flex justify-between"><span className="text-mute">Total</span><span className="text-ink">{fmtTaka(detail.totalAmount)}</span></div>}
              {detail.deliveryCharge != null && <div className="flex justify-between"><span className="text-mute">Delivery charge</span><span className="text-ink">{fmtTaka(detail.deliveryCharge)}</span></div>}
              {detail.remainingAmount != null && detail.paymentMethod === "cod" && <div className="flex justify-between"><span className="text-mute">Remaining (COD)</span><span className="text-ink">{fmtTaka(detail.remainingAmount)}</span></div>}
              {detail.paymentNumber && <div className="flex justify-between"><span className="text-mute">Paid from number</span><span className="text-ink">{detail.paymentNumber}</span></div>}
              <div className="flex justify-between"><span className="text-mute">Status</span><Badge tone={STATUS_TONE[detail.status] ?? "gray"}>{detail.status}</Badge></div>
              {detail.rejectionReason && <div className="flex justify-between"><span className="text-mute">Rejection reason</span><span className="text-danger">{detail.rejectionReason}</span></div>}
            </div>

            {detail.screenshotUrl && (
              <div className="mt-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-mute">Payment screenshot</p>
                <a href={detail.screenshotUrl} target="_blank" rel="noreferrer">
                  <img src={detail.screenshotUrl} alt="Payment screenshot" className="max-h-56 rounded-lg border border-line object-contain" />
                </a>
              </div>
            )}

            {detail.status === "pending" && (
              <div className="mt-5 border-t border-line pt-4">
                {confirmStep === "" && (
                  <div className="flex gap-2">
                    <Button onClick={() => setConfirmStep("verify")}>Verify Payment</Button>
                    <Button variant="danger" onClick={() => setConfirmStep("reject")}>
                      Reject Payment
                    </Button>
                  </div>
                )}

                {confirmStep === "verify" && (
                  <div className="space-y-3">
                    <p className="text-sm text-ink">Confirm this order and send the verification message to the customer?</p>
                    <div className="flex gap-2">
                      <Button onClick={verify} disabled={busy}>
                        {busy ? "Verifying…" : "Yes, confirm order"}
                      </Button>
                      <Button variant="ghost" onClick={() => setConfirmStep("")}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {confirmStep === "reject" && (
                  <div className="space-y-3">
                    <p className="text-sm text-ink">Why is this payment being rejected? This reason will be sent to the customer.</p>
                    <TextArea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for rejection…" />
                    <div className="flex gap-2">
                      <Button variant="danger" onClick={reject} disabled={busy}>
                        {busy ? "Rejecting…" : "Reject order"}
                      </Button>
                      <Button variant="ghost" onClick={() => setConfirmStep("")}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {error && <p className="mt-3 text-sm text-danger">{error}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
