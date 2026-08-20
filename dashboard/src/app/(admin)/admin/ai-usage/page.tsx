"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, Spinner } from "@/lib/ui";
import {
  IconSparkles,
  IconCpu,
  IconTrendingUp,
  IconSearch,
  IconCoins,
} from "@/components/Icons";

interface AiUsageData {
  modelStats: Record<
    string,
    {
      requests: number;
      tokensIn: number;
      tokensOut: number;
      apiCostUsd: number;
      billableUsd: number;
    }
  >;
  kindStats: Record<string, number>;
  logs: Array<{
    id: string;
    userName: string;
    pageName: string;
    kind: string;
    model: string;
    tokensIn: number;
    tokensOut: number;
    apiCostUsd: number;
    billableUsd: number;
    creditsUsed: number;
    createdAt: string;
  }>;
}

export default function AdminAiUsagePage() {
  const [data, setData] = useState<AiUsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modelFilter, setModelFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  function load() {
    setLoading(true);
    api<AiUsageData>("/api/admin/ai-usage")
      .then(setData)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, modelFilter, pageSize]);

  if (loading || !data) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const { modelStats, kindStats, logs } = data;

  const filteredLogs = logs.filter((l) => {
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const matchUser = l.userName.toLowerCase().includes(q);
      const matchPage = l.pageName.toLowerCase().includes(q);
      const matchKind = l.kind.toLowerCase().includes(q);
      if (!matchUser && !matchPage && !matchKind) return false;
    }
    if (modelFilter !== "all" && l.model !== modelFilter) return false;
    return true;
  });

  const totalPages = Math.ceil(filteredLogs.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredLogs.length);
  const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#0F172A] tracking-tight">
            AI Token Economics & Arbitrage
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Audit cross-tenant token volumes, per-model cost breakdowns, and live SaaS profit margins.
          </p>
        </div>

        <button
          type="button"
          onClick={load}
          className="rounded-xl border border-[#D9E2E8] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#0F172A] shadow-2xs hover:bg-[#F8FAFC] transition-colors"
        >
          Refresh Audit Log
        </button>
      </div>

      {/* Model Breakdown Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(modelStats).map(([modelName, stats]) => {
          const cleanName = modelName.replace("openai/", "").replace("google/", "").replace("deepseek/", "");
          const marginPct =
            stats.billableUsd > 0
              ? Math.round(((stats.billableUsd - stats.apiCostUsd) / stats.billableUsd) * 100)
              : 75;

          return (
            <Card key={modelName} className="p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
                <div>
                  <h3 className="font-bold text-[#0F172A] text-sm">{cleanName}</h3>
                  <p className="text-[10px] font-mono text-[#64748B] truncate max-w-[180px]">
                    {modelName}
                  </p>
                </div>
                <span className="rounded-lg bg-[#E8F5EF] px-2 py-0.5 text-[11px] font-bold text-[#087F5B]">
                  {marginPct}% Margin
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl bg-[#FAFBFB] p-2.5 border border-[#E2E8F0]">
                  <div className="text-[#64748B] text-[10px]">Requests</div>
                  <div className="font-mono font-bold text-[#0F172A] text-sm">
                    {stats.requests.toLocaleString()}
                  </div>
                </div>
                <div className="rounded-xl bg-[#FAFBFB] p-2.5 border border-[#E2E8F0]">
                  <div className="text-[#64748B] text-[10px]">Tokens Processed</div>
                  <div className="font-mono font-bold text-[#087F5B] text-sm">
                    {(stats.tokensIn + stats.tokensOut).toLocaleString()}
                  </div>
                </div>
                <div className="rounded-xl bg-[#FAFBFB] p-2.5 border border-[#E2E8F0]">
                  <div className="text-[#64748B] text-[10px]">Real API Cost</div>
                  <div className="font-mono font-bold text-[#475569] text-sm">
                    ${stats.apiCostUsd.toFixed(4)}
                  </div>
                </div>
                <div className="rounded-xl bg-[#FAFBFB] p-2.5 border border-[#E2E8F0]">
                  <div className="text-[#64748B] text-[10px]">Customer Billed</div>
                  <div className="font-mono font-bold text-[#7E22CE] text-sm">
                    ${stats.billableUsd.toFixed(4)}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Task Kind Breakdown */}
      <Card className="p-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#64748B] mb-3">
          AI Invocations by Task Category
        </h3>
        <div className="flex flex-wrap gap-2.5">
          {Object.entries(kindStats).map(([kind, count]) => (
            <div
              key={kind}
              className="flex items-center gap-2 rounded-xl bg-[#FAFBFB] px-3 py-2 border border-[#E2E8F0] text-xs"
            >
              <span className="font-medium text-[#334155] capitalize">{kind.replace("_", " ")}:</span>
              <span className="font-mono font-bold text-[#087F5B]">{count} calls</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Filter & Search */}
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
              placeholder="Search by tenant name, store, or task kind…"
              className="w-full rounded-xl border border-[#D9E2E8] bg-[#FAFBFB] py-2 pl-10 pr-4 text-xs text-[#0F172A] placeholder-[#94A3B8] focus:border-[#087F5B] focus:bg-white focus:outline-none"
            />
          </div>

          <select
            value={modelFilter}
            onChange={(e) => setModelFilter(e.target.value)}
            className="rounded-xl border border-[#D9E2E8] bg-white px-3 py-2 text-xs font-semibold text-[#334155] focus:border-[#087F5B] focus:outline-none"
          >
            <option value="all">All Models</option>
            {Object.keys(modelStats).map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {/* Live AI Calls Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#FAFBFB] text-[#64748B] uppercase text-[10px] tracking-wider font-bold">
                <th className="py-3 px-4">Tenant / Store</th>
                <th className="py-3 px-4">Task Kind</th>
                <th className="py-3 px-4">Model</th>
                <th className="py-3 px-4 text-right">Tokens In / Out</th>
                <th className="py-3 px-4 text-right">Real API Cost</th>
                <th className="py-3 px-4 text-right">Billed Value</th>
                <th className="py-3 px-4 text-right">Credits Deducted</th>
                <th className="py-3 px-4 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] font-mono">
              {paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#94A3B8] font-sans">
                    No matching AI usage logs found.
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-3 px-4 font-sans">
                      <div className="font-bold text-[#0F172A]">{log.userName}</div>
                      <div className="text-[11px] text-[#64748B]">{log.pageName}</div>
                    </td>
                    <td className="py-3 px-4 font-sans">
                      <span className="inline-flex rounded-md bg-[#F1F5F9] px-2 py-0.5 text-[10px] font-semibold text-[#334155]">
                        {log.kind}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[11px] text-[#475569] truncate max-w-[140px]">
                      {log.model.replace("openai/", "").replace("google/", "").replace("deepseek/", "")}
                    </td>
                    <td className="py-3 px-4 text-right text-[11px]">
                      <span className="text-[#087F5B] font-bold">{log.tokensIn}</span> /{" "}
                      <span className="text-[#2563EB] font-bold">{log.tokensOut}</span>
                    </td>
                    <td className="py-3 px-4 text-right text-[#64748B] text-[11px]">
                      ${log.apiCostUsd.toFixed(5)}
                    </td>
                    <td className="py-3 px-4 text-right text-[#7E22CE] font-bold text-[11px]">
                      ${log.billableUsd.toFixed(5)}
                    </td>
                    <td className="py-3 px-4 text-right text-[#087F5B] font-bold text-[11px]">
                      -{log.creditsUsed}
                    </td>
                    <td className="py-3 px-4 text-right font-sans text-[#64748B] text-[11px] whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls Footer */}
        {filteredLogs.length > 0 && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-[#E2E8F0] px-4 py-3 bg-[#FAFBFB]">
            <div className="flex items-center gap-2 text-xs text-[#64748B]">
              <span>
                Showing <strong className="text-[#0F172A]">{startIndex + 1}</strong> to{" "}
                <strong className="text-[#0F172A]">{endIndex}</strong> of{" "}
                <strong className="text-[#0F172A]">{filteredLogs.length}</strong> calls
              </span>

              <span className="text-[#CBD5E1]">|</span>

              <div className="flex items-center gap-1.5">
                <span>Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="rounded-lg border border-[#D9E2E8] bg-white px-2 py-1 text-xs font-semibold text-[#0F172A] focus:border-[#087F5B] focus:outline-none"
                >
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="flex items-center gap-1 rounded-xl border border-[#D9E2E8] bg-white px-3 py-1.5 text-xs font-semibold text-[#334155] shadow-2xs hover:bg-[#F8FAFC] disabled:opacity-40 transition-colors"
              >
                Previous
              </button>

              <span className="px-2 text-xs font-bold text-[#0F172A]">
                Page {currentPage} of {totalPages}
              </span>

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="flex items-center gap-1 rounded-xl border border-[#D9E2E8] bg-white px-3 py-1.5 text-xs font-semibold text-[#334155] shadow-2xs hover:bg-[#F8FAFC] disabled:opacity-40 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
