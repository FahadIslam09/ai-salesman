const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

export { API };

export async function api<T = any>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      msg = body.error ?? msg;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

export function fmtTaka(n: number | null | undefined): string {
  return `৳${(n ?? 0).toLocaleString("en-IN")}`;
}

export function timeAgo(iso: string | Date | null | undefined): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
