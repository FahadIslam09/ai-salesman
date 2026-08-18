"use client";

import React, { Children, isValidElement, useEffect, useRef, useState, type ReactNode } from "react";

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
      className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
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

export interface SelectOption {
  value: string | number;
  label: ReactNode;
  disabled?: boolean;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "onChange"> {
  sizeVariant?: "sm" | "md" | "lg";
  icon?: ReactNode;
  wrapperClassName?: string;
  options?: SelectOption[];
  placeholder?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  align?: "left" | "right";
  menuClassName?: string;
}

export function Select({
  sizeVariant = "md",
  icon,
  wrapperClassName = "",
  className = "",
  menuClassName = "",
  align = "left",
  disabled,
  children,
  options,
  value,
  placeholder,
  name,
  id,
  required,
  onChange,
  ...props
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen]);

  // Extract options from options prop OR children <option> elements (recursively handling maps & fragments)
  const parsedOptions: SelectOption[] = [];
  if (options && options.length > 0) {
    parsedOptions.push(...options);
  } else if (children) {
    function extract(nodes: ReactNode) {
      Children.forEach(nodes, (child) => {
        if (!isValidElement(child)) return;
        if (child.type === "option") {
          const p = child.props as any;
          parsedOptions.push({
            value: p.value !== undefined ? p.value : p.children,
            label: p.children,
            disabled: p.disabled,
          });
        } else if ((child.props as any)?.children) {
          extract((child.props as any).children);
        }
      });
    }
    extract(children);
  }

  const currentVal = value !== undefined && value !== null ? String(value) : "";
  const selectedOption =
    parsedOptions.find((o) => String(o.value) === currentVal) ??
    (currentVal === "" ? parsedOptions[0] : null);

  const sizeClasses = {
    sm: "h-8.5 text-xs px-3 py-1.5 rounded-lg",
    md: "h-10 text-xs sm:text-sm px-3.5 py-2 rounded-xl",
    lg: "h-11 text-sm px-4 py-2.5 rounded-xl",
  }[sizeVariant];

  const iconPadding = icon ? (sizeVariant === "sm" ? "!pl-8" : "!pl-9.5") : "";

  function handleSelect(opt: SelectOption) {
    if (opt.disabled) return;
    setIsOpen(false);
    if (onChange) {
      const syntheticEvent = {
        target: { value: String(opt.value), name: name ?? id ?? "" },
        currentTarget: { value: String(opt.value), name: name ?? id ?? "" },
        preventDefault: () => {},
        stopPropagation: () => {},
      } as unknown as React.ChangeEvent<HTMLSelectElement>;
      onChange(syntheticEvent);
    }
  }

  return (
    <div
      ref={containerRef}
      className={`group relative inline-flex w-full items-center ${wrapperClassName}`}
    >
      {/* Hidden native select for form serialization / accessibility */}
      <select
        id={id}
        name={name}
        value={value}
        disabled={disabled}
        required={required}
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only pointer-events-none"
        onChange={onChange}
        {...props}
      >
        {children}
      </select>

      {/* Leading Icon */}
      {icon && (
        <div className="pointer-events-none absolute left-3 z-10 flex items-center text-mute transition-colors group-hover:text-ink-secondary group-focus-within:text-leaf">
          {icon}
        </div>
      )}

      {/* Custom Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex w-full cursor-pointer items-center justify-between border border-[#DCE3E8] bg-white font-medium text-[#172033] shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-all duration-150 ease-in-out hover:border-[#CBD5E1] hover:bg-[#FAFBFB] focus:border-leaf focus:bg-white focus:outline-none focus:ring-2 focus:ring-leaf/15 disabled:cursor-not-allowed disabled:bg-[#F3F5F4] disabled:text-disabled disabled:opacity-75 ${sizeClasses} ${iconPadding} ${className}`}
      >
        <span className="truncate text-left">
          {selectedOption ? selectedOption.label : (placeholder ?? "Select option")}
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`ml-2 shrink-0 text-[#94A3B8] transition-transform duration-200 ${
            isOpen ? "rotate-180 text-leaf" : "group-hover:text-ink"
          }`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Floating Popover Options Menu */}
      {isOpen && !disabled && parsedOptions.length > 0 && (
        <div
          className={`animate-dropdown absolute top-full z-50 mt-1.5 min-w-full rounded-2xl border border-[#E2E8F0] bg-white/98 p-1.5 shadow-[0_12px_32px_rgba(16,24,40,0.12),0_4px_8px_rgba(16,24,40,0.04)] backdrop-blur-md ${
            align === "right" ? "right-0" : "left-0"
          } ${menuClassName}`}
        >
          <div className="dropdown-scrollbar max-h-60 space-y-0.5 overflow-y-auto">
            {parsedOptions.map((opt, idx) => {
              const isSelected = String(opt.value) === currentVal;
              return (
                <button
                  key={`${opt.value}-${idx}`}
                  type="button"
                  disabled={opt.disabled}
                  onClick={() => handleSelect(opt)}
                  className={`group/opt flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-medium transition-all duration-150 sm:text-sm ${
                    opt.disabled
                      ? "cursor-not-allowed opacity-40"
                      : isSelected
                        ? "bg-[#E8F6F0] font-semibold text-[#087F5B]"
                        : "text-[#334155] hover:bg-[#F1F5F4] hover:text-[#0F172A]"
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="ml-2 shrink-0 text-[#087F5B]"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
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
