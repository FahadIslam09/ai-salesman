"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { API, api, timeAgo } from "@/lib/api";
import { usePage } from "@/components/PageProvider";
import { Badge, Button, Card, Select, Spinner, statusTone } from "@/lib/ui";

interface Message {
  id: string;
  role: string;
  content: string;
  createdAt: string;
}

interface Conversation {
  id: string;
  pageId: string;
  status: string;
  handledBy: string;
  attentionReason: string | null;
  customer: { name: string | null; psid: string; status: string };
  messages: Message[];
}

const STATUSES = ["new", "interested", "negotiating", "follow_up", "purchased", "not_interested", "closed"];

export default function ConversationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { pageId } = usePage();
  const [conv, setConv] = useState<Conversation | null>(null);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    api<Conversation>(`/api/conversations/${id}`)
      .then(setConv)
      .catch((e) => setError(e.message));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // SSE: live message updates
  useEffect(() => {
    if (!pageId) return;
    const es = new EventSource(`${API}/api/events?pageId=${pageId}`);
    es.onmessage = () => load();
    return () => es.close();
  }, [pageId, load]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conv?.messages.length]);

  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (!conv) return <Spinner />;

  async function setHandledBy(handledBy: string) {
    await api(`/api/conversations/${conv!.id}/${handledBy === "human" ? "takeover" : "return-to-ai"}`, {
      method: "POST",
    });
    load();
  }

  async function setStatus(status: string) {
    await api(`/api/conversations/${conv!.id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
    load();
  }

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <p className="font-display text-lg font-semibold text-ink">{conv.customer.name ?? "Unknown customer"}</p>
          <p className="text-xs text-mute">
            PSID {conv.customer.psid} · customer status: {conv.customer.status}
          </p>
          {conv.attentionReason && (
            <p className="mt-1 text-xs font-medium text-warn">Attention: {conv.attentionReason.replaceAll("_", " ")}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={statusTone(conv.status)}>{conv.status}</Badge>
          <Badge tone={conv.handledBy === "human" ? "blue" : "green"}>
            {conv.handledBy === "human" ? "Human handling" : "AI handling"}
          </Badge>
          <Select
            sizeVariant="sm"
            wrapperClassName="w-auto min-w-[140px]"
            value={conv.status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replaceAll("_", " ")}
              </option>
            ))}
          </Select>
          {conv.handledBy === "human" ? (
            <Button variant="ghost" onClick={() => setHandledBy("bot")}>
              Return to AI
            </Button>
          ) : (
            <Button variant="danger" onClick={() => setHandledBy("human")}>
              Take over
            </Button>
          )}
        </div>
      </Card>

      <Card className="flex h-[60vh] flex-col">
        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          {conv.messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm ${
                  m.role === "user"
                    ? "bg-leaf text-white"
                    : m.role === "human"
                      ? "bg-blue-50 text-ink"
                      : "bg-paper text-ink"
                }`}
              >
                {m.content}
                <p className={`mt-1 text-[10px] ${m.role === "user" ? "text-leaf-soft" : "text-mute"}`}>
                  {timeAgo(m.createdAt)}
                </p>
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>
        <div className="border-t border-line bg-surface px-5 py-3 text-xs text-mute">
          Replies are sent by the AI on Facebook Messenger. Take over to answer as yourself from your page.
        </div>
      </Card>
    </div>
  );
}
