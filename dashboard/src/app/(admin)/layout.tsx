"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { Spinner } from "@/lib/ui";
import {
  IconCrown,
  IconGrid,
  IconUsers,
  IconLayers,
  IconSparkles,
  IconCoins,
  IconSettings,
  IconStore,
  IconLogOut,
  IconShield,
  IconMenu,
  IconX,
  IconActivity,
  IconServer,
  IconSearch,
  IconChevronRight,
  IconTrendingUp,
} from "@/components/Icons";

interface SuperAdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  image?: string | null;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

interface NavGroup {
  section: string;
  items: NavItem[];
}

const ADMIN_NAV_GROUPS: NavGroup[] = [
  {
    section: "OVERVIEW",
    items: [{ href: "/admin", label: "Dashboard", icon: IconGrid }],
  },
  {
    section: "PLATFORM",
    items: [
      { href: "/admin/users", label: "Users Directory", icon: IconUsers },
      { href: "/admin/businesses", label: "Businesses / Tenants", icon: IconStore },
      { href: "/admin/credits", label: "Credits Management", icon: IconCoins },
      { href: "/admin/finance", label: "Revenue & Profit", icon: IconTrendingUp },
    ],
  },
  {
    section: "AI & USAGE",
    items: [
      { href: "/admin/ai-usage", label: "AI Usage & Arbitrage", icon: IconSparkles },
    ],
  },
  {
    section: "MONITORING",
    items: [
      { href: "/admin/system-health", label: "System Health", icon: IconServer },
      { href: "/admin/audit-logs", label: "Audit Logs", icon: IconShield },
    ],
  },
  {
    section: "INTEGRATIONS",
    items: [
      { href: "/admin/pages", label: "Connected Pages", icon: IconLayers },
    ],
  },
  {
    section: "SETTINGS",
    items: [
      { href: "/admin/settings", label: "Platform Settings", icon: IconSettings },
    ],
  },
];

