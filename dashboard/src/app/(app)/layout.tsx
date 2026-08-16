"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { PageProvider, usePage } from "@/components/PageProvider";
import { Spinner } from "@/lib/ui";

const NAV = [
  {
    section: "Main",
    items: [
      { href: "/overview", label: "Overview" },
      { href: "/inbox", label: "Inbox" },
      { href: "/customers", label: "Customers" },
      { href: "/products", label: "Products" },
      { href: "/sales", label: "Sales" },
      { href: "/follow-ups", label: "Follow-ups" },
    ],
  },
  {
    section: "AI",
    items: [
      { href: "/knowledge", label: "AI Knowledge" },
      { href: "/activity", label: "AI Activity" },
    ],
  },
  {
    section: "Insights",
    items: [{ href: "/analytics", label: "Analytics" }],
  },
  {
    section: "Business",
    items: [
      { href: "/business-info", label: "Business Info" },
      { href: "/accounts", label: "Connected Pages" },
      { href: "/notifications", label: "Notifications" },
    ],
  },
  {
    section: "Account",
    items: [
      { href: "/credits", label: "Credits" },
      { href: "/settings", label: "Settings" },
    ],
  },
];

const ALL_NAV_ITEMS = NAV.flatMap((g) => g.items);

function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { pages, pageId, setPageId } = usePage();
  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() => {
    api<{ credits: number }>("/api/credits/balance")
      .then((b) => setCredits(b.credits))
      .catch(() => {});
  }, []);

  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 flex w-60 flex-col border-r border-line bg-surface">
        <div className="border-b border-line px-5 py-5">
          <p className="font-display text-xl font-semibold text-ink">AI Sales Bot</p>
          <p className="text-xs text-mute">F-commerce copilot</p>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {NAV.map((group) => (
            <div key={group.section} className="mb-4 last:mb-0">
              <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-mute">
                {group.section}
              </p>
              {group.items.map((item) => {
                const active = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`mb-0.5 block rounded-lg px-3 py-2 text-sm transition-colors ${
                      active ? "bg-leaf-soft font-medium text-leaf" : "text-ink hover:bg-paper"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="border-t border-line px-5 py-4">
          {credits !== null && (
            <div className="mb-3 rounded-lg bg-leaf-soft px-3 py-2">
              <p className="text-xs text-mute">AI Credits</p>
              <p className="font-display text-lg font-semibold text-leaf">{credits.toLocaleString("en-IN")}</p>
            </div>
          )}
          <button
            className="w-full rounded-lg border border-line px-3 py-2 text-sm text-ink hover:bg-paper"
            onClick={async () => {
              await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/sign-out`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
              });
              window.location.href = "/login";
            }}
          >
            Log out
          </button>
        </div>
      </aside>

      <div className="ml-60 flex-1">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-paper/90 px-8 py-3 backdrop-blur">
          <h1 className="font-display text-lg font-semibold text-ink">
            {ALL_NAV_ITEMS.find((n) => pathname.startsWith(n.href))?.label ?? ""}
          </h1>
          {pages.length > 0 && (
            <select
              value={pageId ?? ""}
              onChange={(e) => setPageId(e.target.value)}
              className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-ink focus:border-leaf focus:outline-none"
            >
              {pages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
        </header>
        <main className="p-8">{children}</main>
      </div>
    </div>
  );
}

function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    api("/api/auth/get-session")
      .then(() => setReady(true))
      .catch(() => router.replace("/login"));
  }, [router]);

  if (!ready) return <Spinner />;
  return <PageProvider>{children}</PageProvider>;
}

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <Shell>{children}</Shell>
    </AuthGate>
  );
}
