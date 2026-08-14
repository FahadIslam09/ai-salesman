"use client";

import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-line bg-surface ${className}`}>{children}</div>;
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <Card className="p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-mute">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold text-ink">{value}</p>
      {sub && <p className="mt-1 text-xs text-mute">{sub}</p>}
    </Card>
  );
}

export function Badge({ children, tone = "gray" }: { children: ReactNode; tone?: string }) {
  const tones: Record<string, string> = {
    gray: "bg-neutral-100 text-mute",
    green: "bg-leaf-soft text-leaf",
    amber: "bg-amber-50 text-warn",
    red: "bg-red-50 text-danger",
    blue: "bg-blue-50 text-blue-700",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone] ?? tones.gray}`}>
      {children}
    </span>
  );
}

export function statusTone(status?: string | null): string {
  switch (status) {
    case "purchased":
    case "paid":
    case "completed":
    case "converted":
      return "green";
    case "interested":
    case "negotiating":
    case "hot":
      return "amber";
    case "not_interested":
    case "lost":
    case "closed":
    case "failed":
      return "red";
    case "pending":
    case "scheduled":
      return "blue";
    default:
      return "gray";
  }
}

export function Button({
  children,
  onClick,
  variant = "primary",
  disabled,
  type = "button",
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "danger";
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
}) {
  const variants: Record<string, string> = {
    primary: "bg-leaf text-white hover:bg-[#0b563c]",
    ghost: "border border-line text-ink hover:bg-paper",
    danger: "bg-danger text-white hover:bg-[#9a3131]",
  };
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-mute focus:border-leaf focus:outline-none ${props.className ?? ""}`}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-leaf focus:outline-none ${props.className ?? ""}`}
    />
  );
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-mute focus:border-leaf focus:outline-none ${props.className ?? ""}`}
    />
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-mute">{label}</span>
      {children}
    </label>
  );
}

export function EmptyState({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <Card className="flex flex-col items-center gap-3 p-10 text-center">
      <p className="text-sm text-mute">{title}</p>
      {action}
    </Card>
  );
}

export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <Card className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-line">
            {head.map((h) => (
              <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-mute">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </Card>
  );
}

export function Spinner() {
  return (
    <div className="flex h-40 items-center justify-center">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-line border-t-leaf" />
    </div>
  );
}
