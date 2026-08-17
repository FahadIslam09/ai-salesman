"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { PageProvider, usePage } from "@/components/PageProvider";
import { Spinner } from "@/lib/ui";
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
      <div>
        {/* Logo area */}
        <div className="flex items-center gap-3 border-b border-line px-5 py-4.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-leaf text-white shadow-xs">
            <IconSparkles size={20} />
          </div>
          <div>
            <p className="text-[15px] font-bold tracking-tight text-ink">AI Sales Bot</p>
            <p className="text-[11px] font-medium text-mute">E-commerce copilot</p>
          </div>
        </div>

        {/* Navigation groups */}
        <nav className="space-y-4 px-3 py-3.5">
          {NAV.map((group) => (
            <div key={group.section}>
              <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-wider text-mute">
                {group.section}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = pathname === item.href || (item.href !== "/overview" && pathname.startsWith(item.href));
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onNavClick}
                      className={`group flex h-9 items-center gap-2.5 rounded-lg px-3 text-sm font-medium transition-all ${
                        active
                          ? "bg-leaf-soft font-semibold text-leaf"
                          : "text-[#40514B] hover:bg-paper hover:text-ink"
                      }`}
                    >
                      <Icon
                        size={17}
                        className={`transition-colors ${
                          active ? "text-leaf" : "text-mute group-hover:text-ink"
                        }`}
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

      {/* Bottom Area */}
      <div className="border-t border-line p-3">
        {/* Credits Card */}
        <Link
          href="/credits"
          onClick={onNavClick}
          className="group mb-2.5 block rounded-xl border border-line bg-paper p-3 transition-all hover:border-[#D0D7D4] hover:bg-leaf-soft/40"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-ink">
              <IconZap size={14} className="text-leaf" />
              <span>AI Credits</span>
            </div>
            <span className="text-[11px] font-semibold text-leaf group-hover:underline">Recharge</span>
          </div>
          <p className="mt-1 text-lg font-bold text-ink">
            {credits !== null ? credits.toLocaleString("en-IN") : "—"}
          </p>
        </Link>

        {/* User / Logout Area */}
        <div className="flex items-center justify-between rounded-lg px-2 py-1.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-leaf-soft text-xs font-bold text-leaf">
              {(user?.name || user?.email || "U")[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-ink">{user?.name || "Admin"}</p>
              <p className="truncate text-[11px] text-mute">{user?.email || "admin@store.com"}</p>
            </div>
          </div>
          <button
            title="Log out"
            aria-label="Log out"
            className="flex h-7 w-7 items-center justify-center rounded-md text-mute transition-colors hover:bg-paper hover:text-danger"
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
    <div className="flex min-h-screen bg-paper">
      {/* Desktop Sidebar (248px) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-line bg-surface md:flex">
        <SidebarContent pathname={pathname} credits={credits} user={user} />
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-ink/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative flex w-[260px] max-w-[85vw] flex-1 flex-col bg-surface shadow-2xl">
            <div className="absolute top-3.5 right-3">
              <button
                type="button"
                aria-label="Close sidebar"
                onClick={() => setMobileOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-mute hover:bg-paper hover:text-ink"
              >
                <IconX size={18} />
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
      <div className="flex flex-1 flex-col md:ml-[248px]">
        {/* Sticky Top Header (72px) */}
        <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-line bg-surface/95 px-4 sm:px-6 lg:px-8 backdrop-blur-md">
          {/* Header Left */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Open navigation menu"
              onClick={() => setMobileOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-ink md:hidden hover:bg-paper"
            >
              <IconMenu size={18} />
            </button>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-ink">
                {activePageMeta?.label ?? "Dashboard"}
              </h1>
              {pathname === "/overview" && (
                <p className="hidden text-xs text-mute sm:block">
                  Welcome back, <span className="font-medium text-ink">{userName}</span>! Here&apos;s what&apos;s happening with your business.
                </p>
              )}
            </div>
          </div>

          {/* Header Right */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Facebook Page Selector */}
            {pages.length > 0 && (
              <div className="relative">
                <select
                  value={pageId ?? ""}
                  onChange={(e) => setPageId(e.target.value)}
                  className="h-9 cursor-pointer appearance-none rounded-lg border border-line bg-surface pr-8 pl-3 text-xs font-semibold text-ink shadow-2xs transition-colors hover:border-[#D0D7D4] focus:border-leaf focus:outline-none"
                >
                  {pages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-mute">
                  <IconChevronDown size={14} />
                </div>
              </div>
            )}

            {/* Date Range Selector */}
            <button
              type="button"
              className="hidden h-9 items-center gap-2 rounded-lg border border-line bg-surface px-3 text-xs font-medium text-ink shadow-2xs transition-colors sm:flex hover:bg-paper"
            >
              <IconCalendar size={14} className="text-mute" />
              <span>{formattedDateRange}</span>
            </button>

            {/* Notification Bell */}
            <Link
              href="/notifications"
              className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface text-mute shadow-2xs transition-colors hover:bg-paper hover:text-ink"
              title="Notifications"
            >
              <IconBell size={16} />
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-leaf ring-2 ring-surface" />
            </Link>

            {/* User Profile Pill */}
            <div className="flex items-center gap-2 rounded-lg border border-line bg-surface py-1 pr-2.5 pl-1.5 shadow-2xs">
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
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-[1440px]">{children}</div>
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
