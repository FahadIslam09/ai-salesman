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
  IconSparkles,
  IconShield,
  IconLayers,
  IconActivity,
  IconUsers,
  IconCpu,
  IconAlertTriangle,
  IconSliders,
  IconCalculator,
} from "@/components/Icons";

interface PackageEconomics {
  id: string;
  name: string;
  priceBdt: number;
  baseCredits: number;
  bonusCredits: number;
  totalCredits: number;
  estimatedAiCostUsd: number;
  estimatedAiCostBdt: number;
  profitBdt: number;
  profitMarginPct: number;
}

interface PlanProfitability {
  plan: string;
  planId: string;
  customerCount: number;
  salesCount: number;
  revenueBdt: number;
  creditsIssued: number;
  estimatedCostBdt: number;
  profitBdt: number;
  profitMarginPct: number;
}

interface CustomerProfitability {
  userId: string;
  name: string;
  email: string;
  stores: string[];
  plan: string;
  revenueBdt: number;
  aiCostUsd: number;
  aiCostBdt: number;
  profitBdt: number;
  profitMarginPct: number;
  creditsUsed: number;
}

interface FinancialTrend {
  date: string;
  revenueBdt: number;
  costBdt: number;
  profitBdt: number;
}

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

interface FinanceOverviewData {
  overview: {
    totalGrossRevenueBdt: number;
    totalAiCostUsd: number;
    totalAiCostBdt: number;
    totalNetProfitBdt: number;
    profitMarginPct: number;
    totalCreditsSold: number;
    totalCreditsUsed: number;
    avgProfitPerCustomer: number;
    payingCustomersCount: number;
    currentMultiplier: number;
  };
  packageEconomics: PackageEconomics[];
  profitabilityByPlan: PlanProfitability[];
  customerProfitability: CustomerProfitability[];
  financialTrends: FinancialTrend[];
  transactions: Transaction[];
}

