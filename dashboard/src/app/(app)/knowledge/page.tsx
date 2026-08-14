"use client";

import { useEffect, useState } from "react";
import { api, timeAgo } from "@/lib/api";
import { usePage } from "@/components/PageProvider";
import { Badge, Button, Card, EmptyState, Field, Input, Spinner, TextArea, statusTone } from "@/lib/ui";

interface Faq {
  id: string;
  question: string;
  answer: string;
  isActive: boolean;
}

interface KnowledgeRequest {
  id: string;
  question: string;
  answer: string | null;
  status: string;
  createdAt: string;
}

export default function KnowledgePage() {
  const { pageId } = usePage();
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [requests, setRequests] = useState<KnowledgeRequest[]>([]);
  const [form, setForm] = useState({ question: "", answer: "" });
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = () => {
    if (!pageId) return;
    setLoading(true);
    Promise.all([
      api<Faq[]>(`/api/knowledge/faqs?pageId=${pageId}`),
      api<KnowledgeRequest[]>(`/api/knowledge/requests?pageId=${pageId}`),
    ])
      .then(([f, r]) => {
        setFaqs(f);
        setRequests(r);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [pageId]);

  async function addFaq(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api("/api/knowledge/faqs", {
        method: "POST",
        body: JSON.stringify({ pageId, ...form }),
      });
      setForm({ question: "", answer: "" });
      load();
    } finally {
      setSaving(false);
    }
  }

  async function answerRequest(req: KnowledgeRequest, saveToFaq: boolean) {
    const answer = answers[req.id];
    if (!answer) return;
    await api(`/api/knowledge/requests/${req.id}/answer`, {
      method: "POST",
      body: JSON.stringify({ answer, saveToFaq }),
    });
    load();
  }

  if (loading) return <Spinner />;

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <section className="space-y-4">
        <h2 className="font-display text-base font-semibold text-ink">Knowledge base</h2>
        <Card className="p-5">
          <form onSubmit={addFaq} className="space-y-3">
            <Field label="Question">
              <Input required value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} placeholder="What is the delivery charge?" />
            </Field>
            <Field label="Answer">
              <TextArea required rows={3} value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} placeholder="৳80 inside Rajshahi city…" />
            </Field>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Add to knowledge base"}
            </Button>
          </form>
        </Card>
        {faqs.length === 0 ? (
          <EmptyState title="No knowledge entries yet." />
        ) : (
          <Card className="divide-y divide-line">
            {faqs.map((f) => (
              <div key={f.id} className="px-4 py-3">
                <p className="text-sm font-medium text-ink">{f.question}</p>
                <p className="mt-1 text-sm text-mute">{f.answer}</p>
              </div>
            ))}
          </Card>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-base font-semibold text-ink">AI needs your answer</h2>
        {requests.filter((r) => r.status === "pending").length === 0 ? (
          <EmptyState title="The AI hasn't asked for anything yet. Good job keeping it informed." />
        ) : (
          requests
            .filter((r) => r.status === "pending")
            .map((r) => (
              <Card key={r.id} className="space-y-3 p-5">
                <div>
                  <p className="text-sm font-medium text-ink">Customer asked: {r.question}</p>
                  <p className="text-xs text-mute">{timeAgo(r.createdAt)}</p>
                </div>
                <TextArea
                  rows={2}
                  placeholder="Your answer…"
                  value={answers[r.id] ?? ""}
                  onChange={(e) => setAnswers({ ...answers, [r.id]: e.target.value })}
                />
                <div className="flex gap-2">
                  <Button onClick={() => answerRequest(r, true)}>Answer & save to knowledge base</Button>
                  <Button variant="ghost" onClick={() => answerRequest(r, false)}>
                    Answer only
                  </Button>
                </div>
              </Card>
            ))
        )}
        {requests.some((r) => r.status !== "pending") && (
          <Card className="divide-y divide-line">
            {requests
              .filter((r) => r.status !== "pending")
              .map((r) => (
                <div key={r.id} className="px-4 py-3">
                  <p className="text-sm font-medium text-ink">{r.question}</p>
                  <p className="mt-1 text-sm text-mute">{r.answer ?? "—"}</p>
                  <div className="mt-1">
                    <Badge tone={statusTone(r.status)}>{r.status}</Badge>
                  </div>
                </div>
              ))}
          </Card>
        )}
      </section>
    </div>
  );
}
