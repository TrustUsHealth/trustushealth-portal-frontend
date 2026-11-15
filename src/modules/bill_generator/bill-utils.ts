import type { Decimal, EntryBill } from "./types";

/** One test line as typed in a form: both values stay strings until they are validated. */
export interface BillRow { name: string; amount: string }
export interface RowError { name?: string; amount?: string }

export const MAX_ROWS = 60; // backend: tests / test_amounts max_length=60
const MAX_CENTS = 1_000_000_000; // 10,000,000.00 (backend Money le=10000000)
const MONEY_RE = /^\d{1,8}(\.\d{1,2})?$/; // backend Money max_digits=10, decimal_places=2

export const cleanMoney = (s: string) => s.replace(/[,₹\s]/g, "");

/** "450.5" -> 45050. null when it is not a valid amount for the backend. Money is handled in integer paise. */
export function parseCents(raw: string | null | undefined): number | null {
  const s = cleanMoney(String(raw ?? ""));
  if (!MONEY_RE.test(s)) return null;
  const [whole, frac = ""] = s.split(".");
  const cents = Number(whole) * 100 + Number((frac + "00").slice(0, 2));
  return cents <= MAX_CENTS ? cents : null;
}

export const centsToString = (c: number) => `${Math.floor(c / 100)}.${String(c % 100).padStart(2, "0")}`;

/** Server decimal (string or number) -> paise. */
export function fromServer(v: Decimal | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

export const normalizeName = (s: string) => s.replace(/\s+/g, " ").trim();

export function validateRows(rows: BillRow[]) {
  const errors: RowError[] = rows.map(() => ({}));
  let message: string | undefined;
  if (rows.length === 0) message = "Add at least one test.";
  else if (rows.length > MAX_ROWS) message = `A bill can have up to ${MAX_ROWS} tests.`;
  const seen = new Set<string>();
  rows.forEach((r, i) => {
    const name = normalizeName(r.name);
    if (!name) errors[i].name = "Enter the test name";
    else if (name.length > 200) errors[i].name = "Keep the name under 200 characters";
    else {
      const key = name.toLowerCase();
      if (seen.has(key)) errors[i].name = "This test is already on the bill";
      else seen.add(key);
    }
    if (!r.amount.trim()) errors[i].amount = "Enter the amount";
    else if (parseCents(r.amount) === null) errors[i].amount = "Use an amount like 450 or 450.50";
  });
  return { ok: !message && errors.every((e) => !e.name && !e.amount), errors, message };
}

export const sumCents = (rows: BillRow[]) => rows.reduce((total, r) => total + (parseCents(r.amount) ?? 0), 0);

export function rowsFromEntry(e: EntryBill): BillRow[] {
  const rows = e.tests.map((name, i) => {
    const c = fromServer(e.test_amounts[i]);
    return { name, amount: c === null ? "" : centsToString(c) };
  });
  return rows.length ? rows : [{ name: "", amount: "" }];
}

export function rowsToPayload(rows: BillRow[]) {
  return {
    tests: rows.map((r) => normalizeName(r.name)),
    test_amounts: rows.map((r) => centsToString(parseCents(r.amount) ?? 0)),
  };
}

export function sameRows(a: BillRow[], b: BillRow[]) {
  return (
    a.length === b.length &&
    a.every((r, i) => normalizeName(r.name) === normalizeName(b[i].name) && (parseCents(r.amount) ?? r.amount.trim()) === (parseCents(b[i].amount) ?? b[i].amount.trim()))
  );
}