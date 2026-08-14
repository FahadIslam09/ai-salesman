"use client";

import { useEffect, useState } from "react";
import { api, timeAgo } from "@/lib/api";
import { usePage } from "@/components/PageProvider";
import { Badge, Button, Card, EmptyState, Field, Input, Spinner } from "@/lib/ui";

interface Page {
  id: string;
  fbPageId: string;
  name: string;
  isActive: boolean;
  connectedAt: string;
}

export default function AccountsPage() {
  const { pages, pageId, setPageId } = usePage();
  const [rows, setRows] = useState<Page[]>([]);
  const [form, setForm] = useState({ fbPageId: "", name: "", accessToken: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [connected, setConnected] = useState("");

  const load = () => {
    api<Page[]>("/api/pages").then((rows) => {
      setRows(rows);
      setPageId(pageId ?? rows[0]?.id ?? "");
    });
  };

  useEffect(load, []);

  async function connect(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setConnected("");
    try {
      await api("/api/pages", { method: "POST", body: JSON.stringify(form) });
      setForm({ fbPageId: "", name: "", accessToken: "" });
      setConnected("Page connected. The AI is ready to reply.");
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (rows.length === 0 && !connected) return <Spinner />;

  return (
    <div className="max-w-2xl space-y-6">
      <Card className="p-6">
        <p className="mb-4 font-display text-base font-semibold text-ink">Connect a Facebook page</p>
        <form onSubmit={connect} className="space-y-4">
          <Field label="Page ID">
            <Input required value={form.fbPageId} onChange={(e) => setForm({ ...form, fbPageId: e.target.value })} placeholder="231108826760610" />
          </Field>
          <Field label="Page name">
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Fahad Store" />
          </Field>
          <Field label="Page access token">
            <Input required value={form.accessToken} onChange={(e) => setForm({ ...form, accessToken: e.target.value })} placeholder="EAAB…" />
          </Field>
          <p className="text-xs text-mute">
            The token is stored encrypted. Generate it from your Meta app after the page grants
            <code className="mx-1 rounded bg-paper px-1">pages_messaging</code>and
            <code className="mx-1 rounded bg-paper px-1">pages_manage_posts</code>permissions.
          </p>
          {error && <p className="text-sm text-danger">{error}</p>}
          {connected && <p className="text-sm text-leaf">{connected}</p>}
          <Button type="submit" disabled={saving}>
            {saving ? "Connecting…" : "Connect page"}
          </Button>
        </form>
      </Card>

      {rows.length > 0 && (
        <Card className="divide-y divide-line">
          {rows.map((p) => (
            <div key={p.id} className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-sm font-medium text-ink">{p.name}</p>
                <p className="text-xs text-mute">
                  {p.fbPageId} · connected {timeAgo(p.connectedAt)}
                </p>
              </div>
              <Badge tone={p.isActive ? "green" : "gray"}>{p.isActive ? "Connected" : "Inactive"}</Badge>
            </div>
          ))}
        </Card>
      )}
      {rows.length === 0 && <EmptyState title="No pages connected yet. Connect your Facebook page above to start selling with AI." />}
    </div>
  );
}
