"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, fmtTaka, timeAgo } from "@/lib/api";
import { Badge, Button, Card, EmptyState, Spinner, statusTone } from "@/lib/ui";
import {
  IconCreditCard,
  IconShoppingBag,
  IconUpload,
  IconActivity,
  IconArrowRight,
  IconCheck,
  IconCoins,
  IconSparkles,
  IconInfo,
  IconClock,
} from "@/components/Icons";

interface Balance {
  credits: number;
  totalPurchased: number;
  totalUsed: number;
  level: string;
}

interface CreditPackage {
  id: string;
  name: string;
  priceBdt: number;
  baseCredits: number;
  bonusCredits: number;
  totalCredits: number;
}

interface Payment {
  id: string;
  provider: string;
  package: string;
  providerTxnId?: string | null;
  creditsGranted: number;
  amount: number;
  status: string;
  createdAt: string;
}

const PACKAGE_FEATURES: Record<string, string[]> = {
  starter: ["Basic AI features", "Email support"],
  growth: ["All AI features", "Priority support"],
  pro: ["All premium features", "Priority support", "Advanced analytics"],
  business: [
    "All premium features",
    "Priority support",
    "Advanced analytics",
    "Team usage",
  ],
  enterprise: [
    "All premium features",
    "Dedicated support",
    "Advanced analytics",
    "Team usage",
    "Custom AI setup",
  ],
};

