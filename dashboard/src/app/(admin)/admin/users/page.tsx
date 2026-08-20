"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, Spinner, Button, EmptyState } from "@/lib/ui";
import {
  IconUsers,
  IconSearch,
  IconCoins,
  IconCrown,
  IconCheck,
  IconX,
  IconShield,
  IconLayers,
  IconAlertTriangle,
} from "@/components/Icons";

interface UserItem {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: "user" | "admin" | "super_admin";
  isBanned: boolean;
  createdAt: string;
  pagesCount: number;
  pages: Array<{ id: string; name: string; fbPageId: string; isActive: boolean }>;
  credits: number;
  totalPurchased: number;
  totalUsed: number;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Credit Adjustment Modal State
  const [adjustModalUser, setAdjustModalUser] = useState<UserItem | null>(null);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustBusy, setAdjustBusy] = useState(false);
  const [adjustError, setAdjustError] = useState("");

  // Confirmation Modal State (Role or Ban)
  const [confirmActionUser, setConfirmActionUser] = useState<{
    user: UserItem;
    type: "ban" | "unban" | "role";
    newRole?: "user" | "admin" | "super_admin";
  } | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  function loadUsers() {
    setLoading(true);
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());
    if (roleFilter !== "all") params.set("role", roleFilter);
    if (statusFilter !== "all") params.set("status", statusFilter);

    api<UserItem[]>(`/api/admin/users?${params.toString()}`)
      .then(setUsers)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadUsers();
  }, [roleFilter, statusFilter]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    loadUsers();
  }

  async function handleAdjustCredits(e: React.FormEvent) {
    e.preventDefault();
    if (!adjustModalUser || !adjustAmount || !adjustReason.trim()) return;

    setAdjustBusy(true);
    setAdjustError("");
    try {
      await api(`/api/admin/users/${adjustModalUser.id}/credits`, {
        method: "POST",
        body: JSON.stringify({
          amount: Number(adjustAmount),
          reason: adjustReason.trim(),
        }),
      });
      setAdjustModalUser(null);
      setAdjustAmount("");
      setAdjustReason("");
      loadUsers();
    } catch (err: any) {
      setAdjustError(err.message || "Failed to adjust credits.");
    } finally {
      setAdjustBusy(false);
    }
  }

  async function executeConfirmAction() {
    if (!confirmActionUser) return;
    setActionBusy(true);
    try {
      if (confirmActionUser.type === "ban" || confirmActionUser.type === "unban") {
        await api(`/api/admin/users/${confirmActionUser.user.id}/status`, {
          method: "PATCH",
          body: JSON.stringify({ isBanned: confirmActionUser.type === "ban" }),
        });
      } else if (confirmActionUser.type === "role" && confirmActionUser.newRole) {
        await api(`/api/admin/users/${confirmActionUser.user.id}/role`, {
          method: "PATCH",
          body: JSON.stringify({ role: confirmActionUser.newRole }),
        });
      }
      setConfirmActionUser(null);
      loadUsers();
    } catch (err: any) {
      alert(`Error updating user: ${err.message}`);
    } finally {
      setActionBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#0F172A] tracking-tight">
            User & Tenant Management
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Manage registered accounts, adjust AI credits, assign administrative roles, and control access.
          </p>
        </div>

        <div className="text-xs font-semibold text-[#64748B]">
          Total Users: <span className="text-[#087F5B] font-bold">{users.length}</span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <IconSearch
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or user ID…"
              className="w-full rounded-xl border border-[#D9E2E8] bg-[#FAFBFB] py-2 pl-10 pr-4 text-xs text-[#0F172A] placeholder-[#94A3B8] focus:border-[#087F5B] focus:bg-white focus:outline-none"
            />
          </form>

          <div className="flex items-center gap-2">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="rounded-xl border border-[#D9E2E8] bg-white px-3 py-2 text-xs font-semibold text-[#334155] focus:border-[#087F5B] focus:outline-none"
            >
              <option value="all">All Roles</option>
              <option value="user">User</option>
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-[#D9E2E8] bg-white px-3 py-2 text-xs font-semibold text-[#334155] focus:border-[#087F5B] focus:outline-none"
            >
              <option value="all">All Status</option>
              <option value="active">Active Accounts</option>
              <option value="banned">Suspended Accounts</option>
            </select>

            <button
              type="button"
              onClick={loadUsers}
              className="rounded-xl bg-[#087F5B] px-4 py-2 text-xs font-bold text-white hover:bg-[#066B4D] shadow-xs"
            >
              Search
            </button>
          </div>
        </div>
      </Card>

      {/* Users Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Spinner />
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#64748B]">
            No users matched your search criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#FAFBFB] text-[#64748B] uppercase text-[10px] tracking-wider font-bold">
                  <th className="py-3.5 px-4">User</th>
                  <th className="py-3.5 px-4">Role & Status</th>
                  <th className="py-3.5 px-4">Connected Stores</th>
                  <th className="py-3.5 px-4 text-right">Credit Balance</th>
                  <th className="py-3.5 px-4 text-right">Purchased / Used</th>
                  <th className="py-3.5 px-4 text-right">Joined</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-[#F8FAFC] transition-colors">
                    {/* User Info */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E8F5EF] text-xs font-bold text-[#087F5B]">
                          {(u.name || u.email)[0]?.toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-[#0F172A] truncate max-w-[180px]">
                            {u.name || "Unnamed User"}
                          </div>
                          <div className="text-[11px] text-[#64748B] font-mono truncate max-w-[180px]">
                            {u.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Role & Status */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-1">
                        <div>
                          {u.role === "super_admin" && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-[#FAF5FF] px-2 py-0.5 text-[10px] font-bold text-[#7E22CE] border border-[#E9D5FF]">
                              <IconCrown size={11} />
                              Super Admin
                            </span>
                          )}
                          {u.role === "admin" && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-[#EFF6FF] px-2 py-0.5 text-[10px] font-bold text-[#1D4ED8] border border-[#DBEAFE]">
                              Admin
                            </span>
                          )}
                          {u.role === "user" && (
                            <span className="inline-flex items-center rounded-md bg-[#F1F5F9] px-2 py-0.5 text-[10px] font-semibold text-[#475569]">
                              Tenant
                            </span>
                          )}
                        </div>
                        <div>
                          {u.isBanned ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#DC2626]">
                              <span className="h-1.5 w-1.5 rounded-full bg-[#DC2626]" />
                              Suspended
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#10B981]">
                              <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                              Active
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Connected Stores */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <IconLayers size={14} className="text-[#64748B]" />
                        <span className="font-bold text-[#0F172A]">{u.pagesCount}</span>
                        <span className="text-[#64748B]">store(s)</span>
                      </div>
                      {u.pages.length > 0 && (
                        <div className="text-[11px] text-[#64748B] truncate max-w-[160px]">
                          {u.pages.map((p) => p.name).join(", ")}
                        </div>
                      )}
                    </td>

                    {/* Credit Balance */}
                    <td className="py-3.5 px-4 text-right font-mono">
                      <div className="text-sm font-bold text-[#087F5B]">
                        {u.credits.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-[#64748B]">available</div>
                    </td>

                    {/* Total Purchased / Used */}
                    <td className="py-3.5 px-4 text-right font-mono text-[11px] text-[#334155]">
                      <div>
                        Purchased: <span className="text-[#7E22CE] font-bold">{u.totalPurchased.toLocaleString()}</span>
                      </div>
                      <div>
                        Used: <span className="text-[#D97706]">{u.totalUsed.toLocaleString()}</span>
                      </div>
                    </td>

                    {/* Joined Date */}
                    <td className="py-3.5 px-4 text-right text-[#64748B] whitespace-nowrap text-[11px]">
                      {new Date(u.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setAdjustModalUser(u);
                            setAdjustAmount("");
                            setAdjustReason("");
                            setAdjustError("");
                          }}
                          className="rounded-lg border border-[#D9E2E8] bg-white px-2.5 py-1 text-[11px] font-bold text-[#087F5B] hover:bg-[#E8F5EF] transition-colors"
                        >
                          + Credits
                        </button>

                        <select
                          value={u.role}
                          onChange={(e) =>
                            setConfirmActionUser({
                              user: u,
                              type: "role",
                              newRole: e.target.value as any,
                            })
                          }
                          className="rounded-lg border border-[#D9E2E8] bg-white px-2 py-1 text-[11px] font-medium text-[#334155] hover:bg-[#F8FAFC]"
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                          <option value="super_admin">Super Admin</option>
                        </select>

                        <button
                          type="button"
                          onClick={() =>
                            setConfirmActionUser({
                              user: u,
                              type: u.isBanned ? "unban" : "ban",
                            })
                          }
                          className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors ${
                            u.isBanned
                              ? "bg-[#E8F5EF] text-[#087F5B] hover:bg-[#d5eee2]"
                              : "bg-[#FEE2E2] text-[#DC2626] hover:bg-[#fcd0d0]"
                          }`}
                        >
                          {u.isBanned ? "Activate" : "Suspend"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Credit Adjustment Modal */}
      {adjustModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            onClick={() => setAdjustModalUser(null)}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-2xl animate-dropdown text-left">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E8F5EF] text-[#087F5B]">
                  <IconCoins size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0F172A]">Adjust User Credits</h3>
                  <p className="text-xs text-[#64748B]">{adjustModalUser.name || adjustModalUser.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAdjustModalUser(null)}
                className="text-[#64748B] hover:text-[#0F172A]"
              >
                <IconX size={18} />
              </button>
            </div>

            <div className="mt-4 rounded-xl bg-[#FAFBFB] p-3 border border-[#E2E8F0] flex justify-between items-center text-xs">
              <span className="text-[#64748B]">Current Balance:</span>
              <span className="font-mono font-bold text-[#087F5B] text-sm">
                {adjustModalUser.credits.toLocaleString()} credits
              </span>
            </div>

            {adjustError && (
              <div className="mt-3 rounded-xl border border-danger/30 bg-danger-soft p-3 text-xs text-danger font-medium">
                {adjustError}
              </div>
            )}

            <form onSubmit={handleAdjustCredits} className="mt-4 space-y-3.5">
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
                  onClick={() => setAdjustModalUser(null)}
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

      {/* Confirmation Modal for Role or Ban */}
      {confirmActionUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            onClick={() => setConfirmActionUser(null)}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-2xl animate-dropdown text-left">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FEF3C7] text-[#D97706]">
              <IconAlertTriangle size={24} />
            </div>

            <h3 className="mt-4 text-base font-bold text-[#0F172A]">
              {confirmActionUser.type === "ban" && `Suspend User Account?`}
              {confirmActionUser.type === "unban" && `Activate User Account?`}
              {confirmActionUser.type === "role" && `Change User Role to '${confirmActionUser.newRole}'?`}
            </h3>

            <p className="mt-1.5 text-xs text-[#64748B] leading-relaxed">
              {confirmActionUser.type === "ban" &&
                `Are you sure you want to suspend account "${confirmActionUser.user.email}"? They will immediately be locked out of the platform.`}
              {confirmActionUser.type === "unban" &&
                `Are you sure you want to reactivate account "${confirmActionUser.user.email}"? They will regain access to their store and AI bot.`}
              {confirmActionUser.type === "role" &&
                `Are you sure you want to change permissions for "${confirmActionUser.user.email}" to "${confirmActionUser.newRole}"?`}
            </p>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmActionUser(null)}
                className="rounded-xl border border-[#D9E2E8] bg-white px-4 py-2 text-xs font-semibold text-[#334155] hover:bg-[#F8FAFC]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionBusy}
                onClick={executeConfirmAction}
                className={`rounded-xl px-4 py-2 text-xs font-bold text-white shadow-xs ${
                  confirmActionUser.type === "ban"
                    ? "bg-[#DC2626] hover:bg-[#B91C1C]"
                    : "bg-[#087F5B] hover:bg-[#066B4D]"
                }`}
              >
                {actionBusy ? "Updating…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
