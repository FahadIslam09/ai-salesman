"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { usePage } from "@/components/PageProvider";
import { Button, Card, Field, Input, Select, Spinner, TextArea } from "@/lib/ui";

interface BotConfig {
  enabled: boolean;
  businessInfo: string | null;
  tone: string;
  language: string;
  customInstructions: string | null;
}

export default function SettingsPage() {
  const { pageId } = usePage();
  const [config, setConfig] = useState<BotConfig | null>(null);
  const [form, setForm] = useState({
    enabled: true,
    businessInfo: "",
    tone: "friendly",
    language: "auto",
    customInstructions: "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!pageId) return;
    api<BotConfig | null>(`/api/settings/${pageId}`).then((c) => {
      if (c) {
        setConfig(c);
        setForm({
          enabled: c.enabled,
          businessInfo: c.businessInfo ?? "",
          tone: c.tone,
          language: c.language,
          customInstructions: c.customInstructions ?? "",
        });
      }
    });
  }, [pageId]);

  if (!pageId) return <Spinner />;

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      const updated = await api<BotConfig>(`/api/settings/${pageId}`, {
        method: "PATCH",
        body: JSON.stringify({
          ...form,
          businessInfo: form.businessInfo || null,
          customInstructions: form.customInstructions || null,
        }),
      });
      setConfig(updated);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Card className="space-y-4 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-display text-base font-semibold text-ink">AI sales agent</p>
            <p className="text-xs text-mute">When enabled, the AI replies to messages and comments on your page.</p>
          </div>
          <label className="flex cursor-pointer items-center gap-2">
            <span className="text-sm text-ink">{form.enabled ? "On" : "Off"}</span>
            <button
              type="button"
              role="switch"
              aria-checked={form.enabled}
              onClick={() => setForm({ ...form, enabled: !form.enabled })}
              className={`relative h-6 w-11 rounded-full transition-colors ${form.enabled ? "bg-leaf" : "bg-neutral-300"}`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${form.enabled ? "left-[22px]" : "left-0.5"}`}
              />
            </button>
          </label>
        </div>
      </Card>

      <Card className="space-y-4 p-6">
        <Field label="Tone">
          <Select value={form.tone} onChange={(e) => setForm({ ...form, tone: e.target.value })}>
            <option value="friendly">Friendly</option>
            <option value="professional">Professional</option>
            <option value="casual">Casual</option>
          </Select>
        </Field>
        <Field label="Language">
          <Select value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}>
            <option value="auto">Auto (match the customer)</option>
            <option value="bangla">Bangla</option>
            <option value="english">English</option>
          </Select>
        </Field>
        <Field label="Business information">
          <TextArea
            rows={4}
            value={form.businessInfo}
            onChange={(e) => setForm({ ...form, businessInfo: e.target.value })}
            placeholder="What you sell, where you are, what makes your shop special…"
          />
        </Field>
        <Field label="Custom instructions">
          <TextArea
            rows={3}
            value={form.customInstructions}
            onChange={(e) => setForm({ ...form, customInstructions: e.target.value })}
            placeholder="E.g. Always offer delivery info before asking for payment."
          />
        </Field>
        <div className="flex items-center gap-3">
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save settings"}
          </Button>
          {saved && <span className="text-sm text-leaf">Saved.</span>}
        </div>
      </Card>

      {config && (
        <p className="text-xs text-mute">
          These settings shape the AI&apos;s personality and knowledge. Changes apply from the next reply.
        </p>
      )}
    </div>
  );
}
