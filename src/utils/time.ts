// Bangladesh Standard Time (BST) is UTC+6 with no daylight saving.
const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000;

// Returns the UTC instant corresponding to the start of "today" in Dhaka time.
export function startOfTodayDhaka(): Date {
  const now = new Date();
  const dhakaNow = new Date(now.getTime() + DHAKA_OFFSET_MS);
  const dhakaMidnight = Date.UTC(dhakaNow.getUTCFullYear(), dhakaNow.getUTCMonth(), dhakaNow.getUTCDate());
  return new Date(dhakaMidnight - DHAKA_OFFSET_MS);
}

// Start of "today" in Dhaka, shifted back by `daysAgo` days.
export function startOfDayDhaka(daysAgo: number): Date {
  return new Date(startOfTodayDhaka().getTime() - daysAgo * 24 * 60 * 60 * 1000);
}

// Human-readable current Bangladesh time, e.g. "2026-08-16 3:45 PM".
export function dhakaNowString(): string {
  const d = new Date(Date.now() + DHAKA_OFFSET_MS);
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const h = d.getUTCHours();
  const mi = String(d.getUTCMinutes()).padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${y}-${mo}-${day} ${h12}:${mi} ${ampm}`;
}
