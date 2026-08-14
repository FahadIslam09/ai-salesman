"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { API } from "@/lib/api";
import { Button, Field, Input } from "@/lib/ui";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/auth/sign-up/email`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.message ?? "Sign-up failed.");
        return;
      }
      router.push("/overview");
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <p className="font-display text-2xl font-semibold text-ink">AI Sales Bot</p>
        <p className="mt-1 text-sm text-mute">Start selling on autopilot.</p>
        <form onSubmit={submit} className="mt-8 space-y-4 rounded-xl border border-line bg-surface p-6">
          <Field label="Your name">
            <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Rahim Uddin" />
          </Field>
          <Field label="Email">
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@shop.com" />
          </Field>
          <Field label="Password">
            <Input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
          </Field>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "Creating account…" : "Create account"}
          </Button>
          <p className="text-center text-sm text-mute">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-leaf hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
