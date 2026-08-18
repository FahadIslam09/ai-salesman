"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { PageProvider, usePage } from "@/components/PageProvider";
import { Spinner } from "@/lib/ui";
import { CustomDropdown } from "@/components/CustomDropdown";
import {
  IconGrid,
  IconInbox,
  IconUsers,
  IconShoppingBag,
  IconTrendingUp,
  IconPackage,
  IconClock,
  IconSparkles,
  IconActivity,
  IconBarChart,
  IconStore,
  IconLayers,
  IconBell,
  IconCoins,
  IconSettings,
  IconLogOut,
  IconMenu,
  IconX,
  IconCalendar,
  IconZap,
  IconChevronDown,
} from "@/components/Icons";

interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  image?: string | null;
}

interface UserContextValue {
  user: UserProfile | null;
}

const UserContext = createContext<UserContextValue>({ user: null });

export function useUser() {
  return useContext(UserContext);
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

const NAV: NavGroup[] = [
  {
    section: "MAIN",
    items: [
      { href: "/overview", label: "Overview", icon: IconGrid },
      { href: "/inbox", label: "Inbox", icon: IconInbox },
      { href: "/customers", label: "Customers", icon: IconUsers },
      { href: "/products", label: "Products", icon: IconShoppingBag },
      { href: "/sales", label: "Sales", icon: IconTrendingUp },
      { href: "/orders", label: "Orders", icon: IconPackage },
      { href: "/follow-ups", label: "Follow-ups", icon: IconClock },
    ],
  },
  {
    section: "AI",
    items: [
      { href: "/knowledge", label: "AI Knowledge", icon: IconSparkles },
      { href: "/activity", label: "AI Activity", icon: IconActivity },
    ],
  },
  {
    section: "INSIGHTS",
    items: [{ href: "/analytics", label: "Analytics", icon: IconBarChart }],
  },
  {
    section: "BUSINESS",
    items: [
      { href: "/business-info", label: "Business Info", icon: IconStore },
      { href: "/accounts", label: "Connected Pages", icon: IconLayers },
      { href: "/notifications", label: "Notifications", icon: IconBell },
    ],
  },
  {
    section: "ACCOUNT",
    items: [
      { href: "/credits", label: "Credits", icon: IconCoins },
      { href: "/settings", label: "Settings", icon: IconSettings },
    ],
  },
];

const ALL_NAV_ITEMS = NAV.flatMap((g) => g.items);

function SidebarContent({
  pathname,
  credits,
  user,
  onNavClick,
}: {
  pathname: string;
  credits: number | null;
  user: UserProfile | null;
  onNavClick?: () => void;
}) {
  return (
    <div className="flex h-full flex-col justify-between">
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Logo area */}
        <div className="flex items-center justify-between border-b border-[#E2E8F0] px-5 py-4">
          <Link href="/overview" className="flex items-center gap-3.5">
            <img
              src="/bot-icon.png"
              alt="AI Sales Bot"
              width={44}
              height={44}
              className="h-11 w-11 shrink-0 object-contain"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[15px] font-bold tracking-tight text-[#0F172A]">
                  AI Sales Bot
                </span>
                <span className="rounded-md bg-[#E8F5EF] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#087F5B]">
                  Pro
                </span>
              </div>
              <p className="text-[11px] font-medium text-[#64748B]">E-commerce copilot</p>
            </div>
          </Link>
        </div>

        {/* Navigation groups with custom smooth scrollbar */}
        <nav className="dropdown-scrollbar flex-1 space-y-4.5 overflow-y-auto px-3.5 py-4">
          {NAV.map((group) => (
            <div key={group.section}>
              <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                {group.section}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const active =
                    pathname === item.href ||
                    (item.href !== "/overview" && pathname.startsWith(item.href));
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onNavClick}
                      className={`group relative flex h-9.5 items-center gap-2.5 rounded-xl px-3 text-sm font-medium transition-all duration-150 ${
                        active
                          ? "bg-[#E8F5EF] font-semibold text-[#087F5B] shadow-[0_1px_2px_rgba(8,127,91,0.06)]"
                          : "text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                      }`}
                    >
                      {/* Active indicator bar */}
                      {active && (
                        <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-[#087F5B]" />
                      )}
                      <Icon
                        size={18}
                        className={`shrink-0 transition-colors duration-150 ${
                          active
                            ? "text-[#087F5B]"
                            : "text-[#94A3B8] group-hover:text-[#0F172A]"
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Bottom Area */}
      <div className="border-t border-[#E2E8F0] p-3.5">
        {/* Credits Card */}
        <Link
          href="/credits"
          onClick={onNavClick}
          className="group relative mb-3 block overflow-hidden rounded-2xl border border-[#A7F3D0]/80 bg-gradient-to-br from-[#F0FDF4] via-[#F0FDF4] to-[#ECFDF5] p-3.5 shadow-[0_2px_10px_rgba(8,127,91,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#6EE7B7] hover:shadow-[0_4px_16px_rgba(8,127,91,0.12)]"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#065F46]">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[#087F5B] text-white shadow-2xs">
                <IconZap size={11} />
              </span>
              <span>AI Credits</span>
            </div>
            <span className="inline-flex items-center gap-0.5 rounded-full bg-[#087F5B]/10 px-2 py-0.5 text-[10px] font-bold text-[#087F5B] transition-colors group-hover:bg-[#087F5B] group-hover:text-white">
              Recharge
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <p className="font-display text-xl font-bold tracking-tight text-[#0F172A]">
              {credits !== null ? credits.toLocaleString("en-IN") : "—"}
            </p>
            <span className="text-[10px] font-medium text-[#059669]">Available balance</span>
          </div>
        </Link>

        {/* User Profile Footer */}
        <div className="flex items-center justify-between rounded-2xl border border-[#E2E8F0] bg-[#FAFBFB] p-2 shadow-[0_1px_2px_rgba(16,24,40,0.03)] transition-all hover:border-[#CBD5E1]">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="relative shrink-0">
              <div className="flex h-8.5 w-8.5 items-center justify-center rounded-xl bg-gradient-to-tr from-[#087F5B] to-[#10B981] text-xs font-bold text-white shadow-xs">
                {(user?.name || user?.email || "U")[0]?.toUpperCase()}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 block h-2.5 w-2.5 rounded-full border-2 border-white bg-[#10B981]" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-[#0F172A]">{user?.name || "Admin"}</p>
              <p className="truncate text-[11px] font-medium text-[#64748B]">
                {user?.email || "admin@store.com"}
              </p>
            </div>
          </div>
          <button
            type="button"
            title="Log out"
            aria-label="Log out"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[#94A3B8] transition-all hover:bg-[#FEE2E2] hover:text-[#DC2626]"
            onClick={async () => {
              await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/sign-out`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
              });
              window.location.href = "/login";
            }}
          >
            <IconLogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

function Shell({ children, user }: { children: ReactNode; user: UserProfile | null }) {
  const pathname = usePathname();
  const { pages, pageId, setPageId } = usePage();
  const [credits, setCredits] = useState<number | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    api<{ credits: number }>("/api/credits/balance")
      .then((b) => setCredits(b.credits))
      .catch(() => {});
  }, [pathname]);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const activePageMeta = ALL_NAV_ITEMS.find(
    (n) => pathname === n.href || (n.href !== "/overview" && pathname.startsWith(n.href))
  );

  const userName = user?.name ? user.name.split(" ")[0] : "Admin";

  // Formatted date string for calendar selector
  const formattedDateRange = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="flex min-h-screen bg-[#F8FAF9] overflow-x-hidden">
      {/* Desktop Sidebar (260px) - Fixed on Desktop (>= 1280px / xl) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[260px] flex-col border-r border-[#E2E8F0] bg-white xl:flex">
        <SidebarContent pathname={pathname} credits={credits} user={user} />
      </aside>

      {/* Responsive Navigation Drawer (Tablet & Mobile < 1280px) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex xl:hidden animate-in fade-in duration-200">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-ink/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          {/* Slide-over Drawer Panel */}
          <div className="relative flex w-[285px] max-w-[85vw] flex-1 flex-col bg-white shadow-2xl animate-in slide-in-from-left duration-250">
            <div className="absolute top-3.5 right-3 z-10">
              <button
                type="button"
                aria-label="Close sidebar"
                onClick={() => setMobileOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-mute hover:bg-paper hover:text-ink transition-colors"
              >
                <IconX size={20} />
              </button>
            </div>
            <SidebarContent
              pathname={pathname}
              credits={credits}
              user={user}
              onNavClick={() => setMobileOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col xl:ml-[260px] min-w-0">
        {/* Sticky Top Header (64px mobile / 72px desktop) */}
        <header className="sticky top-0 z-20 flex h-16 sm:h-[72px] items-center justify-between border-b border-[#E2E8F0] bg-white/95 px-3.5 sm:px-6 lg:px-8 backdrop-blur-md">
          {/* Header Left: Hamburger Menu + Active Title */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <button
              type="button"
              aria-label="Open navigation menu"
              onClick={() => setMobileOpen(true)}
              className="flex h-9.5 w-9.5 items-center justify-center rounded-xl border border-line text-ink xl:hidden hover:bg-paper active:bg-[#F1F5F4] transition-colors"
            >
              <IconMenu size={19} />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-lg sm:text-xl font-bold tracking-tight text-ink">
                {activePageMeta?.label ?? "Dashboard"}
              </h1>
              {pathname === "/overview" && (
                <p className="hidden text-xs text-mute md:block truncate">
                  Welcome back, <span className="font-medium text-ink">{userName}</span>! Here&apos;s what&apos;s happening with your business.
                </p>
              )}
            </div>
          </div>

          {/* Header Right: Page Selector, Date, Notifications, Profile */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* Facebook Page Selector */}
            {pages.length > 0 && (
              <CustomDropdown
                items={pages.map((p) => ({
                  id: p.id,
                  label: p.name,
                  sublabel: "Connected Page",
                  badge: p.id === pageId ? "Active" : undefined,
                  badgeTone: "green",
                  icon: (
                    <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[#EAF7F2] text-[11px] font-bold text-leaf">
                      {p.name.charAt(0).toUpperCase()}
                    </span>
                  ),
                }))}
                value={pageId ?? undefined}
                onChange={(id) => setPageId(id)}
                sizeVariant="sm"
                align="right"
                renderTrigger={(selected) => (
                  <button
                    type="button"
                    className="flex h-9 cursor-pointer items-center gap-1.5 sm:gap-2 rounded-xl border border-[#DCE3E8] bg-white px-2.5 sm:px-3 text-xs font-semibold text-[#172033] shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-all duration-150 hover:border-[#CBD5E1] hover:bg-[#FAFBFB] focus:border-leaf focus:ring-2 focus:ring-leaf/15 focus:outline-none"
                  >
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-leaf opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-leaf" />
                    </span>
                    <span className="max-w-[85px] xs:max-w-[120px] sm:max-w-[180px] truncate font-semibold text-[#172033]">
                      {selected?.label ?? "Select Page"}
                    </span>
                    <IconChevronDown size={13} className="text-[#94A3B8] shrink-0" />
                  </button>
                )}
                renderFooter={(close) => (
                  <div className="flex items-center justify-between px-2 py-1 text-[11px] text-mute">
                    <span>
                      {pages.length} Connected {pages.length === 1 ? "Page" : "Pages"}
                    </span>
                    <Link
                      href="/settings"
                      onClick={close}
                      className="font-medium text-leaf hover:underline"
                    >
                      Manage
                    </Link>
                  </div>
                )}
              />
            )}

            {/* Date Range Selector (Hidden on Mobile) */}
            <button
              type="button"
              className="hidden h-9 items-center gap-2 rounded-xl border border-line bg-surface px-3 text-xs font-medium text-ink shadow-2xs transition-colors md:flex hover:bg-paper"
            >
              <IconCalendar size={14} className="text-mute" />
              <span>{formattedDateRange}</span>
            </button>

            {/* Notification Bell */}
            <Link
              href="/notifications"
              className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-surface text-mute shadow-2xs transition-colors hover:bg-paper hover:text-ink"
              title="Notifications"
            >
              <IconBell size={16} />
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-leaf ring-2 ring-surface" />
            </Link>

            {/* User Profile Avatar Pill */}
            <div className="flex items-center gap-2 rounded-xl border border-line bg-surface py-1 pr-1.5 sm:pr-2.5 pl-1 shadow-2xs">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-leaf-soft text-xs font-bold text-leaf">
                {(user?.name || user?.email || "U")[0]?.toUpperCase()}
              </div>
              <div className="hidden text-left lg:block">
                <p className="text-xs font-bold leading-tight text-ink">{userName}</p>
                <p className="text-[10px] text-mute">Admin</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page Main Content Container */}
        <main className="flex-1 p-3.5 sm:p-5 lg:p-8 min-w-0">
          <div className="mx-auto max-w-[1440px] w-full min-w-0">{children}</div>
        </main>
      </div>
    </div>
  );
}

function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    api<{ user?: UserProfile; session?: any }>("/api/auth/get-session")
      .then((data) => {
        if (data.user) {
          setUser(data.user);
        }
        setReady(true);
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  if (!ready) return <Spinner className="h-screen" />;

  return (
    <UserContext.Provider value={{ user }}>
      <PageProvider>
        <Shell user={user}>{children}</Shell>
      </PageProvider>
    </UserContext.Provider>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  return <AuthGate>{children}</AuthGate>;
}
