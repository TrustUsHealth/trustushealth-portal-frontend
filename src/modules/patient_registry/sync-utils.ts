import type { SyncRun, SyncStats } from "@/core/api/types";
import { formatDate } from "@/lib/format";

/** Lab key the sync writes to (config/spectrum_sync.yaml -> partner_key). */
export const SPECTRUM_KEY = "spectrum";

/** A run still marked "running" after this long died with its process (the backend only fixes the row on the next launch). */
const STALE_RUN_MS = 6 * 60 * 60 * 1000;

export function runIsLive(run: SyncRun): boolean {
  return run.status === "running" && !run.finished_at && Date.now() - new Date(run.started_at).getTime() < STALE_RUN_MS;
}

/** A "running" row that is no longer live is shown as interrupted. */
export function effectiveStatus(run: SyncRun): string {
  return run.status === "running" && !runIsLive(run) ? "interrupted" : run.status;
}

// ───────────── dates (ISO strings, no timezone surprises) ─────────────
const parts = (iso: string) => iso.split("-").map(Number) as [number, number, number];

export function addDays(iso: string, n: number): string {
  const [y, m, d] = parts(iso);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string): number {
  const [ya, ma, da] = parts(a);
  const [yb, mb, db] = parts(b);
  return Math.round((Date.UTC(yb, mb - 1, db) - Date.UTC(ya, ma - 1, da)) / 86_400_000);
}

export function monthBounds(month: string): { from: string; to: string } {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, "0")}` };
}

export function prevMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
}

export function rangeLabel(from: string, to: string): string {
  return from === to ? formatDate(from) : `${formatDate(from)} – ${formatDate(to)}`;
}

export function formatDuration(startIso: string, endIso?: string | null): string {
  if (!endIso) return "—";
  const s = Math.max(0, Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

// ───────────── labels ─────────────
export const TRIGGER_LABEL: Record<string, string> = {
  scheduled: "Scheduled (daily)",
  catch_up: "Catch-up on start",
  manual: "Admin",
  job: "Cron job",
  cli: "Command line",
};

export const OUTCOME_LABEL: Record<string, string> = {
  created: "Draft entry created",
  merged: "Merged into an existing entry",
  unchanged: "Entry already up to date",
  existing_entry: "Entry (with report) already existed",
  existing_conflict: "Matched an existing entry, some fields differ",
  possible_duplicate: "Possible duplicate: no entry created",
};

export const OUTCOME_HINT: Record<string, string> = {
  existing_conflict: "The report was linked to the existing entry. Nothing was overwritten: check the differing fields if needed.",
  possible_duplicate:
    "The report is stored but no entry was created because a similar patient already exists that day. Open the registry for that date and decide, or download the report and add it through New entry.",
};

export const WARNING_LABEL: Record<string, string> = {
  report_unreadable: "Report could not be read",
  report_needs_review: "Report needs checking",
  registration_date_from_sid: "Date taken from the portal visit",
  patient_name_from_report: "Name taken from report",
  age_from_report: "Age taken from report",
  age_unit_from_report: "Age unit taken from report",
  gender_from_report: "Gender taken from report",
  entry_has_other_report: "Entry already had another report",
};

export function labelFor(map: Record<string, string>, key: string): string {
  return map[key] ?? key.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}

/** One line for lists: "12 visits seen · 3 created · 1 failed". */
export function summaryText(s: SyncStats, dry = false): string {
  if (dry) return `${s.rows_seen} visits found · ${s.would_process} would be imported · ${s.already_done} already imported`;
  const bits = [
    `${s.rows_seen} visits seen`,
    s.created ? `${s.created} created` : "",
    s.merged ? `${s.merged} merged` : "",
    s.needs_review ? `${s.needs_review} need review` : "",
    s.failed ? `${s.failed} failed` : "",
    s.already_done ? `${s.already_done} already imported` : "",
  ].filter(Boolean);
  return bits.join(" · ");
}