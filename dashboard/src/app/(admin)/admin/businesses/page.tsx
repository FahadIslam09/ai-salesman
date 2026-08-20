"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, Spinner } from "@/lib/ui";
import {
  IconStore,
  IconSearch,
  IconShoppingBag,
  IconPackage,
  IconCoins,
  IconLayers,
  IconSparkles,
  IconCheck,
} from "@/components/Icons";

interface BusinessItem {
  id: string;
  name: string;
  fbPageId: string;
  isActive: boolean;
  connectedAt: string;
  owner: { id: string; name: string | null; email: string; isBanned: boolean } | null;
  botEnabled: boolean;
  productsCount: number;
  ordersCount: number;
  revenueGeneratedBdt: number;
  ownerCredits: number;
  plan: string;
}

export default function AdminBusinessesPage() {
  const [businesses, setBusinesses] = useState<BusinessItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [botFilter, setBotFilter] = useState("all");
  const [toggleBusyId, setToggleBusyId] = useState<string | null>(null);

  function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());

    api<BusinessItem[]>(`/api/admin/businesses?${params.toString()}`)
      .then(setBusinesses)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleToggleBot(b: BusinessItem) {
    setToggleBusyId(b.id);
    try {
      await api(`/api/admin/pages/${b.id}/bot`, {
        method: "PATCH",
        body: JSON.stringify({ enabled: !b.botEnabled }),
      });
      load();
    } catch (err: any) {
      alert(`Error updating bot: ${err.message}`);
    } finally {
      setToggleBusyId(null);
    }
  }

  const filtered = businesses.filter((b) => {
    if (botFilter === "enabled" && !b.botEnabled) return false;
    if (botFilter === "disabled" && b.botEnabled) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#0F172A] tracking-tight">
            Businesses & Tenant Directory
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Monitor connected merchant stores, active sales bots, catalog sizes, and commerce volume.
          </p>
        </div>

        <div className="text-xs font-semibold text-[#64748B]">
          Total Stores: <span className="text-[#087F5B] font-bold">{businesses.length}</span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              load();
            }}
            className="relative flex-1"
          >
            <IconSearch
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by store name, FB ID, or owner email…"
              className="w-full rounded-xl border border-[#D9E2E8] bg-[#FAFBFB] py-2 pl-10 pr-4 text-xs text-[#0F172A] placeholder-[#94A3B8] focus:border-[#087F5B] focus:bg-white focus:outline-none"
            />
          </form>

          <div className="flex items-center gap-2">
            <select
              value={botFilter}
              onChange={(e) => setBotFilter(e.target.value)}
              className="rounded-xl border border-[#D9E2E8] bg-white px-3 py-2 text-xs font-semibold text-[#334155] focus:border-[#087F5B] focus:outline-none"
            >
              <option value="all">All Bot Statuses</option>
              <option value="enabled">Active AI Bots</option>
              <option value="disabled">Paused Bots</option>
            </select>

            <button
              type="button"
              onClick={load}
              className="rounded-xl bg-[#087F5B] px-4 py-2 text-xs font-bold text-white hover:bg-[#066B4D] shadow-xs"
            >
              Search
            </button>
          </div>
        </div>
      </Card>

      {/* Businesses Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Spinner />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#64748B]">
            No tenant businesses matched your search.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#FAFBFB] text-[#64748B] uppercase text-[10px] tracking-wider font-bold">
                  <th className="py-3.5 px-4">Business / Store</th>
                  <th className="py-3.5 px-4">Owner Tenant</th>
                  <th className="py-3.5 px-4 text-center">AI Bot Status</th>
                  <th className="py-3.5 px-4 text-right">Products</th>
                  <th className="py-3.5 px-4 text-right">Orders Closed</th>
                  <th className="py-3.5 px-4 text-right">Order GMV (BDT)</th>
                  <th className="py-3.5 px-4 text-right">Available Credits</th>
                  <th className="py-3.5 px-4 text-right">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filtered.map((b) => {
                  const isBusy = toggleBusyId === b.id;
                  return (
                    <tr key={b.id} className="hover:bg-[#F8FAFC] transition-colors">
                      {/* Business Info */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#0F172A] text-sm">{b.name}</div>
                        <div className="text-[11px] font-mono text-[#94A3B8]">
                          FB ID: {b.fbPageId}
                        </div>
                      </td>

                      {/* Owner */}
                      <td className="py-3.5 px-4">
                        {b.owner ? (
                          <div>
                            <div className="font-bold text-[#0F172A]">{b.owner.name || "Owner"}</div>
                            <div className="text-[11px] text-[#64748B] font-mono">{b.owner.email}</div>
                          </div>
                        ) : (
                          <span className="text-[#94A3B8]">—</span>
                        )}
                      </td>

                      {/* Bot Status Toggle */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleToggleBot(b)}
                          className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1 text-xs font-bold transition-all shadow-2xs ${
                            b.botEnabled
                              ? "bg-[#E8F5EF] text-[#087F5B] hover:bg-[#d5eee2]"
                              : "bg-[#F1F5F9] text-[#64748B] hover:bg-[#e2e8f0]"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              b.botEnabled ? "bg-[#10B981] animate-pulse" : "bg-[#94A3B8]"
                            }`}
                          />
                          <span>{b.botEnabled ? "Active Bot" : "Paused"}</span>
                        </button>
                      </td>

                      {/* Products */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-[#0F172A]">
                        {b.productsCount}
                      </td>

                      {/* Orders Closed */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-[#087F5B]">
                        {b.ordersCount}
                      </td>

                      {/* Order Value */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-[#0F172A]">
                        ৳{b.revenueGeneratedBdt.toLocaleString()}
                      </td>

                      {/* Available Credits */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-[#087F5B]">
                        {b.ownerCredits.toLocaleString()}
                      </td>

                      {/* Connected Date */}
                      <td className="py-3.5 px-4 text-right text-[#64748B] whitespace-nowrap text-[11px]">
                        {new Date(b.connectedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
