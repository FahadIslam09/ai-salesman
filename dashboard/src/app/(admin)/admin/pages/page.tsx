"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, Spinner } from "@/lib/ui";
import {
  IconLayers,
  IconSearch,
  IconShoppingBag,
  IconUsers,
  IconInbox,
  IconCheck,
  IconX,
} from "@/components/Icons";

interface AdminPageItem {
  id: string;
  name: string;
  fbPageId: string;
  isActive: boolean;
  connectedAt: string;
  owner: { id: string; name: string | null; email: string } | null;
  bot: {
    enabled: boolean;
    tone: string;
    language: string;
  };
  stats: {
    products: number;
    customers: number;
    conversations: number;
  };
}

export default function AdminPagesPage() {
  const [pages, setPages] = useState<AdminPageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [botFilter, setBotFilter] = useState("all");
  const [toggleBusyId, setToggleBusyId] = useState<string | null>(null);

  function loadPages() {
    setLoading(true);
    api<AdminPageItem[]>("/api/admin/pages")
      .then(setPages)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadPages();
  }, []);

  async function handleToggleBot(page: AdminPageItem) {
    setToggleBusyId(page.id);
    try {
      await api(`/api/admin/pages/${page.id}/bot`, {
        method: "PATCH",
        body: JSON.stringify({ enabled: !page.bot.enabled }),
      });
      loadPages();
    } catch (err: any) {
      alert(`Error updating bot status: ${err.message}`);
    } finally {
      setToggleBusyId(null);
    }
  }

  const filtered = pages.filter((p) => {
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const matchName = p.name.toLowerCase().includes(q);
      const matchFbId = p.fbPageId.toLowerCase().includes(q);
      const matchOwner = p.owner?.email.toLowerCase().includes(q) || p.owner?.name?.toLowerCase().includes(q);
      if (!matchName && !matchFbId && !matchOwner) return false;
    }
    if (botFilter === "enabled" && !p.bot.enabled) return false;
    if (botFilter === "disabled" && p.bot.enabled) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#0F172A] tracking-tight">
            Connected Facebook Pages & AI Bots
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Monitor and remotely control all connected Facebook Pages and AI Sales Bot configurations across all tenants.
          </p>
        </div>

        <div className="text-xs font-semibold text-[#64748B]">
          Total Pages: <span className="text-[#087F5B] font-bold">{pages.length}</span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <IconSearch
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by store name, FB page ID, or owner email…"
              className="w-full rounded-xl border border-[#D9E2E8] bg-[#FAFBFB] py-2 pl-10 pr-4 text-xs text-[#0F172A] placeholder-[#94A3B8] focus:border-[#087F5B] focus:bg-white focus:outline-none"
            />
          </div>

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
          </div>
        </div>
      </Card>

      {/* Pages Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Spinner />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#64748B]">
            No connected stores matched your search.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#FAFBFB] text-[#64748B] uppercase text-[10px] tracking-wider font-bold">
                  <th className="py-3.5 px-4">Store / Facebook Page</th>
                  <th className="py-3.5 px-4">Owner Tenant</th>
                  <th className="py-3.5 px-4 text-center">AI Bot Status</th>
                  <th className="py-3.5 px-4">Bot Persona</th>
                  <th className="py-3.5 px-4 text-right">Products</th>
                  <th className="py-3.5 px-4 text-right">Customers</th>
                  <th className="py-3.5 px-4 text-right">Conversations</th>
                  <th className="py-3.5 px-4 text-right">Connected At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filtered.map((p) => {
                  const isBusy = toggleBusyId === p.id;
                  return (
                    <tr key={p.id} className="hover:bg-[#F8FAFC] transition-colors">
                      {/* Store Details */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#0F172A] text-sm">{p.name}</div>
                        <div className="text-[11px] font-mono text-[#94A3B8]">
                          FB ID: {p.fbPageId}
                        </div>
                      </td>

                      {/* Owner User */}
                      <td className="py-3.5 px-4">
                        {p.owner ? (
                          <div>
                            <div className="font-bold text-[#0F172A]">
                              {p.owner.name || "Owner"}
                            </div>
                            <div className="text-[11px] text-[#64748B] font-mono">
                              {p.owner.email}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[#94A3B8]">—</span>
                        )}
                      </td>

                      {/* AI Bot Status Toggle */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleToggleBot(p)}
                          className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1 text-xs font-bold transition-all shadow-2xs ${
                            p.bot.enabled
                              ? "bg-[#E8F5EF] text-[#087F5B] hover:bg-[#d5eee2]"
                              : "bg-[#F1F5F9] text-[#64748B] hover:bg-[#e2e8f0]"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              p.bot.enabled ? "bg-[#10B981] animate-pulse" : "bg-[#94A3B8]"
                            }`}
                          />
                          <span>{p.bot.enabled ? "Active AI Bot" : "Paused"}</span>
                        </button>
                      </td>

                      {/* Bot Persona */}
                      <td className="py-3.5 px-4">
                        <div className="text-[11px] text-[#334155]">
                          Tone: <span className="font-semibold text-[#087F5B]">{p.bot.tone}</span>
                        </div>
                        <div className="text-[11px] text-[#64748B]">
                          Lang: <span className="font-semibold text-[#334155]">{p.bot.language}</span>
                        </div>
                      </td>

                      {/* Stats */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-[#0F172A]">
                        {p.stats.products}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-[#0F172A]">
                        {p.stats.customers}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-[#087F5B]">
                        {p.stats.conversations}
                      </td>

                      {/* Connected Date */}
                      <td className="py-3.5 px-4 text-right text-[#64748B] text-[11px] whitespace-nowrap">
                        {new Date(p.connectedAt).toLocaleDateString("en-US", {
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
