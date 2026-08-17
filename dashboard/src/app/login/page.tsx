"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { API } from "@/lib/api";
import { Spinner } from "@/lib/ui";
import {
  IconSparkles,
  IconGoogle,
  IconEye,
  IconEyeOff,
  IconInfo,
} from "@/components/Icons";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/auth/sign-in/email`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.message ?? "Incorrect email or password. Please try again.");
        return;
      }
      router.push("/overview");
    } catch {
      setError("Could not reach the authentication server. Please check your connection.");
    } finally {
      setBusy(false);
    }
  }

  function handleGoogleLogin() {
    setGoogleBusy(true);
    setError("");
    window.location.href = `${API}/api/auth/sign-in/social?provider=google&callbackURL=${encodeURIComponent(
      window.location.origin + "/overview"
    )}`;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] p-4 sm:p-6 font-sans">
      <div className="w-full max-w-[440px]">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#087F5B] text-white shadow-xs transition-transform group-hover:scale-105">
              <IconSparkles size={22} />
            </div>
            <div className="text-left">
              <span className="font-display text-base font-bold tracking-tight text-[#0F172A] block leading-tight">
                AI Sales Bot
              </span>
              <span className="text-[11px] font-medium text-[#64748B] block leading-tight">
                E-commerce copilot
              </span>
            </div>
          </Link>

          <h1 className="mt-6 text-2xl font-bold tracking-tight text-[#0F172A] sm:text-[26px]">
            Welcome back
          </h1>
          <p className="mt-1.5 text-xs text-[#64748B] leading-relaxed max-w-xs">
            Sign in to continue to your AI Sales Bot account.
          </p>
        </div>

        {/* Main Card Container */}
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 sm:p-8 shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
          {/* Error Alert */}
          {error && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-danger/30 bg-danger-soft p-3.5 text-xs font-medium text-danger">
              <IconInfo size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Social Sign In (Google) */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleBusy || busy}
            className="flex h-11 w-full items-center justify-center gap-3 rounded-xl border border-[#D9E2E8] bg-white px-4 text-xs font-semibold text-[#172033] shadow-2xs transition-all hover:bg-[#F8FAFC] hover:border-[#CBD5E1] active:bg-[#F1F5F9] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {googleBusy ? (
              <Spinner />
            ) : (
              <>
                <IconGoogle size={18} />
                <span>Continue with Google</span>
              </>
            )}
          </button>

          {/* Divider */}
          <div className="relative my-6 flex items-center justify-center">
            <div className="w-full border-t border-[#E5E7EB]" />
            <span className="absolute bg-white px-3 text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">
              OR
            </span>
          </div>

          {/* Email Sign In Form */}
          <form onSubmit={submit} className="space-y-4">
            {/* Email Address */}
            <div>
              <label
                htmlFor="login-email"
                className="mb-1.5 block text-xs font-semibold text-[#172033]"
              >
                Email address
              </label>
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                className="h-11 w-full rounded-xl border border-[#D9E2E8] bg-white px-3.5 text-xs text-[#0F172A] placeholder:text-[#94A3B8] shadow-2xs transition-all focus:border-[#087F5B] focus:outline-none focus:ring-2 focus:ring-[#087F5B]/15"
              />
            </div>

            {/* Password with Show/Hide Toggle */}
            <div>
              <label
                htmlFor="login-password"
                className="mb-1.5 block text-xs font-semibold text-[#172033]"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="h-11 w-full rounded-xl border border-[#D9E2E8] bg-white pr-10 pl-3.5 text-xs text-[#0F172A] placeholder:text-[#94A3B8] shadow-2xs transition-all focus:border-[#087F5B] focus:outline-none focus:ring-2 focus:ring-[#087F5B]/15"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#94A3B8] hover:text-[#172033]"
                >
                  {showPassword ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password Row */}
            <div className="flex items-center justify-between text-xs pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer select-none text-[#475569]">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded-xs border-[#D9E2E8] text-[#087F5B] accent-[#087F5B] focus:ring-0"
                />
                <span>Remember me</span>
              </label>

              <button
                type="button"
                onClick={() =>
                  setError("Password reset link will be sent to your email address.")
                }
                className="font-medium text-[#087F5B] hover:underline"
              >
                Forgot password?
              </button>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={busy || googleBusy}
              className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#087F5B] px-4 text-xs font-semibold text-white shadow-xs transition-all hover:bg-[#066B4D] active:bg-[#05573D] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? (
                <>
                  <Spinner />
                  <span>Signing in…</span>
                </>
              ) : (
                <span>Sign in</span>
              )}
            </button>
          </form>

          {/* Sign Up Navigation Link */}
          <div className="mt-6 border-t border-[#E5E7EB] pt-4 text-center text-xs text-[#64748B]">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-semibold text-[#087F5B] hover:underline"
            >
              Create an account
            </Link>
          </div>
        </div>

        {/* Security Trust Footnote */}
        <div className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-[#94A3B8]">
          <span>Protected with secure authentication</span>
        </div>
      </div>
    </div>
  );
}