export default function CreditsPage() {
  const [balance, setBalance] = useState<Balance | null>(null);
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [history, setHistory] = useState<Payment[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    setError("");
    Promise.all([
      api<Balance>("/api/credits/balance"),
      api<CreditPackage[]>("/api/credits/packages"),
      api<Payment[]>("/api/credits/history"),
    ])
      .then(([b, p, h]) => {
        setBalance(b);
        setPackages(p || []);
        setHistory(h || []);
      })
      .catch((e) => setError(e.message || "Failed to load credit information"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  async function recharge(pkg: CreditPackage) {
    setBusy(pkg.id);
    setError("");
    try {
      const res = await api<{ bkashURL?: string; paymentId?: string }>(
        "/api/credits/recharge",
        {
          method: "POST",
          body: JSON.stringify({ packageId: pkg.id }),
        }
      );
      if (res.bkashURL) {
        window.location.href = res.bkashURL;
      } else {
        setError(
          "Payment recorded as manual. Complete payment and it will be verified by the admin."
        );
      }
    } catch (e: any) {
      setError(e.message || "Recharge failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-16">
      {/* 1. Page Header */}
      <div>
        <h1 className="text-[28px] font-bold leading-tight tracking-tight text-[#101828]">
          Credits
        </h1>
        <p className="mt-0.5 text-xs text-[#64748B]">
          Manage your AI credits, view usage, and purchase more to keep your bot running.
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-danger/30 bg-danger-soft p-4 text-xs font-medium text-danger">
          <IconInfo size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* 2. Top 4 Credit Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Credits Remaining */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B]">
              Credits Remaining
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E8F5EF] text-[#087F5B]">
              <IconCreditCard size={18} />
            </div>
          </div>
          <div className="mt-2">
            <span className="font-display text-2xl font-bold tracking-tight text-[#101828]">
              {loading || !balance ? "…" : balance.credits.toLocaleString("en-IN")}
            </span>
          </div>
          <div className="mt-1 text-xs text-[#64748B]">Available to use</div>
          <div className="mt-2 pt-2 border-t border-[#E5E7EB]">
            <Link
              href="/activity"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#087F5B] hover:underline"
            >
              <span>View usage details</span>
              <IconArrowRight size={13} />
            </Link>
          </div>
        </Card>

        {/* Card 2: Total Purchased */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B]">
              Total Purchased
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#2563EB]">
              <IconShoppingBag size={18} />
            </div>
          </div>
          <div className="mt-2">
            <span className="font-display text-2xl font-bold tracking-tight text-[#101828]">
              {loading || !balance
                ? "…"
                : balance.totalPurchased.toLocaleString("en-IN")}
            </span>
          </div>
          <div className="mt-1 text-xs text-[#64748B]">All time credits purchased</div>
        </Card>

        {/* Card 3: Total Used */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B]">Total Used</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFF4E5] text-[#D97706]">
              <IconUpload size={18} />
            </div>
          </div>
          <div className="mt-2">
            <span className="font-display text-2xl font-bold tracking-tight text-[#101828]">
              {loading || !balance
                ? "…"
                : balance.totalUsed.toLocaleString("en-IN")}
            </span>
          </div>
          <div className="mt-1 text-xs text-[#64748B]">All time credits used</div>
        </Card>

        {/* Card 4: Status */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B]">Status</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E8F5EF] text-[#087F5B]">
              <IconActivity size={18} />
            </div>
          </div>
          <div className="mt-2">
            <span className="inline-flex items-center gap-1.5 text-base font-bold text-[#087F5B]">
              <span className="h-2.5 w-2.5 rounded-full bg-[#16A34A] animate-pulse" />
              <span>
                {balance?.level === "ok"
                  ? "Healthy"
                  : balance?.level === "zero"
                  ? "Recharge Needed"
                  : "Operational"}
              </span>
            </span>
          </div>
          <div className="mt-1 text-xs text-[#64748B]">All systems operational</div>
        </Card>
      </div>

      {/* 3. Recharge with bKash Section */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-[#172033]">
            Recharge with bKash
          </h2>
          <p className="text-xs text-[#64748B]">
            Select a package to add credits instantly. Purchased credits do not expire.
          </p>
        </div>

        {/* 5 Package Cards Grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {packages.map((pkg) => {
            const isBestValue = pkg.id === "pro";
            const isPopular = pkg.id === "starter";
            const features = PACKAGE_FEATURES[pkg.id] ?? ["All AI features", "Email support"];

            return (
              <div
                key={pkg.id}
                className={`relative flex flex-col justify-between rounded-2xl bg-white p-5 transition-all duration-200 ${
                  isBestValue
                    ? "border-2 border-[#087F5B] shadow-md bg-[#FAFCFB]"
                    : "border border-[#E5E7EB] shadow-2xs hover:border-[#D0D7D4] hover:shadow-xs"
                }`}
              >
                {/* Header with Title & Badge */}
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-base font-bold text-[#101828]">
                      {pkg.name}
                    </h3>
                    {isPopular && (
                      <span className="rounded-full bg-[#E8F5EF] px-2 py-0.5 text-[10px] font-bold text-[#087F5B]">
                        Popular
                      </span>
                    )}
                    {isBestValue && (
                      <span className="rounded-full bg-[#F3E8FF] px-2 py-0.5 text-[10px] font-bold text-[#7C3AED]">
                        Best Value
                      </span>
                    )}
                  </div>

                  {/* Price */}
                  <div className="mt-2 flex items-baseline">
                    <span className="font-display text-2xl font-bold tracking-tight text-[#087F5B]">
                      {fmtTaka(pkg.priceBdt)}
                    </span>
                  </div>

                  {/* Credits Breakdown */}
                  <div className="mt-4 space-y-1 rounded-xl bg-[#F8FAFC] p-3 text-xs">
                    <div className="flex justify-between text-[#475569]">
                      <span>Credits</span>
                      <span className="font-medium text-[#101828]">
                        {pkg.baseCredits.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="flex justify-between text-[#087F5B]">
                      <span>Bonus</span>
                      <span className="font-bold">
                        +{pkg.bonusCredits.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="my-1.5 border-t border-[#E2E8F0]" />
                    <div className="flex justify-between font-bold text-[#101828]">
                      <span>Total:</span>
                      <span>{pkg.totalCredits.toLocaleString("en-IN")}</span>
                    </div>
                  </div>

                  {/* Feature Checklist */}
                  <div className="mt-4 space-y-2 text-xs text-[#334155]">
                    {features.map((f, fIdx) => (
                      <div key={fIdx} className="flex items-start gap-2">
                        <IconCheck
                          size={14}
                          className="mt-0.5 shrink-0 text-[#087F5B]"
                        />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recharge Action Button */}
                <div className="mt-6">
                  <Button
                    onClick={() => recharge(pkg)}
                    disabled={busy !== null}
                    className={`w-full h-10 rounded-lg text-xs font-semibold text-white shadow-xs transition-all ${
                      isBestValue
                        ? "bg-[#087F5B] hover:bg-[#066B4D] active:bg-[#05573D]"
                        : "bg-[#087F5B] hover:bg-[#066B4D]"
                    }`}
                  >
                    {busy === pkg.id ? "Opening bKash…" : "Recharge Now ↗"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. How Recharging Works Section */}
      <Card className="p-6">
        <h2 className="text-base font-semibold text-[#172033]">
          How recharging works
        </h2>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Step 1 */}
          <div className="flex items-start gap-3 rounded-xl border border-[#E5E7EB] bg-[#FAFCFB] p-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#E8F5EF] text-xs font-bold text-[#087F5B]">
              1
            </div>
            <div>
              <div className="text-xs font-bold text-[#101828]">Select a plan</div>
              <div className="mt-0.5 text-[11px] text-[#64748B]">
                Choose the plan that fits your volume needs.
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex items-start gap-3 rounded-xl border border-[#E5E7EB] bg-[#FAFCFB] p-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#EFF6FF] text-xs font-bold text-[#2563EB]">
              2
            </div>
            <div>
              <div className="text-xs font-bold text-[#101828]">Pay with bKash</div>
              <div className="mt-0.5 text-[11px] text-[#64748B]">
                Complete secure payment via bKash gateway.
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex items-start gap-3 rounded-xl border border-[#E5E7EB] bg-[#FAFCFB] p-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#E8F5EF] text-xs font-bold text-[#087F5B]">
              3
            </div>
            <div>
              <div className="text-xs font-bold text-[#101828]">Credits added</div>
              <div className="mt-0.5 text-[11px] text-[#64748B]">
                Credits will be added instantly to balance.
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex items-start gap-3 rounded-xl border border-[#E5E7EB] bg-[#FAFCFB] p-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F3E8FF] text-xs font-bold text-[#8B5CF6]">
              4
            </div>
            <div>
              <div className="text-xs font-bold text-[#101828]">Start using</div>
              <div className="mt-0.5 text-[11px] text-[#64748B]">
                Use AI sales features without interruption.
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* 5. Recharge History Section */}
      <Card className="overflow-hidden p-0">
        <div className="border-b border-[#E5E7EB] p-5">
          <h2 className="text-base font-semibold text-[#172033]">
            Recharge history
          </h2>
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Spinner />
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] text-2xl shadow-2xs">
              💳
            </div>
            <h3 className="mt-4 text-base font-bold text-[#101828]">
              No recharges yet.
            </h3>
            <p className="mt-1 text-xs text-[#64748B]">
              Your recharge history will appear here.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View (>= 768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[#E5E7EB] bg-[#F8FAFC] text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                  <tr>
                    <th className="px-5 py-3">Date & Time</th>
                    <th className="px-4 py-3">Plan</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Credits Added</th>
                    <th className="px-4 py-3">Payment Method</th>
                    <th className="px-4 py-3">Transaction ID</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {history.map((p) => {
                    const statusInfo =
                      p.status === "paid" || p.status === "success"
                        ? { label: "Successful", bg: "bg-[#E8F7EF]", text: "text-[#087F5B]" }
                        : p.status === "failed"
                        ? { label: "Failed", bg: "bg-[#FDECEC]", text: "text-[#C9363E]" }
                        : { label: "Pending", bg: "bg-[#FFF4E5]", text: "text-[#C77700]" };

                    return (
                      <tr key={p.id} className="hover:bg-[#FAFCFB]">
                        <td className="px-5 py-3.5 text-[#334155]">
                          <div className="font-medium text-[#172033]">
                            {new Date(p.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </div>
                          <div className="text-[11px] text-[#64748B]">
                            {new Date(p.createdAt).toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true,
                            })}
                          </div>
                        </td>

                        <td className="px-4 py-3.5 font-semibold capitalize text-[#172033]">
                          {p.package}
                        </td>

                        <td className="px-4 py-3.5 font-display font-bold text-[#172033]">
                          {fmtTaka(p.amount)}
                        </td>

                        <td className="px-4 py-3.5 font-mono text-[#087F5B] font-semibold">
                          +{p.creditsGranted.toLocaleString("en-IN")}
                        </td>

                        <td className="px-4 py-3.5 font-medium uppercase text-[#334155]">
                          {p.provider}
                        </td>

                        <td className="px-4 py-3.5 font-mono text-[11px] text-[#64748B]">
                          {p.providerTxnId || `#TXN-${p.id.slice(0, 8).toUpperCase()}`}
                        </td>

                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusInfo.bg} ${statusInfo.text}`}
                          >
                            {statusInfo.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View (< 768px) */}
            <div className="divide-y divide-[#E5E7EB] md:hidden">
              {history.map((p) => {
                const statusInfo =
                  p.status === "paid" || p.status === "success"
                    ? { label: "Successful", bg: "bg-[#E8F7EF]", text: "text-[#087F5B]" }
                    : p.status === "failed"
                    ? { label: "Failed", bg: "bg-[#FDECEC]", text: "text-[#C9363E]" }
                    : { label: "Pending", bg: "bg-[#FFF4E5]", text: "text-[#C77700]" };

                return (
                  <div key={p.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-sm text-[#101828] capitalize">
                          {p.package} Package
                        </div>
                        <div className="text-[11px] text-[#64748B]">
                          {new Date(p.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}{" "}
                          ·{" "}
                          {new Date(p.createdAt).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })}
                        </div>
                      </div>

                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusInfo.bg} ${statusInfo.text}`}
                      >
                        {statusInfo.label}
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-3 text-xs">
                      <div>
                        <div className="text-[10px] text-[#64748B]">Credits Added</div>
                        <div className="font-mono text-xs font-bold text-[#087F5B]">
                          +{p.creditsGranted.toLocaleString("en-IN")}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-[#64748B]">Amount Paid</div>
                        <div className="font-display text-sm font-bold text-[#101828]">
                          {fmtTaka(p.amount)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[#64748B]">
                      <span className="uppercase font-semibold text-[#334155]">
                        {p.provider}
                      </span>
                      <span className="font-mono text-[10px]">
                        {p.providerTxnId || `#TXN-${p.id.slice(0, 8).toUpperCase()}`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
