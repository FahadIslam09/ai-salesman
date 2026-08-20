"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, Spinner } from "@/lib/ui";
import {
  IconShield,
  IconSearch,
  IconCheck,
  IconAlertTriangle,
} from "@/components/Icons";

interface AuditLogItem {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  targetType: string;
  targetId: string | null;
  details: string;
  ipAddress: string | null;
  createdAt: string;
}

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  function load() {
    setLoading(true);
    api<AuditLogItem[]>("/api/admin/audit-logs")
      .then(setLogs)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = logs.filter((l) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      l.adminEmail.toLowerCase().includes(q) ||
      l.action.toLowerCase().includes(q) ||
      l.details.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#0F172A] tracking-tight">
            Security & Administrative Audit Logs
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Immutable audit trail of all administrative actions, credit grants, role changes, and security modifications.
          </p>
        </div>

        <button
          type="button"
          onClick={load}
          className="rounded-xl border border-[#D9E2E8] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#0F172A] shadow-2xs hover:bg-[#F8FAFC] transition-colors"
        >
          Refresh Logs
        </button>
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
            placeholder="Search audit trail by admin email, action, or details…"
            className="w-full rounded-xl border border-[#D9E2E8] bg-[#FAFBFB] py-2 pl-10 pr-4 text-xs text-[#0F172A] placeholder-[#94A3B8] focus:border-[#087F5B] focus:bg-white focus:outline-none"
          />
        </div>
      </Card>

      {/* Audit Logs Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Spinner />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#64748B]">
            No audit logs recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#FAFBFB] text-[#64748B] uppercase text-[10px] tracking-wider font-bold">
                  <th className="py-3 px-4">Admin</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Target Type</th>
                  <th className="py-3 px-4">Event Details</th>
                  <th className="py-3 px-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-3.5 px-4 font-bold text-[#0F172A]">
                      {log.adminEmail}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex rounded-md bg-[#E8F5EF] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#087F5B]">
                        {log.action.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[#64748B] font-semibold uppercase text-[10px]">
                      {log.targetType}
                    </td>
                    <td className="py-3.5 px-4 text-[#334155] font-medium leading-relaxed max-w-md">
                      {log.details}
                    </td>
                    <td className="py-3.5 px-4 text-right text-[#64748B] text-[11px] whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
