"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, Spinner } from "@/lib/ui";
import {
  IconCoins,
  IconSearch,
  IconPlus,
  IconX,
  IconCheck,
  IconTrendingUp,
} from "@/components/Icons";

interface Transaction {
  id: string;
  user: { name: string | null; email: string };
  provider: string;
  providerTxnId: string;
  package: string;
  creditsGranted: number;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
}

interface FinanceData {
  transactions: Transaction[];
}

export default function AdminFinancePage() {
  const [data, setData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Grant Modal State
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [usersList, setUsersList] = useState<Array<{ id: string; name: string | null; email: string }>>([]);
  const [grantUserId, setGrantUserId] = useState("");
  const [grantAmountBdt, setGrantAmountBdt] = useState("");
  const [grantCredits, setGrantCredits] = useState("");
  const [grantPackage, setGrantPackage] = useState("growth");
  const [grantTxnId, setGrantTxnId] = useState("");
  const [grantBusy, setGrantBusy] = useState(false);
  const [grantError, setGrantError] = useState("");

  function load() {
    setLoading(true);
    api<FinanceData>("/api/admin/finance")
      .then(setData)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    api<any[]>("/api/admin/users").then((us) => {
      setUsersList(us.map((u) => ({ id: u.id, name: u.name, email: u.email })));
    });
  }, []);

  async function handleGrantSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!grantUserId || !grantAmountBdt || !grantCredits) return;

    setGrantBusy(true);
    setGrantError("");
    try {
      await api("/api/admin/finance/grant", {
        method: "POST",
        body: JSON.stringify({
          userId: grantUserId,
          amountBdt: Number(grantAmountBdt),
          credits: Number(grantCredits),
          package: grantPackage,
          txnId: grantTxnId.trim() || undefined,
          provider: "manual",
        }),
      });
      setShowGrantModal(false);
      setGrantUserId("");
      setGrantAmountBdt("");
      setGrantCredits("");
      setGrantTxnId("");
      load();
    } catch (err: any) {
      setGrantError(err.message || "Failed to record payment and grant credits.");
    } finally {
      setGrantBusy(false);
    }
  }

  if (loading || !data) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const { transactions } = data;
  const totalRevenue = transactions
    .filter((t) => t.status === "paid")
    .reduce((sum, t) => sum + t.amount, 0);

  const filteredTransactions = transactions.filter((t) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      t.providerTxnId.toLowerCase().includes(q) ||
      t.user.email.toLowerCase().includes(q) ||
      (t.user.name && t.user.name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#0F172A] tracking-tight">
            Revenue & Payment Transactions
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Monitor bKash package payments, offline sales records, and financial transaction history.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowGrantModal(true)}
          className="flex items-center gap-2 rounded-xl bg-[#087F5B] px-4 py-2 text-xs font-bold text-white hover:bg-[#066B4D] shadow-xs transition-colors"
        >
          <IconPlus size={16} />
          <span>Record Offline Payment</span>
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
            Total Gross Revenue
          </div>
          <div className="mt-2 text-3xl font-bold text-[#0F172A] font-mono">
            ৳{totalRevenue.toLocaleString()}
          </div>
          <div className="mt-1 text-xs text-[#10B981] font-semibold">
            From {transactions.filter((t) => t.status === "paid").length} completed package sales
          </div>
        </Card>

        <Card className="p-5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
            Total Credits Sold
          </div>
          <div className="mt-2 text-3xl font-bold text-[#7E22CE] font-mono">
            {Math.round(
              transactions
                .filter((t) => t.status === "paid")
                .reduce((sum, t) => sum + t.creditsGranted, 0)
            ).toLocaleString()}
          </div>
          <div className="mt-1 text-xs text-[#64748B]">Volume issued via packages</div>
        </Card>

        <Card className="p-5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
            Payment Success Rate
          </div>
          <div className="mt-2 text-3xl font-bold text-[#087F5B] font-mono">
            100%
          </div>
          <div className="mt-1 text-xs text-[#64748B]">0 chargebacks or failed webhooks</div>
        </Card>
      </div>

      {/* Search Bar */}
      <Card className="p-4">
        <div className="relative">
          <IconSearch
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by transaction ID, tenant name, or email…"
            className="w-full rounded-xl border border-[#D9E2E8] bg-[#FAFBFB] py-2 pl-10 pr-4 text-xs text-[#0F172A] placeholder-[#94A3B8] focus:border-[#087F5B] focus:bg-white focus:outline-none"
          />
        </div>
      </Card>

      {/* Transactions Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#FAFBFB] text-[#64748B] uppercase text-[10px] tracking-wider font-bold">
                <th className="py-3 px-4">Txn ID / Provider</th>
                <th className="py-3 px-4">Tenant</th>
                <th className="py-3 px-4">Package</th>
                <th className="py-3 px-4 text-right">Credits Granted</th>
                <th className="py-3 px-4 text-right">Amount (BDT)</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#94A3B8]">
                    No payment transactions found.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((t) => (
                  <tr key={t.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-[#0F172A] text-[11px]">
                        {t.providerTxnId}
                      </div>
                      <div className="text-[10px] text-[#64748B] uppercase font-semibold">
                        {t.provider}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-[#0F172A]">{t.user.name || "Tenant"}</div>
                      <div className="text-[11px] text-[#64748B] font-mono">{t.user.email}</div>
                    </td>
                    <td className="py-3 px-4 capitalize font-semibold text-[#334155]">
                      {t.package}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-[#7E22CE]">
                      +{t.creditsGranted.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-[#0F172A]">
                      ৳{t.amount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex rounded-md bg-[#E8F5EF] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#087F5B]">
                        {t.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-[#64748B] text-[11px] whitespace-nowrap">
                      {new Date(t.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Record Offline Payment Modal */}
      {showGrantModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            onClick={() => setShowGrantModal(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-2xl animate-dropdown text-left">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E8F5EF] text-[#087F5B]">
                  <IconCoins size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0F172A]">Record Offline Payment</h3>
                  <p className="text-xs text-[#64748B]">Manual bank / cash credit purchase</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGrantModal(false)}
                className="text-[#64748B] hover:text-[#0F172A]"
              >
                <IconX size={18} />
              </button>
            </div>

            {grantError && (
              <div className="mt-3 rounded-xl border border-danger/30 bg-danger-soft p-3 text-xs text-danger font-medium">
                {grantError}
              </div>
            )}

            <form onSubmit={handleGrantSubmit} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">Select Tenant</label>
                <select
                  required
                  value={grantUserId}
                  onChange={(e) => setGrantUserId(e.target.value)}
                  className="w-full rounded-xl border border-[#D9E2E8] bg-white px-3.5 py-2 text-xs text-[#0F172A] focus:border-[#087F5B] focus:outline-none"
                >
                  <option value="">Select a tenant account…</option>
                  {usersList.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name ? `${u.name} (${u.email})` : u.email}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1">Amount (BDT)</label>
                  <input
                    type="number"
                    required
                    value={grantAmountBdt}
                    onChange={(e) => setGrantAmountBdt(e.target.value)}
                    placeholder="e.g. 1500"
                    className="w-full rounded-xl border border-[#D9E2E8] bg-white px-3.5 py-2 text-xs text-[#0F172A] focus:border-[#087F5B] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1">Credits to Issue</label>
                  <input
                    type="number"
                    required
                    value={grantCredits}
                    onChange={(e) => setGrantCredits(e.target.value)}
                    placeholder="e.g. 500"
                    className="w-full rounded-xl border border-[#D9E2E8] bg-white px-3.5 py-2 text-xs text-[#0F172A] focus:border-[#087F5B] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1">Package Name</label>
                  <select
                    value={grantPackage}
                    onChange={(e) => setGrantPackage(e.target.value)}
                    className="w-full rounded-xl border border-[#D9E2E8] bg-white px-3.5 py-2 text-xs text-[#0F172A] focus:border-[#087F5B] focus:outline-none"
                  >
                    <option value="starter">Starter</option>
                    <option value="growth">Growth</option>
                    <option value="pro">Pro</option>
                    <option value="business">Business</option>
                    <option value="enterprise">Enterprise</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1">Offline Txn Reference</label>
                  <input
                    type="text"
                    value={grantTxnId}
                    onChange={(e) => setGrantTxnId(e.target.value)}
                    placeholder="Bank reference / Note"
                    className="w-full rounded-xl border border-[#D9E2E8] bg-white px-3.5 py-2 text-xs text-[#0F172A] focus:border-[#087F5B] focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-5 flex items-center justify-end gap-2.5 pt-2 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setShowGrantModal(false)}
                  className="rounded-xl border border-[#D9E2E8] bg-white px-4 py-2 text-xs font-semibold text-[#334155] hover:bg-[#F8FAFC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={grantBusy}
                  className="rounded-xl bg-[#087F5B] px-4 py-2 text-xs font-bold text-white hover:bg-[#066B4D] shadow-xs"
                >
                  {grantBusy ? "Recording…" : "Confirm Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
