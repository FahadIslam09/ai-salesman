"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, Spinner } from "@/lib/ui";
import {
  IconCoins,
  IconSearch,
  IconPlus,
  IconCheck,
  IconX,
  IconUsers,
  IconSparkles,
} from "@/components/Icons";

interface UserCreditRow {
  id: string;
  name: string | null;
  email: string;
  credits: number;
  totalPurchased: number;
  totalUsed: number;
  pagesCount: number;
}

export default function AdminCreditsPage() {
  const [users, setUsers] = useState<UserCreditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Adjustment Modal
  const [modalUser, setModalUser] = useState<UserCreditRow | null>(null);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustBusy, setAdjustBusy] = useState(false);
  const [adjustError, setAdjustError] = useState("");

  function load() {
    setLoading(true);
    api<UserCreditRow[]>("/api/admin/users")
      .then(setUsers)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  const totalCirculating = users.reduce((sum, u) => sum + u.credits, 0);
  const totalPurchased = users.reduce((sum, u) => sum + u.totalPurchased, 0);
  const totalUsed = users.reduce((sum, u) => sum + u.totalUsed, 0);

  async function handleAdjustSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!modalUser || !adjustAmount || !adjustReason.trim()) return;

    setAdjustBusy(true);
    setAdjustError("");
    try {
      await api(`/api/admin/users/${modalUser.id}/credits`, {
        method: "POST",
        body: JSON.stringify({
          amount: Number(adjustAmount),
          reason: adjustReason.trim(),
        }),
      });
      setModalUser(null);
      setAdjustAmount("");
      setAdjustReason("");
      load();
    } catch (err: any) {
      setAdjustError(err.message || "Failed to adjust credits.");
    } finally {
      setAdjustBusy(false);
    }
  }

  const filtered = users.filter((u) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      u.email.toLowerCase().includes(q) ||
      (u.name && u.name.toLowerCase().includes(q)) ||
      u.id.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#0F172A] tracking-tight">
            Credits Management & Allocation
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Monitor credits in circulation, audit tenant consumption, and grant manual credit allocations.
          </p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
              Credits in Circulation
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E8F5EF] text-[#087F5B]">
              <IconCoins size={16} />
            </div>
          </div>
          <div className="mt-2 text-3xl font-bold text-[#087F5B] font-mono">
            {Math.round(totalCirculating).toLocaleString()}
          </div>
          <p className="mt-1 text-xs text-[#64748B]">Unspent credits available across all tenants</p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
              Total Credits Issued
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E8F5EF] text-[#087F5B]">
              <IconSparkles size={16} />
            </div>
          </div>
          <div className="mt-2 text-3xl font-bold text-[#7E22CE] font-mono">
            {Math.round(totalPurchased).toLocaleString()}
          </div>
          <p className="mt-1 text-xs text-[#64748B]">Purchased via bKash packages or admin gifts</p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
              Total Credits Consumed
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E8F5EF] text-[#087F5B]">
              <IconCoins size={16} />
            </div>
          </div>
          <div className="mt-2 text-3xl font-bold text-[#D97706] font-mono">
            {Math.round(totalUsed).toLocaleString()}
          </div>
          <p className="mt-1 text-xs text-[#64748B]">Deducted across all customer store AI replies</p>
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
            placeholder="Search tenant by name or email…"
            className="w-full rounded-xl border border-[#D9E2E8] bg-[#FAFBFB] py-2 pl-10 pr-4 text-xs text-[#0F172A] placeholder-[#94A3B8] focus:border-[#087F5B] focus:bg-white focus:outline-none"
          />
        </div>
      </Card>

      {/* Credit Balances Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Spinner />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#64748B]">
            No user credit accounts found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#FAFBFB] text-[#64748B] uppercase text-[10px] tracking-wider font-bold">
                  <th className="py-3.5 px-4">User / Tenant</th>
                  <th className="py-3.5 px-4">Stores Connected</th>
                  <th className="py-3.5 px-4 text-right">Available Balance</th>
                  <th className="py-3.5 px-4 text-right">Total Purchased</th>
                  <th className="py-3.5 px-4 text-right">Total Consumed</th>
                  <th className="py-3.5 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-[#0F172A]">{u.name || "Tenant"}</div>
                      <div className="text-[11px] text-[#64748B] font-mono">{u.email}</div>
                    </td>
                    <td className="py-3.5 px-4 text-[#334155] font-semibold">
                      {u.pagesCount} store(s)
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-[#087F5B] text-sm">
                      {u.credits.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-[#7E22CE] font-bold">
                      {u.totalPurchased.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-[#D97706]">
                      {u.totalUsed.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setModalUser(u);
                          setAdjustAmount("");
                          setAdjustReason("");
                          setAdjustError("");
                        }}
                        className="rounded-lg bg-[#E8F5EF] px-3 py-1 text-xs font-bold text-[#087F5B] hover:bg-[#d5eee2] transition-colors"
                      >
                        Adjust Credits
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Credit Adjustment Modal */}
      {modalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            onClick={() => setModalUser(null)}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-2xl animate-dropdown text-left">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E8F5EF] text-[#087F5B]">
                  <IconCoins size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0F172A]">Adjust User Credits</h3>
                  <p className="text-xs text-[#64748B]">{modalUser.name || modalUser.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalUser(null)}
                className="text-[#64748B] hover:text-[#0F172A]"
              >
                <IconX size={18} />
              </button>
            </div>

            <div className="mt-4 rounded-xl bg-[#FAFBFB] p-3 border border-[#E2E8F0] flex justify-between items-center text-xs">
              <span className="text-[#64748B]">Current Balance:</span>
              <span className="font-mono font-bold text-[#087F5B] text-sm">
                {modalUser.credits.toLocaleString()} credits
              </span>
            </div>

            {adjustError && (
              <div className="mt-3 rounded-xl border border-danger/30 bg-danger-soft p-3 text-xs text-danger font-medium">
                {adjustError}
              </div>
            )}

            <form onSubmit={handleAdjustSubmit} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">
                  Credit Amount <span className="text-[#087F5B]">(positive to add, negative to deduct)</span>
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  placeholder="e.g. 100 or -50"
                  className="w-full rounded-xl border border-[#D9E2E8] bg-white px-3.5 py-2 text-xs text-[#0F172A] placeholder-[#94A3B8] focus:border-[#087F5B] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">
                  Audit Reason / Note <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g. VIP bonus, refund compensation, trial promo"
                  className="w-full rounded-xl border border-[#D9E2E8] bg-white px-3.5 py-2 text-xs text-[#0F172A] placeholder-[#94A3B8] focus:border-[#087F5B] focus:outline-none"
                />
              </div>

              <div className="mt-5 flex items-center justify-end gap-2.5 pt-2 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setModalUser(null)}
                  className="rounded-xl border border-[#D9E2E8] bg-white px-4 py-2 text-xs font-semibold text-[#334155] hover:bg-[#F8FAFC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjustBusy}
                  className="rounded-xl bg-[#087F5B] px-4 py-2 text-xs font-bold text-white hover:bg-[#066B4D] shadow-xs"
                >
                  {adjustBusy ? "Applying…" : "Confirm Credit Adjustment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
