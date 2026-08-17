"use client";

import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
  hover = false,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-line bg-surface shadow-[0_1px_3px_rgba(16,24,40,0.03)] ${
        hover ? "transition-all duration-150 ease hover:-translate-y-0.5 hover:border-[#D0D7D4] hover:shadow-[0_4px_12px_rgba(16,24,40,0.05)]" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function Stat({
  label,
  value,
  sub,
  className = "",
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  className?: string;
}) {
  return (
    <Card className={`p-5 ${className}`}>
      <p className="text-xs font-semibold uppercase tracking-wider text-mute">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold text-ink">{value}</p>
      {sub && <p className="mt-1 text-xs text-mute">{sub}</p>}
    </Card>
  );
}

export function Badge({
  children,
  tone = "gray",
  className = "",
}: {
  children: ReactNode;
  tone?: string;
  className?: string;
}) {
  const tones: Record<string, string> = {
    gray: "bg-[#F0F3F2] text-[#61716B]",
    green: "bg-[#E8F6F0] text-[#087F5B]",
    amber: "bg-[#FFF7E6] text-[#B7791F]",
    red: "bg-[#FDEEEE] text-[#D64545]",
    blue: "bg-[#EEF4FF] text-[#3B82F6]",
    info: "bg-[#EDF5FC] text-[#3B82C4]",
    purple: "bg-[#F3EAFE] text-[#7C3AED]",
    orange: "bg-[#FFF4E5] text-[#D97706]",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${
        tones[tone] ?? tones.gray
      } ${className}`}
    >
      {children}
    </span>
  );
}

export function statusTone(status?: string | null): string {
  switch (status?.toLowerCase()) {
    case "purchased":
    case "paid":
    case "completed":
    case "converted":
    case "confirmed":
      return "green";
    case "interested":
    case "negotiating":
    case "hot":
    case "warning":
      return "amber";
    case "not_interested":
    case "lost":
    case "closed":
    case "failed":
    case "rejected":
    case "credit_exhausted":
    case "ai_error":
      return "red";
    case "pending":
    case "scheduled":
    case "follow_up":
      return "blue";
    case "new":
      return "purple";
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
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  variant?: "primary" | "ghost" | "danger" | "outline";
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
}) {
  const variants: Record<string, string> = {
    primary: "bg-leaf text-white hover:bg-leaf-dark active:bg-[#05573d]",
    ghost: "border border-line bg-surface text-ink hover:bg-paper active:bg-line-light",
    outline: "border border-line bg-transparent text-ink hover:bg-paper active:bg-line-light",
    danger: "bg-danger text-white hover:bg-[#b83232] active:bg-[#992222]",
  };
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        variants[variant] ?? variants.primary
      } ${className}`}
    >
      {children}
    </button>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-mute focus:border-leaf focus:outline-none focus:ring-1 focus:ring-leaf ${
        props.className ?? ""
      }`}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-leaf focus:outline-none focus:ring-1 focus:ring-leaf ${
        props.className ?? ""
      }`}
    />
  );
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-mute focus:border-leaf focus:outline-none focus:ring-1 focus:ring-leaf ${
        props.className ?? ""
      }`}
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

export function EmptyState({
  title,
  subtitle,
  icon,
  action,
  className = "",
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <Card className={`flex flex-col items-center justify-center p-8 text-center ${className}`}>
      {icon && <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-paper text-mute">{icon}</div>}
      <p className="text-sm font-medium text-ink">{title}</p>
      {subtitle && <p className="mt-1 max-w-sm text-xs text-mute">{subtitle}</p>}
      {action && <div className="mt-4">{action}</div>}
    </Card>
  );
}

export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <Card className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-line bg-[#FAFCFB]">
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

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <div className={`flex h-40 items-center justify-center ${className}`}>
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-line border-t-leaf" />
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-line-light ${className}`} />;
}
