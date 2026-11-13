import type { Direction, Grain, KpiKind } from "./types";

export const RUPEE = "\u20b9";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Indian digit grouping: 1234567 -> 12,34,567. */
function groupIndian(whole: string): string {
  if (whole.length <= 3) return whole;
  let head = whole.slice(0, -3);
  const tail = whole.slice(-3);
  const parts: string[] = [];
  while (head.length > 2) {
    parts.unshift(head.slice(-2));
    head = head.slice(0, -2);
  }
  if (head) parts.unshift(head);
  return `${parts.join(",")},${tail}`;
}

export function toNumber(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Money for display: ₹ with Indian grouping (₹4,21,500). Pass decimals = 2 where paise matter. */
export function inr(v: string | number | null | undefined, decimals = 0): string {
  const n = toNumber(v);
  if (n === null) return "n/a";
  const scaled = Math.round(Math.abs(n) * 10 ** decimals);
  const digits = String(scaled).padStart(decimals + 1, "0");
  const whole = decimals ? digits.slice(0, -decimals) : digits;
  const frac = decimals ? digits.slice(-decimals) : "";
  const negative = n < 0 && scaled !== 0;
  return `${negative ? "-" : ""}${RUPEE}${groupIndian(whole)}${frac ? `.${frac}` : ""}`;
}

const trim1 = (x: number) => String(Math.round(x * 10) / 10);

/** Axis form: ₹4.2L, ₹1.2Cr; below one lakh the full grouped number. */
export function compactInr(n: number): string {
  const a = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (a >= 1e7) return `${sign}${RUPEE}${trim1(a / 1e7)}Cr`;
  if (a >= 1e5) return `${sign}${RUPEE}${trim1(a / 1e5)}L`;
  return inr(n, 0);
}

export function formatCount(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "n/a";
  return new Intl.NumberFormat("en-IN").format(n);
}

export function pct(v: number | null | undefined, digits = 1): string {
  return v === null || v === undefined ? "n/a" : `${v.toFixed(digits)}%`;
}

/** Hours, shown as days above 48 h (same rule as the PDF). */
export function hoursText(h: number | null | undefined): string {
  if (h === null || h === undefined) return "No data";
  return h > 48 ? `${(h / 24).toFixed(1)} days` : `${h.toFixed(1)} h`;
}

export function kpiValue(k: { kind: KpiKind; value: string | number | null }): string {
  if (k.value === null || k.value === undefined) return "n/a";
  if (k.kind === "money") return inr(k.value);
  if (k.kind === "count") return formatCount(Number(k.value));
  return pct(Number(k.value));
}

export function kpiCompareValue(k: { kind: KpiKind; compare_value: string | number | null }): string | null {
  if (k.compare_value === null || k.compare_value === undefined) return null;
  return kpiValue({ kind: k.kind, value: k.compare_value });
}

/** Change shown as a glyph plus words, in neutral ink (PRD rule 7). Percent KPIs change in percentage points. */
export function deltaParts(kind: KpiKind, direction: Direction | null, delta: number | null): { glyph: string; text: string } | null {
  if (!direction) return null;
  if (direction === "new") return { glyph: "", text: "New" };
  if (direction === "flat") return { glyph: "\u2013", text: "No change" };
  const unit = kind === "percent" ? " pts" : "%";
  const amount = delta === null ? "" : ` ${Math.abs(delta).toFixed(1)}${unit}`;
  return direction === "up" ? { glyph: "\u25b2", text: `Up${amount}` } : { glyph: "\u25bc", text: `Down${amount}` };
}

export const grainWord = (g: Grain) => (g === "day" ? "day" : g === "week" ? "week" : "month");

/** "2026-11-13" -> "13 Nov 2026" without any timezone shift. */
export function fmtDay(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** "Updated hh:mm" clock in IST. */
export function clockIST(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata" }).format(d);
}