"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, Spinner } from "@/lib/ui";
import {
  IconSettings,
  IconShield,
  IconCheck,
  IconServer,
  IconCpu,
} from "@/components/Icons";

interface SettingsData {
  settings: Record<string, string>;
  envInfo: {
    nodeEnv: string;
    port: number | string;
    markupMultiplier: string;
    classifierModel: string;
    chatModel: string;
    summarizeModel: string;
  };
}

export default function AdminSettingsPage() {
  const [data, setData] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form State
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [defaultStarterCredits, setDefaultStarterCredits] = useState("50");
  const [globalAnnouncement, setGlobalAnnouncement] = useState("");
  const [globalMarkup, setGlobalMarkup] = useState("4");

  function load() {
    setLoading(true);
    api<SettingsData>("/api/admin/settings")
      .then((res) => {
        setData(res);
        setMaintenanceMode(res.settings.maintenance_mode === "true");
        setDefaultStarterCredits(res.settings.default_starter_credits || "50");
        setGlobalAnnouncement(res.settings.global_announcement || "");
        setGlobalMarkup(res.settings.global_markup_multiplier || res.envInfo.markupMultiplier || "4");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    try {
      await api("/api/admin/settings", {
        method: "POST",
        body: JSON.stringify({
          maintenance_mode: String(maintenanceMode),
          default_starter_credits: defaultStarterCredits,
          global_announcement: globalAnnouncement,
          global_markup_multiplier: globalMarkup,
        }),
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      load();
    } catch (err: any) {
      alert(`Error saving settings: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  if (loading || !data) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const { envInfo } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#0F172A] tracking-tight">
            Platform Settings & System Controls
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Configure global SaaS parameters, token markup multipliers, maintenance modes, and default quotas.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Form Controls (8 cols) */}
        <div className="space-y-6 lg:col-span-8">
          <Card className="p-6">
            <form onSubmit={handleSave} className="space-y-6">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
                <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
                  <IconShield size={16} className="text-[#087F5B]" />
                  <span>Platform Parameters</span>
                </h3>

                {saveSuccess && (
                  <span className="flex items-center gap-1 text-xs font-bold text-[#087F5B] animate-fadeIn">
                    <IconCheck size={14} />
                    <span>Settings Saved Successfully!</span>
                  </span>
                )}
              </div>

              {/* Maintenance Mode */}
              <div className="flex items-center justify-between rounded-xl bg-[#FAFBFB] p-4 border border-[#E2E8F0]">
                <div>
                  <div className="text-xs font-bold text-[#0F172A] flex items-center gap-2">
                    <span>Platform Maintenance Mode</span>
                    {maintenanceMode && (
                      <span className="rounded bg-[#FEE2E2] px-1.5 py-0.5 text-[10px] font-bold text-[#DC2626]">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#64748B] mt-0.5">
                    Temporarily pause tenant operations while performing database upgrades or service maintenance.
                  </p>
                </div>

                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={maintenanceMode}
                    onChange={(e) => setMaintenanceMode(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="h-6 w-11 rounded-full bg-[#CBD5E1] peer-checked:bg-[#DC2626] peer-focus:outline-none after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full" />
                </label>
              </div>

              {/* Default Starter Credits */}
              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">
                  Default Starter Credits for New User Signups
                </label>
                <input
                  type="number"
                  required
                  value={defaultStarterCredits}
                  onChange={(e) => setDefaultStarterCredits(e.target.value)}
                  className="w-full rounded-xl border border-[#D9E2E8] bg-white px-3.5 py-2 text-xs text-[#0F172A] focus:border-[#087F5B] focus:outline-none"
                />
                <p className="text-[11px] text-[#64748B] mt-1">
                  Free initial credits credited to a newly registered user account upon email verification.
                </p>
              </div>

              {/* Customer Markup Multiplier */}
              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">
                  Customer Markup Multiplier (over actual provider API cost)
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={globalMarkup}
                  onChange={(e) => setGlobalMarkup(e.target.value)}
                  className="w-full rounded-xl border border-[#D9E2E8] bg-white px-3.5 py-2 text-xs text-[#0F172A] focus:border-[#087F5B] focus:outline-none"
                />
                <p className="text-[11px] text-[#64748B] mt-1">
                  Currently set to <span className="text-[#087F5B] font-bold">{globalMarkup}x</span> (4x yields a ~75% gross profit margin on raw AI token usage).
                </p>
              </div>

              {/* Global Announcement Banner */}
              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">
                  Global Announcement Banner
                </label>
                <textarea
                  rows={3}
                  value={globalAnnouncement}
                  onChange={(e) => setGlobalAnnouncement(e.target.value)}
                  placeholder="e.g. Scheduled maintenance at 2 AM BST. New high-speed Gemini Flash 2.5 engine is live!"
                  className="w-full rounded-xl border border-[#D9E2E8] bg-white px-3.5 py-2 text-xs text-[#0F172A] placeholder-[#94A3B8] focus:border-[#087F5B] focus:outline-none"
                />
                <p className="text-[11px] text-[#64748B] mt-1">
                  Leave empty to hide. Broadcast message appears at the top of all merchant dashboards.
                </p>
              </div>

              <div className="flex items-center justify-end pt-2 border-t border-[#E2E8F0]">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-[#087F5B] px-5 py-2 text-xs font-bold text-white hover:bg-[#066B4D] shadow-xs transition-colors"
                >
                  {saving ? "Saving…" : "Save Platform Settings"}
                </button>
              </div>
            </form>
          </Card>
        </div>

        {/* Right Column: AI Architecture Diagnostics (4 cols) */}
        <div className="space-y-6 lg:col-span-4">
          <Card className="p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#64748B] flex items-center gap-2">
              <IconServer size={14} className="text-[#087F5B]" />
              <span>Active Model Pipeline</span>
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="rounded-xl bg-[#FAFBFB] p-3 border border-[#E2E8F0]">
                <div className="text-[10px] text-[#64748B] uppercase font-bold">Classifier Model</div>
                <div className="font-mono font-bold text-[#087F5B] mt-0.5">{envInfo.classifierModel}</div>
              </div>

              <div className="rounded-xl bg-[#FAFBFB] p-3 border border-[#E2E8F0]">
                <div className="text-[10px] text-[#64748B] uppercase font-bold">Main Sales Closer Model</div>
                <div className="font-mono font-bold text-[#2563EB] mt-0.5">{envInfo.chatModel}</div>
              </div>

              <div className="rounded-xl bg-[#FAFBFB] p-3 border border-[#E2E8F0]">
                <div className="text-[10px] text-[#64748B] uppercase font-bold">Chat Summarizer Model</div>
                <div className="font-mono font-bold text-[#7E22CE] mt-0.5">{envInfo.summarizeModel}</div>
              </div>

              <div className="rounded-xl bg-[#FAFBFB] p-3 border border-[#E2E8F0]">
                <div className="text-[10px] text-[#64748B] uppercase font-bold">Server Port / Environment</div>
                <div className="font-mono text-[#334155] mt-0.5">
                  Port :{envInfo.port} ({envInfo.nodeEnv})
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
