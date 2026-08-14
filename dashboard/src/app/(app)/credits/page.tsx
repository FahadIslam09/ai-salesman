"use client";

import { useEffect, useState } from "react";
import { api, fmtTaka, timeAgo } from "@/lib/api";
import { Badge, Button, Card, EmptyState, Spinner, Table, statusTone } from "@/lib/ui";

interface Balance {
  credits: number;
  totalPurchased: number;
  totalUsed: number;
  level: string;
}

interface CreditPackage {
  id: string;
  name: string;
  priceBdt: number;
  credits: number;
}

interface Payment {
  id: string;
  provider: string;
  package: string;
  creditsGranted: number;
  amount: number;
  status: string;
  createdAt: string;
}

export default function CreditsPage() {
  const [balance, setBalance] = useState<Balance | null>(null);
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [history, setHistory] = useState<Payment[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = () => {
    Promise.all([
      api<Balance>("/api/credits/balance"),
      api<CreditPackage[]>("/api/credits/packages"),
      api<Payment[]>("/api/credits/history"),
    ])
      .then(([b, p, h]) => {
        setBalance(b);
        setPackages(p);
        setHistory(h);
      })
      .catch((e) => setError(e.message));
  };

  useEffect(load, []);

  async function recharge(pkg: CreditPackage) {
    setBusy(pkg.id);
    setError("");
    try {
      const res = await api<{ bkashURL?: string; paymentId?: string }>("/api/credits/recharge", {
        method: "POST",
        body: JSON.stringify({ packageId: pkg.id }),
      });
      if (res.bkashURL) {
        window.open(res.bkashURL, "_blank");
      } else {
        setError("Payment recorded as manual. Complete the payment and it will be verified by the owner.");
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  }

  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (!balance) return <Spinner />;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-mute">Credits remaining</p>
          <p className="mt-2 font-display text-3xl font-semibold text-leaf">{balance.credits.toLocaleString("en-IN")}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-mute">Total purchased</p>
          <p className="mt-2 font-display text-3xl font-semibold text-ink">{balance.totalPurchased.toLocaleString("en-IN")}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-mute">Total used</p>
          <p className="mt-2 font-display text-3xl font-semibold text-ink">{balance.totalUsed.toLocaleString("en-IN")}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-mute">Status</p>
          <div className="mt-2">
            <Badge tone={balance.level === "ok" ? "green" : balance.level === "zero" ? "red" : "amber"}>
              {balance.level === "ok" ? "Healthy" : balance.level.replaceAll("_", " ")}
            </Badge>
          </div>
        </Card>
      </div>

      <section>
        <h2 className="mb-3 font-display text-base font-semibold text-ink">Recharge with bKash</h2>
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
          {packages.map((pkg) => (
            <Card key={pkg.id} className="flex flex-col gap-2 p-5">
              <p className="font-display text-lg font-semibold text-ink">{pkg.name}</p>
              <p className="font-display text-2xl font-semibold text-leaf">{fmtTaka(pkg.priceBdt)}</p>
              <p className="text-sm text-mute">{pkg.credits.toLocaleString("en-IN")} credits</p>
              <Button onClick={() => recharge(pkg)} disabled={busy !== null} className="mt-2">
                {busy === pkg.id ? "Opening bKash…" : "Recharge"}
              </Button>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-display text-base font-semibold text-ink">Recharge history</h2>
        {history.length === 0 ? (
          <EmptyState title="No recharges yet." />
        ) : (
          <Table head={["Package", "Amount", "Credits", "Status", "Provider", "When"]}>
            {history.map((p) => (
              <tr key={p.id} className="hover:bg-paper">
                <td className="px-4 py-3 font-medium text-ink">{p.package}</td>
                <td className="px-4 py-3 text-ink">{fmtTaka(p.amount)}</td>
                <td className="px-4 py-3 text-ink">{p.creditsGranted.toLocaleString("en-IN")}</td>
                <td className="px-4 py-3">
                  <Badge tone={statusTone(p.status)}>{p.status}</Badge>
                </td>
                <td className="px-4 py-3 text-sm text-mute">{p.provider}</td>
                <td className="px-4 py-3 text-sm text-mute">{timeAgo(p.createdAt)}</td>
              </tr>
            ))}
          </Table>
        )}
      </section>
    </div>
  );
}
