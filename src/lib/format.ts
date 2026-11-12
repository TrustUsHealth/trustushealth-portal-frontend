import type { AgeUnit, Role } from "@/core/api/types";

const TZ = "Asia/Kolkata";

export function formatDate(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v.length === 10 ? `${v}T00:00:00` : v);
  if (Number.isNaN(d.getTime())) return v;
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", ...(v.length > 10 ? { timeZone: undefined } : {}) }).format(d);
}

/** Backend returns naive IST date-times for entries (collection/reporting) and UTC ISO for system timestamps. */
export function formatDateTime(v?: string | null, opts: { naive?: boolean } = {}) {
  if (!v) return "—";
  const hasZone = /Z$|[+-]\d\d:?\d\d$/.test(v);
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    ...(hasZone && !opts.naive ? { timeZone: TZ } : {}),
  }).format(d);
}

export function relativeTime(v?: string | null) {
  if (!v) return "never";
  const t = new Date(v).getTime();
  if (Number.isNaN(t)) return "—";
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 45) return "just now";
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (s < 3600) return rtf.format(-Math.round(s / 60), "minute");
  if (s < 86400) return rtf.format(-Math.round(s / 3600), "hour");
  if (s < 86400 * 30) return rtf.format(-Math.round(s / 86400), "day");
  return formatDate(v);
}

export function formatMoney(v?: number | null, currency = "INR") {
  if (v === null || v === undefined) return "—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 2, minimumFractionDigits: v % 1 ? 2 : 0 }).format(v);
}

const UNIT: Record<AgeUnit, [string, string]> = { Y: ["yr", "yrs"], M: ["mo", "mos"], D: ["day", "days"] };

export function formatAge(age?: number | null, unit?: AgeUnit | null) {
  if (age === null || age === undefined) return "—";
  const [one, many] = UNIT[unit ?? "Y"];
  return `${age} ${age === 1 ? one : many}`;
}

export const ROLE_LABEL: Record<Role, string> = { admin: "Admin", staff: "Staff", engineer: "Engineer", customer: "Customer" };

export function todayISO() {
  // en-CA gives YYYY-MM-DD; pin to IST so "today" matches the clinic's day.
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
}

/** "2026-10-14T11:26:00" -> "2026-10-14T11:26" for <input type="datetime-local">. */
export function toLocalInput(v?: string | null) {
  return v ? v.slice(0, 16) : "";
}

export function humanizeKey(k: string) {
  return k.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}