export default function AdminFinancePage() {
  const [data, setData] = useState<FinanceOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTxn, setSearchTxn] = useState("");
  const [searchCustomer, setSearchCustomer] = useState("");
  const [timeRange, setTimeRange] = useState<"7d" | "30d">("30d");

  // Multiplier Control State
  const [newMultiplier, setNewMultiplier] = useState("4.0");
  const [multiplierReason, setMultiplierReason] = useState("");
  const [showMultiplierModal, setShowMultiplierModal] = useState(false);
  const [multiplierBusy, setMultiplierBusy] = useState(false);
  const [multiplierSuccess, setMultiplierSuccess] = useState(false);

  // Profit Simulator State
  const [simCostBdt, setSimCostBdt] = useState("1000");
  const [simMultiplier, setSimMultiplier] = useState("2.5");

  // Record Offline Payment Modal State
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
    api<FinanceOverviewData>("/api/admin/finance")
      .then((res) => {
        setData(res);
        setNewMultiplier(String(res.overview.currentMultiplier));
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    api<any[]>("/api/admin/users").then((us) => {
      setUsersList(us.map((u) => ({ id: u.id, name: u.name, email: u.email })));
    });
  }, []);

  // Multiplier Save Handler
  async function handleApplyMultiplier() {
    if (!newMultiplier || isNaN(Number(newMultiplier))) return;
    setMultiplierBusy(true);
    try {
      await api("/api/admin/finance/multiplier", {
        method: "POST",
        body: JSON.stringify({
          multiplier: Number(newMultiplier),
          reason: multiplierReason.trim() || "Adjusted via Super Admin Profit Control",
        }),
      });
      setShowMultiplierModal(false);
      setMultiplierReason("");
      setMultiplierSuccess(true);
      setTimeout(() => setMultiplierSuccess(false), 4000);
      load();
    } catch (err: any) {
      alert(`Error changing multiplier: ${err.message}`);
    } finally {
      setMultiplierBusy(false);
    }
  }

  // Grant Offline Payment Handler
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
      setGrantError(err.message || "Failed to record payment.");
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

  const { overview, packageEconomics, profitabilityByPlan, customerProfitability, financialTrends, transactions } = data;

  // Simulator Calculations
  const simCostNum = Number(simCostBdt) || 0;
  const simMultNum = Number(simMultiplier) || 1.0;
  const simChargeNum = Math.round(simCostNum * simMultNum);
  const simProfitNum = Math.max(0, simChargeNum - simCostNum);
  const simMarginPct = simChargeNum > 0 ? Math.round((simProfitNum / simChargeNum) * 100) : 0;

  // Multiplier Preview calculations
  const sampleBaseCost = 100;
  const curMult = overview.currentMultiplier;
  const targetMult = Number(newMultiplier) || curMult;
  const curCharge = sampleBaseCost * curMult;
  const newCharge = sampleBaseCost * targetMult;
  const curProfit = curCharge - sampleBaseCost;
  const newProfit = newCharge - sampleBaseCost;

  // Filtered transactions
  const filteredTransactions = transactions.filter((t) => {
    if (!searchTxn.trim()) return true;
    const q = searchTxn.trim().toLowerCase();
    return (
      t.providerTxnId.toLowerCase().includes(q) ||
      t.user.email.toLowerCase().includes(q) ||
      (t.user.name && t.user.name.toLowerCase().includes(q))
    );
  });

  // Filtered customer profitability
  const filteredCustomers = customerProfitability.filter((c) => {
    if (!searchCustomer.trim()) return true;
    const q = searchCustomer.trim().toLowerCase();
    return (
      c.email.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      c.stores.some((s) => s.toLowerCase().includes(q))
    );
  });

  // Trends slicing
  const displayedTrends = timeRange === "7d" ? financialTrends.slice(-7) : financialTrends.slice(-30);
  const maxTrendValue = Math.max(1, ...displayedTrends.map((t) => Math.max(t.revenueBdt, t.costBdt, t.profitBdt)));

  return (
    <div className="space-y-8">
      {/* 1. Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#0F172A] tracking-tight">
            Revenue & Profitability Intelligence
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Full visibility over platform cash flow, actual AI/API costs, dynamic markup multiplier, and per-tenant profitability.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowGrantModal(true)}
            className="flex items-center gap-1.5 rounded-xl bg-[#087F5B] px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#066B4D] transition-colors"
          >
            <IconPlus size={15} />
            <span>Record Offline Payment</span>
          </button>
        </div>
      </div>

      {/* 2. Top Financial KPI Cards (6 Grid) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {/* KPI 1: Gross Revenue */}
        <Card className="p-4.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
              Gross Revenue
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E8F5EF] text-[#087F5B]">
              <IconCoins size={14} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-[#0F172A] font-mono">
            ৳{overview.totalGrossRevenueBdt.toLocaleString()}
          </div>
          <p className="mt-1 text-[11px] text-[#10B981] font-semibold">
            From {overview.payingCustomersCount} paying merchants
          </p>
        </Card>

        {/* KPI 2: AI & Platform Cost */}
        <Card className="p-4.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
              AI / API Cost
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FEE2E2] text-[#DC2626]">
              <IconCpu size={14} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-[#DC2626] font-mono">
            ৳{overview.totalAiCostBdt.toLocaleString()}
          </div>
          <p className="mt-1 text-[11px] text-[#64748B]">
            ${overview.totalAiCostUsd} USD (OpenRouter/Gemini)
          </p>
        </Card>

        {/* KPI 3: Net Profit */}
        <Card className="p-4.5 border-l-4 border-l-[#087F5B]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
              Total Net Profit
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E8F5EF] text-[#087F5B]">
              <IconTrendingUp size={14} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-[#087F5B] font-mono">
            ৳{overview.totalNetProfitBdt.toLocaleString()}
          </div>
          <p className="mt-1 text-[11px] text-[#087F5B] font-semibold">
            Revenue minus actual API costs
          </p>
        </Card>

        {/* KPI 4: Profit Margin */}
        <Card className="p-4.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
              Profit Margin
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E8F5EF] text-[#087F5B]">
              <IconSparkles size={14} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-[#0F172A]">
            {overview.profitMarginPct}%
          </div>
          <p className="mt-1 text-[11px] text-[#64748B]">
            Markup: {overview.currentMultiplier}× active
          </p>
        </Card>

        {/* KPI 5: Credits Sold / Used */}
        <Card className="p-4.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
              Credits Sold / Used
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E8F5EF] text-[#087F5B]">
              <IconCoins size={14} />
            </div>
          </div>
          <div className="mt-2 text-lg font-bold tracking-tight text-[#0F172A] font-mono">
            <span className="text-[#7E22CE]">{overview.totalCreditsSold.toLocaleString()}</span> /{" "}
            <span className="text-[#D97706]">{overview.totalCreditsUsed.toLocaleString()}</span>
          </div>
          <p className="mt-1 text-[11px] text-[#64748B]">
            Circulating: {(overview.totalCreditsSold - overview.totalCreditsUsed).toLocaleString()}
          </p>
        </Card>

        {/* KPI 6: Avg Profit per Customer */}
        <Card className="p-4.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
              Avg Profit / Merchant
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E8F5EF] text-[#087F5B]">
              <IconUsers size={14} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-[#0F172A] font-mono">
            ৳{overview.avgProfitPerCustomer.toLocaleString()}
          </div>
          <p className="mt-1 text-[11px] text-[#64748B]">
            Net ARPU across paying tenants
          </p>
        </Card>
      </div>

      {/* 3. AI Pricing Multiplier Control Card */}
      <Card className="p-6 border-[#087F5B]/30 bg-gradient-to-br from-white via-white to-[#F0FDF4]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-[#E2E8F0] pb-5">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#087F5B] text-white">
                <IconSliders size={15} />
              </div>
              <h3 className="text-sm font-bold text-[#0F172A]">AI Pricing & Profit Multiplier Control</h3>
              <span className="rounded-full bg-[#E8F5EF] px-2.5 py-0.5 text-[11px] font-bold text-[#087F5B] border border-[#087F5B]/20">
                Active: {overview.currentMultiplier}× Multiplier
              </span>
            </div>
            <p className="text-xs text-[#64748B] mt-1 max-w-2xl leading-relaxed">
              Dynamically controls the markup applied on actual raw AI token costs. Changes apply immediately to all future AI sales responses while preserving historical transaction integrity.
            </p>
          </div>

          {multiplierSuccess && (
            <div className="flex items-center gap-1.5 rounded-xl bg-[#E8F5EF] px-3.5 py-2 text-xs font-bold text-[#087F5B] animate-fadeIn">
              <IconCheck size={16} />
              <span>Multiplier Updated & Logged in Audit Trail!</span>
            </div>
          )}
        </div>

        {/* Multiplier Quick Adjuster Grid */}
        <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-12 items-center">
          <div className="lg:col-span-8 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#334155]">Preset Multipliers:</span>
              <div className="flex flex-wrap gap-1.5">
                {["1.0", "1.5", "2.0", "2.5", "3.0", "4.0"].map((preset) => {
                  const isSelected = newMultiplier === preset;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setNewMultiplier(preset)}
                      className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                        isSelected
                          ? "bg-[#087F5B] text-white shadow-xs"
                          : "border border-[#D9E2E8] bg-white text-[#334155] hover:bg-[#F8FAFC]"
                      }`}
                    >
                      {preset}×
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-[#334155]">Custom Multiplier:</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.05"
                  min="1.0"
                  max="20.0"
                  value={newMultiplier}
                  onChange={(e) => setNewMultiplier(e.target.value)}
                  className="w-24 rounded-xl border border-[#D9E2E8] bg-white px-3 py-1.5 text-xs font-bold text-[#0F172A] focus:border-[#087F5B] focus:outline-none"
                />
                <span className="text-xs text-[#64748B] font-semibold">×</span>
              </div>

              <button
                type="button"
                onClick={() => setShowMultiplierModal(true)}
                disabled={Number(newMultiplier) === overview.currentMultiplier}
                className="rounded-xl bg-[#087F5B] px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#066B4D] disabled:opacity-40 transition-all"
              >
                Apply Multiplier ({newMultiplier}×)
              </button>
            </div>
          </div>

          {/* Live Impact Preview */}
          <div className="lg:col-span-4 rounded-xl border border-[#E2E8F0] bg-white p-3.5 space-y-2 text-xs shadow-2xs">
            <div className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
              Impact Simulation on ৳100 Raw AI Cost:
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-[#64748B]">Customer Billed:</span>
              <span className="font-mono font-bold text-[#0F172A]">
                ৳{curCharge} → <span className="text-[#087F5B]">৳{newCharge}</span>
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-[#64748B]">Platform Net Profit:</span>
              <span className="font-mono font-bold text-[#087F5B]">
                ৳{curProfit} → <span>৳{newProfit}</span> ({newCharge > 0 ? Math.round((newProfit / newCharge) * 100) : 0}% Margin)
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* 4. Profit per Recharge Package (Comparison Grid) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[#0F172A] tracking-tight">
              Unit Economics & Profit per Package
            </h3>
            <p className="text-xs text-[#64748B]">
              Calculated dynamically at current {overview.currentMultiplier}× multiplier and $0.0001 credit value.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {packageEconomics.map((pkg) => (
            <Card key={pkg.id} className="p-4.5 space-y-3 hover:border-[#087F5B]/50 transition-all">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2.5">
                <div>
                  <h4 className="font-bold text-[#0F172A] text-sm">{pkg.name}</h4>
                  <div className="font-mono font-bold text-[#087F5B] text-base">৳{pkg.priceBdt}</div>
                </div>
                <span className="rounded-lg bg-[#E8F5EF] px-2 py-0.5 text-[11px] font-bold text-[#087F5B]">
                  {pkg.profitMarginPct}% Margin
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Total Credits:</span>
                  <span className="font-mono font-bold text-[#0F172A]">{pkg.totalCredits.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Bonus Included:</span>
                  <span className="font-mono text-[#7E22CE]">+{pkg.bonusCredits.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Estimated AI Cost:</span>
                  <span className="font-mono text-[#DC2626]">৳{pkg.estimatedAiCostBdt} (${pkg.estimatedAiCostUsd})</span>
                </div>
                <div className="flex justify-between border-t border-[#E2E8F0] pt-1.5">
                  <span className="font-bold text-[#334155]">Net Profit:</span>
                  <span className="font-mono font-bold text-[#087F5B]">৳{pkg.profitBdt}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* 5. Revenue vs Cost vs Profit Financial Trend Visual */}
      <Card className="p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#E2E8F0] pb-4">
          <div>
            <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
              <IconTrendingUp size={16} className="text-[#087F5B]" />
              <span>Financial Growth Timeline (Revenue vs Cost vs Profit)</span>
            </h3>
            <p className="text-xs text-[#64748B] mt-0.5">
              Daily revenue intake vs AI token computing expenditure
            </p>
          </div>

          <div className="flex items-center gap-1 rounded-xl bg-[#FAFBFB] p-1 border border-[#E2E8F0]">
            <button
              type="button"
              onClick={() => setTimeRange("7d")}
              className={`rounded-lg px-3 py-1 text-xs font-bold transition-all ${
                timeRange === "7d" ? "bg-white text-[#087F5B] shadow-xs" : "text-[#64748B] hover:text-[#0F172A]"
              }`}
            >
              7 Days
            </button>
            <button
              type="button"
              onClick={() => setTimeRange("30d")}
              className={`rounded-lg px-3 py-1 text-xs font-bold transition-all ${
                timeRange === "30d" ? "bg-white text-[#087F5B] shadow-xs" : "text-[#64748B] hover:text-[#0F172A]"
              }`}
            >
              30 Days
            </button>
          </div>
        </div>

        {/* Visual Bar Graph */}
        <div className="mt-6 space-y-2">
          <div className="flex items-center justify-between text-xs text-[#64748B] pb-2 border-b border-[#E2E8F0]">
            <span className="font-semibold">Timeline Date</span>
            <div className="flex items-center gap-4 text-[11px] font-semibold">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-[#087F5B]" /> Revenue (৳)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-[#DC2626]" /> AI Cost (৳)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-[#2563EB]" /> Net Profit (৳)
              </span>
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto space-y-2 pt-2 pr-1">
            {displayedTrends.map((trend) => (
              <div key={trend.date} className="flex items-center gap-3 text-xs py-1 hover:bg-[#FAFBFB] rounded-lg px-2">
                <span className="w-24 shrink-0 font-mono text-[11px] text-[#64748B]">{trend.date}</span>
                <div className="flex-1 flex flex-col gap-1">
                  <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-[#F1F5F9]">
                    <div
                      style={{ width: `${(trend.revenueBdt / maxTrendValue) * 100}%` }}
                      className="bg-[#087F5B] transition-all"
                      title={`Revenue: ৳${trend.revenueBdt}`}
                    />
                    <div
                      style={{ width: `${(trend.costBdt / maxTrendValue) * 100}%` }}
                      className="bg-[#DC2626] transition-all"
                      title={`AI Cost: ৳${trend.costBdt}`}
                    />
                  </div>
                </div>
                <div className="w-36 shrink-0 text-right font-mono font-bold text-[11px]">
                  <span className="text-[#087F5B]">৳{trend.revenueBdt}</span> /{" "}
                  <span className="text-[#DC2626]">৳{trend.costBdt}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* 6. Two-Column Grid: Profitability by Plan & Interactive Profit Simulator */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Profitability by Plan (7 cols) */}
        <div className="lg:col-span-7">
          <Card className="p-5 h-full">
            <h3 className="text-sm font-bold text-[#0F172A] mb-3">Profitability by Plan</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E2E8F0] bg-[#FAFBFB] text-[#64748B] uppercase text-[10px] tracking-wider font-bold">
                    <th className="py-2.5 px-3">Plan</th>
                    <th className="py-2.5 px-3 text-right">Merchants</th>
                    <th className="py-2.5 px-3 text-right">Gross Revenue</th>
                    <th className="py-2.5 px-3 text-right">Est. AI Cost</th>
                    <th className="py-2.5 px-3 text-right">Net Profit</th>
                    <th className="py-2.5 px-3 text-right">Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] font-mono">
                  {profitabilityByPlan.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-[#94A3B8] font-sans">
                        No package sales recorded yet.
                      </td>
                    </tr>
                  ) : (
                    profitabilityByPlan.map((p) => (
                      <tr key={p.planId} className="hover:bg-[#F8FAFC]">
                        <td className="py-3 px-3 font-sans font-bold text-[#0F172A]">{p.plan}</td>
                        <td className="py-3 px-3 text-right text-[#334155]">{p.customerCount}</td>
                        <td className="py-3 px-3 text-right font-bold text-[#0F172A]">৳{p.revenueBdt.toLocaleString()}</td>
                        <td className="py-3 px-3 text-right text-[#DC2626]">৳{p.estimatedCostBdt.toLocaleString()}</td>
                        <td className="py-3 px-3 text-right font-bold text-[#087F5B]">৳{p.profitBdt.toLocaleString()}</td>
                        <td className="py-3 px-3 text-right font-sans">
                          <span className="rounded-md bg-[#E8F5EF] px-1.5 py-0.5 text-[10px] font-bold text-[#087F5B]">
                            {p.profitMarginPct}%
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Right: Interactive Profit Simulator (5 cols) */}
        <div className="lg:col-span-5">
          <Card className="p-5 space-y-4 h-full bg-[#FAFBFB]">
            <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-3">
              <IconCalculator size={18} className="text-[#087F5B]" />
              <div>
                <h3 className="text-sm font-bold text-[#0F172A]">Interactive Profit Simulator</h3>
                <p className="text-[11px] text-[#64748B]">Simulate pricing models without modifying live rates</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#334155] mb-1">Expected AI API Cost (৳):</label>
                <input
                  type="number"
                  value={simCostBdt}
                  onChange={(e) => setSimCostBdt(e.target.value)}
                  placeholder="e.g. 1000"
                  className="w-full rounded-xl border border-[#D9E2E8] bg-white px-3 py-2 text-xs font-bold text-[#0F172A] focus:border-[#087F5B] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#334155] mb-1">Target Pricing Multiplier (×):</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    min="1.0"
                    value={simMultiplier}
                    onChange={(e) => setSimMultiplier(e.target.value)}
                    className="w-28 rounded-xl border border-[#D9E2E8] bg-white px-3 py-2 text-xs font-bold text-[#0F172A] focus:border-[#087F5B] focus:outline-none"
                  />
                  <div className="flex gap-1">
                    {["1.5", "2.0", "3.0", "4.0"].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setSimMultiplier(m)}
                        className="rounded-lg border border-[#D9E2E8] bg-white px-2 py-1 text-[11px] font-bold text-[#334155] hover:bg-[#E8F5EF] hover:text-[#087F5B]"
                      >
                        {m}×
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Simulation Result Box */}
              <div className="rounded-xl border border-[#087F5B]/30 bg-white p-3.5 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#64748B]">Customer Charge:</span>
                  <span className="font-mono font-bold text-[#0F172A] text-sm">৳{simChargeNum.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#64748B]">Estimated Net Profit:</span>
                  <span className="font-mono font-bold text-[#087F5B] text-sm">৳{simProfitNum.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-xs border-t border-[#E2E8F0] pt-1.5">
                  <span className="text-[#64748B]">Gross Profit Margin:</span>
                  <span className="rounded-md bg-[#E8F5EF] px-2 py-0.5 font-bold text-[#087F5B] text-xs">
                    {simMarginPct}%
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* 7. Customer / Business Profitability */}
      <Card className="p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#E2E8F0] pb-4 mb-4">
          <div>
            <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
              <IconUsers size={16} className="text-[#087F5B]" />
              <span>Merchant & Tenant Profitability</span>
            </h3>
            <p className="text-xs text-[#64748B] mt-0.5">
              Identify high-value merchants and token-intensive customer accounts
            </p>
          </div>

          <div className="relative w-64">
            <IconSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              type="text"
              value={searchCustomer}
              onChange={(e) => setSearchCustomer(e.target.value)}
              placeholder="Search merchant or store…"
              className="w-full rounded-xl border border-[#D9E2E8] bg-[#FAFBFB] py-1.5 pl-9 pr-3 text-xs text-[#0F172A] focus:border-[#087F5B] focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#FAFBFB] text-[#64748B] uppercase text-[10px] tracking-wider font-bold">
                <th className="py-3 px-3">Merchant / Store</th>
                <th className="py-3 px-3">Plan</th>
                <th className="py-3 px-3 text-right">Total Paid (৳)</th>
                <th className="py-3 px-3 text-right">AI Cost (৳)</th>
                <th className="py-3 px-3 text-right">Net Profit (৳)</th>
                <th className="py-3 px-3 text-right">Margin</th>
                <th className="py-3 px-3 text-right">Credits Used</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#94A3B8]">
                    No merchant accounts found.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => (
                  <tr key={c.userId} className="hover:bg-[#F8FAFC]">
                    <td className="py-3 px-3">
                      <div className="font-bold text-[#0F172A]">{c.name}</div>
                      <div className="text-[11px] text-[#64748B] font-mono">{c.email}</div>
                    </td>
                    <td className="py-3 px-3 capitalize text-[#334155] font-semibold">{c.plan}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-[#0F172A]">
                      ৳{c.revenueBdt.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-[#DC2626]">
                      ৳{c.aiCostBdt.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-[#087F5B]">
                      ৳{c.profitBdt.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-[#087F5B]">
                      {c.profitMarginPct}%
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-[#D97706]">
                      {c.creditsUsed.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 8. Transaction & Revenue History Table */}
      <Card className="p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#E2E8F0] pb-4 mb-4">
          <div>
            <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
              <IconCoins size={16} className="text-[#087F5B]" />
              <span>Payment & Credit Purchase History</span>
            </h3>
            <p className="text-xs text-[#64748B] mt-0.5">
              bKash gateway and manual offline recharge transactions
            </p>
          </div>

          <div className="relative w-64">
            <IconSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              type="text"
              value={searchTxn}
              onChange={(e) => setSearchTxn(e.target.value)}
              placeholder="Search by Txn ID or email…"
              className="w-full rounded-xl border border-[#D9E2E8] bg-[#FAFBFB] py-1.5 pl-9 pr-3 text-xs text-[#0F172A] focus:border-[#087F5B] focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#FAFBFB] text-[#64748B] uppercase text-[10px] tracking-wider font-bold">
                <th className="py-3 px-3">Txn ID / Provider</th>
                <th className="py-3 px-3">Merchant</th>
                <th className="py-3 px-3">Package</th>
                <th className="py-3 px-3 text-right">Credits Issued</th>
                <th className="py-3 px-3 text-right">Amount (BDT)</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#94A3B8]">
                    No matching transactions found.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((t) => (
                  <tr key={t.id} className="hover:bg-[#F8FAFC]">
                    <td className="py-3 px-3">
                      <div className="font-mono font-bold text-[#0F172A] text-[11px]">{t.providerTxnId}</div>
                      <div className="text-[10px] text-[#64748B] uppercase font-semibold">{t.provider}</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-[#0F172A]">{t.user.name || "Merchant"}</div>
                      <div className="text-[11px] text-[#64748B] font-mono">{t.user.email}</div>
                    </td>
                    <td className="py-3 px-3 capitalize font-semibold text-[#334155]">{t.package}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-[#7E22CE]">
                      +{t.creditsGranted.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-[#0F172A]">
                      ৳{t.amount.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="inline-flex rounded-md bg-[#E8F5EF] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#087F5B]">
                        {t.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right text-[#64748B] text-[11px] whitespace-nowrap">
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

      {/* Confirmation Modal for Multiplier Change */}
      {showMultiplierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setShowMultiplierModal(false)} />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-2xl animate-dropdown text-left space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E8F5EF] text-[#087F5B]">
              <IconSliders size={24} />
            </div>

            <div>
              <h3 className="text-base font-bold text-[#0F172A]">Change AI Pricing Multiplier?</h3>
              <p className="mt-1 text-xs text-[#64748B] leading-relaxed">
                This will update the customer billing multiplier for all future AI interactions. Historical logs and transactions will remain untouched.
              </p>
            </div>

            <div className="rounded-xl border border-[#E2E8F0] bg-[#FAFBFB] p-3.5 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#64748B]">Current Multiplier:</span>
                <span className="font-mono font-bold text-[#334155]">{overview.currentMultiplier}×</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">New Multiplier:</span>
                <span className="font-mono font-bold text-[#087F5B] text-sm">{newMultiplier}×</span>
              </div>
              <div className="flex justify-between border-t border-[#E2E8F0] pt-1.5">
                <span className="text-[#64748B]">Simulated ৳100 AI Cost:</span>
                <span className="font-mono font-bold text-[#0F172A]">৳{curCharge} → ৳{newCharge}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1">
                Audit Reason / Note (Optional)
              </label>
              <input
                type="text"
                value={multiplierReason}
                onChange={(e) => setMultiplierReason(e.target.value)}
                placeholder="e.g. Lowered multiplier for promotional season"
                className="w-full rounded-xl border border-[#D9E2E8] bg-white px-3.5 py-2 text-xs text-[#0F172A] focus:border-[#087F5B] focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowMultiplierModal(false)}
                className="rounded-xl border border-[#D9E2E8] bg-white px-4 py-2 text-xs font-semibold text-[#334155] hover:bg-[#F8FAFC]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={multiplierBusy}
                onClick={handleApplyMultiplier}
                className="rounded-xl bg-[#087F5B] px-4 py-2 text-xs font-bold text-white hover:bg-[#066B4D] shadow-xs"
              >
                {multiplierBusy ? "Applying…" : "Confirm Change"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Offline Payment Modal */}
      {showGrantModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setShowGrantModal(false)} />
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
              <button type="button" onClick={() => setShowGrantModal(false)} className="text-[#64748B] hover:text-[#0F172A]">
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
                <label className="block text-xs font-semibold text-[#334155] mb-1">Select Merchant</label>
                <select
                  required
                  value={grantUserId}
                  onChange={(e) => setGrantUserId(e.target.value)}
                  className="w-full rounded-xl border border-[#D9E2E8] bg-white px-3.5 py-2 text-xs text-[#0F172A] focus:border-[#087F5B] focus:outline-none"
                >
                  <option value="">Select a merchant account…</option>
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
                    placeholder="e.g. 50000"
                    className="w-full rounded-xl border border-[#D9E2E8] bg-white px-3.5 py-2 text-xs text-[#0F172A] focus:border-[#087F5B] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1">Package</label>
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
                  <label className="block text-xs font-semibold text-[#334155] mb-1">Txn ID / Note</label>
                  <input
                    type="text"
                    value={grantTxnId}
                    onChange={(e) => setGrantTxnId(e.target.value)}
                    placeholder="Bank reference"
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
