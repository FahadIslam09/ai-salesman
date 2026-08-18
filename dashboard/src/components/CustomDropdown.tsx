"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export interface DropdownItem {
  id: string;
  label: string;
  sublabel?: string;
  icon?: ReactNode;
  badge?: string;
  badgeTone?: "green" | "gray" | "amber" | "blue" | "purple";
  disabled?: boolean;
  danger?: boolean;
}

export interface CustomDropdownProps {
  items: DropdownItem[];
  value?: string | null;
  onChange?: (id: string) => void;
  placeholder?: string;
  label?: string;
  icon?: ReactNode;
  sizeVariant?: "sm" | "md" | "lg";
  align?: "left" | "right";
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
  showSearch?: boolean;
  renderTrigger?: (selectedItem: DropdownItem | undefined, isOpen: boolean) => ReactNode;
  renderFooter?: (close: () => void) => ReactNode;
}

export function CustomDropdown({
  items,
  value,
  onChange,
  placeholder = "Select an option",
  label,
  icon,
  sizeVariant = "md",
  align = "left",
  className = "",
  buttonClassName = "",
  menuClassName = "",
  showSearch = false,
  renderTrigger,
  renderFooter,
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedItem = items.find((item) => item.id === value);

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

  const filteredItems = showSearch && search.trim()
    ? items.filter(
        (i) =>
          i.label.toLowerCase().includes(search.toLowerCase()) ||
          (i.sublabel && i.sublabel.toLowerCase().includes(search.toLowerCase()))
      )
    : items;

  const sizeClasses = {
    sm: "h-8.5 text-xs px-3 rounded-lg gap-1.5",
    md: "h-10 text-xs sm:text-sm px-3.5 rounded-xl gap-2",
    lg: "h-11 text-sm px-4 rounded-xl gap-2.5",
  }[sizeVariant];

  const toneBadgeClasses: Record<string, string> = {
    green: "bg-[#E8F6F0] text-[#087F5B] border-[#C3E8D8]",
    gray: "bg-[#F1F5F4] text-[#61716B] border-[#DCE3E8]",
    amber: "bg-[#FFF7E6] text-[#B7791F] border-[#FCE1B6]",
    blue: "bg-[#EEF4FF] text-[#3B82F6] border-[#CFE0FC]",
    purple: "bg-[#F3EAFE] text-[#7C3AED] border-[#E3CDFD]",
  };

  return (
    <div className={`relative inline-block text-left ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      {renderTrigger ? (
        <div onClick={() => setIsOpen(!isOpen)}>{renderTrigger(selectedItem, isOpen)}</div>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex w-full items-center justify-between border border-[#DCE3E8] bg-white font-medium text-[#172033] shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-all duration-150 ease-in-out hover:border-[#CBD5E1] hover:bg-[#FAFBFB] focus:border-leaf focus:bg-white focus:outline-none focus:ring-2 focus:ring-leaf/15 ${sizeClasses} ${buttonClassName}`}
        >
          <div className="flex min-w-0 items-center gap-2">
            {icon && <span className="text-mute">{icon}</span>}
            {selectedItem?.icon && <span className="text-mute">{selectedItem.icon}</span>}
            <span className="truncate">
              {label ? `${label}: ` : ""}
              <span className={selectedItem ? "font-semibold text-[#172033]" : "text-mute"}>
                {selectedItem ? selectedItem.label : placeholder}
              </span>
            </span>
            {selectedItem?.badge && (
              <span
                className={`rounded-full border px-1.5 py-0.2 text-[10px] font-semibold ${
                  toneBadgeClasses[selectedItem.badgeTone ?? "gray"]
                }`}
              >
                {selectedItem.badge}
              </span>
            )}
          </div>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`text-[#94A3B8] transition-transform duration-200 ${isOpen ? "rotate-180 text-leaf" : ""}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      )}

      {/* Floating Menu Popover */}
      {isOpen && (
        <div
          className={`animate-dropdown absolute z-50 mt-1.5 min-w-[200px] max-w-[320px] rounded-2xl border border-[#E2E8F0] bg-white/95 p-1.5 shadow-[0_12px_32px_rgba(16,24,40,0.12),0_4px_8px_rgba(16,24,40,0.04)] backdrop-blur-md ${
            align === "right" ? "right-0" : "left-0"
          } ${menuClassName}`}
        >
          {showSearch && (
            <div className="p-1 pb-1.5">
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAF9] px-2.5 text-xs text-[#172033] placeholder:text-mute focus:border-leaf focus:bg-white focus:outline-none"
                autoFocus
              />
            </div>
          )}

          <div className="dropdown-scrollbar max-h-60 overflow-y-auto space-y-0.5">
            {filteredItems.length === 0 ? (
              <div className="px-3 py-2 text-center text-xs text-mute">No options found</div>
            ) : (
              filteredItems.map((item) => {
                const isSelected = item.id === value;
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={item.disabled}
                    onClick={() => {
                      if (item.disabled) return;
                      onChange?.(item.id);
                      setIsOpen(false);
                    }}
                    className={`group flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-all duration-150 ${
                      item.disabled
                        ? "cursor-not-allowed opacity-50"
                        : isSelected
                          ? "bg-[#E8F6F0] font-semibold text-[#087F5B]"
                          : item.danger
                            ? "text-[#D64545] hover:bg-[#FDEEEE]"
                            : "text-[#334155] hover:bg-[#F1F5F4] hover:text-[#0F172A]"
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      {item.icon && (
                        <span className={isSelected ? "text-[#087F5B]" : "text-[#94A3B8] group-hover:text-[#475569]"}>
                          {item.icon}
                        </span>
                      )}
                      <div className="text-left truncate">
                        <div className="truncate">{item.label}</div>
                        {item.sublabel && (
                          <div className="text-[10px] font-normal text-mute">{item.sublabel}</div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 pl-2">
                      {item.badge && (
                        <span
                          className={`rounded-full border px-1.5 py-0.2 text-[10px] font-semibold ${
                            toneBadgeClasses[item.badgeTone ?? "gray"]
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
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
                          className="shrink-0 text-[#087F5B]"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {renderFooter && (
            <div className="mt-1 border-t border-[#EEF2F0] pt-1">
              {renderFooter(() => setIsOpen(false))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