const ALL_ADMIN_ITEMS = ADMIN_NAV_GROUPS.flatMap((g) => g.items);

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [adminUser, setAdminUser] = useState<SuperAdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    api<SuperAdminUser>("/api/admin/me")
      .then((user) => {
        setAdminUser(user);
        setLoading(false);
      })
      .catch(() => {
        // Not a super admin -> redirect to main store overview
        router.replace("/overview");
      });
  }, [router]);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  if (loading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-3 bg-[#F8FAF9] text-[#0F172A]">
        <Spinner />
        <p className="text-xs font-semibold tracking-wider uppercase text-[#087F5B]">
          Verifying Super Admin Authorization…
        </p>
      </div>
    );
  }

  const activeMeta = ALL_ADMIN_ITEMS.find(
    (item) => pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href))
  );

  return (
    <div className="flex min-h-screen bg-[#F8FAF9] text-[#0F172A] antialiased">
      {/* Desktop Sidebar (Fixed Left 260px) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[260px] flex-col border-r border-[#E2E8F0] bg-white xl:flex">
        <div className="flex h-full flex-col justify-between">
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Super Admin Brand Header */}
            <div className="flex items-center justify-between border-b border-[#E2E8F0] px-5 py-4">
              <Link href="/admin" className="flex items-center gap-3 group">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#087F5B] text-white shadow-sm transition-transform group-hover:scale-105">
                  <IconCrown size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[15px] font-bold tracking-tight text-[#0F172A]">
                      Super Admin
                    </span>
                    <span className="rounded-md bg-[#E8F5EF] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#087F5B]">
                      Root
                    </span>
                  </div>
                  <p className="text-[11px] font-medium text-[#64748B]">SaaS Control Center</p>
                </div>
              </Link>
            </div>

            {/* Navigation Groups */}
            <nav className="dropdown-scrollbar flex-1 space-y-4 overflow-y-auto px-3.5 py-4">
              {ADMIN_NAV_GROUPS.map((group) => (
                <div key={group.section}>
                  <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                    {group.section}
                  </p>
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const active =
                        pathname === item.href ||
                        (item.href !== "/admin" && pathname.startsWith(item.href));
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`group relative flex h-9.5 items-center gap-2.5 rounded-xl px-3 text-xs font-semibold transition-all ${
                            active
                              ? "bg-[#E8F5EF] text-[#087F5B] shadow-2xs font-bold"
                              : "text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                          }`}
                        >
                          {active && (
                            <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-[#087F5B]" />
                          )}
                          <Icon
                            size={16}
                            className={active ? "text-[#087F5B]" : "text-[#64748B] group-hover:text-[#0F172A]"}
                          />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </div>

          {/* Sidebar Footer: Return to User Store & Profile */}
          <div className="border-t border-[#E2E8F0] p-3.5 space-y-2">
            <Link
              href="/overview"
              className="flex items-center justify-between rounded-xl border border-[#D9E2E8] bg-[#FAFBFB] px-3 py-2 text-xs font-semibold text-[#334155] shadow-2xs hover:bg-[#F1F5F9] hover:text-[#0F172A] transition-all"
            >
              <div className="flex items-center gap-2">
                <IconStore size={15} className="text-[#64748B]" />
                <span>Exit to Store Dashboard</span>
              </div>
              <IconChevronRight size={14} className="text-[#94A3B8]" />
            </Link>

            <div className="flex items-center justify-between rounded-xl border border-[#E2E8F0] bg-white p-2">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#087F5B] text-xs font-bold text-white">
                  {adminUser?.name ? adminUser.name[0]?.toUpperCase() : "A"}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-[#0F172A]">{adminUser?.name || "Super Admin"}</p>
                  <p className="truncate text-[10px] text-[#087F5B] font-semibold">Super Administrator</p>
                </div>
              </div>
              <button
                type="button"
                title="Log out"
                onClick={async () => {
                  await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/sign-out`, {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                  });
                  window.location.href = "/login";
                }}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-[#94A3B8] hover:bg-[#FEE2E2] hover:text-[#DC2626] transition-colors"
              >
                <IconLogOut size={14} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Wrapper */}
      <div className="flex flex-1 flex-col xl:pl-[260px] min-w-0">
        {/* Super Admin Top Header */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[#E2E8F0] bg-white/95 px-4 sm:px-6 lg:px-8 backdrop-blur-md">
          {/* Left: Mobile Menu & Current Title / Breadcrumb */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="xl:hidden flex h-9 w-9 items-center justify-center rounded-xl border border-[#E2E8F0] bg-[#FAFBFB] text-[#475569] hover:bg-[#F1F5F9]"
            >
              <IconMenu size={18} />
            </button>

            <div>
              <div className="flex items-center gap-2 text-[11px] font-medium text-[#64748B]">
                <Link href="/admin" className="hover:text-[#087F5B]">
                  Super Admin
                </Link>
                <span>/</span>
                <span className="text-[#0F172A] font-semibold">{activeMeta?.label || "Command Center"}</span>
              </div>
              <h1 className="text-base font-bold text-[#0F172A] tracking-tight leading-none mt-0.5">
                {activeMeta?.label || "Dashboard"}
              </h1>
            </div>
          </div>

          {/* Right Header: Quick Exit & Role Badge */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-[#087F5B]/20 bg-[#E8F5EF] px-3 py-1 text-xs font-bold text-[#087F5B]">
              <span className="h-2 w-2 rounded-full bg-[#10B981] animate-pulse" />
              <span>Platform Live</span>
            </div>

            <Link
              href="/overview"
              className="hidden md:flex items-center gap-1.5 rounded-xl border border-[#D9E2E8] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#172033] shadow-2xs hover:bg-[#F8FAFC] transition-colors"
            >
              <IconStore size={14} className="text-[#64748B]" />
              <span>Exit to Store</span>
            </Link>
          </div>
        </header>

        {/* Page Main Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
          <div className="mx-auto max-w-[1440px] w-full min-w-0">{children}</div>
        </main>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 xl:hidden">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative flex h-full w-72 max-w-[80vw] flex-col bg-white shadow-2xl animate-drawerSlide">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] p-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#087F5B] text-white">
                  <IconCrown size={16} />
                </div>
                <span className="text-sm font-bold text-[#0F172A]">Super Admin</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#64748B] hover:bg-[#F1F5F9]"
              >
                <IconX size={18} />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto p-3 space-y-4">
              {ADMIN_NAV_GROUPS.map((group) => (
                <div key={group.section}>
                  <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                    {group.section}
                  </p>
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const active =
                        pathname === item.href ||
                        (item.href !== "/admin" && pathname.startsWith(item.href));
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                            active
                              ? "bg-[#E8F5EF] text-[#087F5B] font-bold"
                              : "text-[#475569] hover:bg-[#F8FAFC]"
                          }`}
                        >
                          <Icon size={16} className={active ? "text-[#087F5B]" : "text-[#64748B]"} />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>

            <div className="border-t border-[#E2E8F0] p-3">
              <Link
                href="/overview"
                onClick={() => setMobileMenuOpen(false)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#087F5B] py-2 text-xs font-bold text-white shadow-xs"
              >
                <IconStore size={15} />
                <span>Exit to Store Dashboard</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
