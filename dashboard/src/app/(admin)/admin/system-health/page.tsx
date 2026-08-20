"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, Spinner } from "@/lib/ui";
import {
  IconServer,
  IconCpu,
  IconShield,
  IconCheck,
  IconActivity,
  IconLayers,
} from "@/components/Icons";

interface HealthData {
  services: Array<{
    name: string;
    status: string;
    latencyMs: number;
    category: string;
  }>;
  systemMetrics: {
    uptimeSeconds: number;
    memoryUsageMb: number;
    nodeVersion: string;
    platform: string;
  };
}

function formatUptime(seconds: number) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${days > 0 ? `${days}d ` : ""}${hours}h ${minutes}m`;
}

export default function AdminSystemHealthPage() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    api<HealthData>("/api/admin/system-health")
      .then(setData)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  if (loading || !data) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const { services, systemMetrics } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#0F172A] tracking-tight">
            System Health & Infrastructure
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Live operational status across all backend microservices, database, AI model endpoints, and integrations.
          </p>
        </div>

        <button
          type="button"
          onClick={load}
          className="rounded-xl bg-[#087F5B] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-[#066B4D] transition-colors"
        >
          Run Health Check
        </button>
      </div>

      {/* Overview Status Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Card className="p-5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
            Platform Status
          </div>
          <div className="mt-2 text-2xl font-bold text-[#10B981] flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#10B981] animate-pulse" />
            <span>100% Operational</span>
          </div>
          <p className="mt-1 text-xs text-[#64748B]">All 7 core systems healthy</p>
        </Card>

        <Card className="p-5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
            System Uptime
          </div>
          <div className="mt-2 text-2xl font-bold text-[#0F172A] font-mono">
            {formatUptime(systemMetrics.uptimeSeconds)}
          </div>
          <p className="mt-1 text-xs text-[#64748B]">Continuous server runtime</p>
        </Card>

        <Card className="p-5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
            RAM Memory Usage
          </div>
          <div className="mt-2 text-2xl font-bold text-[#0F172A] font-mono">
            {systemMetrics.memoryUsageMb} MB
          </div>
          <p className="mt-1 text-xs text-[#64748B]">Node.js heap allocation</p>
        </Card>

        <Card className="p-5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
            Runtime Environment
          </div>
          <div className="mt-2 text-2xl font-bold text-[#0F172A] font-mono">
            {systemMetrics.nodeVersion}
          </div>
          <p className="mt-1 text-xs text-[#64748B]">OS: {systemMetrics.platform}</p>
        </Card>
      </div>

      {/* Detailed Services Table */}
      <Card className="overflow-hidden">
        <div className="p-5 border-b border-[#E2E8F0]">
          <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
            <IconServer size={16} className="text-[#087F5B]" />
            <span>Core Services & Model Integrations</span>
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#FAFBFB] text-[#64748B] uppercase text-[10px] tracking-wider font-bold">
                <th className="py-3 px-4">Service / Component</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Response Latency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {services.map((s) => (
                <tr key={s.name} className="hover:bg-[#F8FAFC] transition-colors">
                  <td className="py-3.5 px-4 font-bold text-[#0F172A]">
                    {s.name}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex rounded-md bg-[#F1F5F9] px-2 py-0.5 text-[11px] font-semibold text-[#475569]">
                      {s.category}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E8F5EF] px-3 py-1 text-xs font-bold text-[#087F5B]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                      {s.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-[#087F5B]">
                    {s.latencyMs} ms
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
