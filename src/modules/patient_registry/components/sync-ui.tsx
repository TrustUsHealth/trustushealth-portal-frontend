import { AlertTriangle, Ban, CheckCircle2, CircleDashed, Loader2, XCircle, type LucideIcon } from "lucide-react";
import { Pill } from "@/components/ui/badge";
import type { SyncStats } from "@/core/api/types";
import { cn } from "@/lib/utils";

const TONE = {
  ok: "border-ok/25 bg-ok-soft text-ok",
  warn: "border-warn/30 bg-warn-soft text-warn",
  danger: "border-danger/25 bg-danger-soft text-danger",
  info: "border-info/25 bg-info-soft text-info",
  neutral: "border-line bg-ivory text-ink-muted",
} as const;

const RUN: Record<string, { label: string; tone: keyof typeof TONE; icon: LucideIcon; spin?: boolean }> = {
  running: { label: "Running", tone: "info", icon: Loader2, spin: true },
  completed: { label: "Completed", tone: "ok", icon: CheckCircle2 },
  completed_with_errors: { label: "Completed with errors", tone: "warn", icon: AlertTriangle },
  partial: { label: "Partly done", tone: "warn", icon: CircleDashed },
  failed: { label: "Failed", tone: "danger", icon: XCircle },
  interrupted: { label: "Interrupted", tone: "neutral", icon: Ban },
};

export function RunStatusPill({ status, dry }: { status: string; dry?: boolean }) {
  const t = RUN[status] ?? { label: status, tone: "neutral" as const, icon: CircleDashed };
  const Icon = t.icon;
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <Pill className={TONE[t.tone]}>
        <Icon className={cn("h-3 w-3", t.spin && "animate-spin")} aria-hidden />
        {t.label}
      </Pill>
      {dry && <Pill className={TONE.neutral}>Preview only</Pill>}
    </span>
  );
}

const ITEM: Record<string, { label: string; tone: keyof typeof TONE; icon: LucideIcon }> = {
  done: { label: "Done", tone: "ok", icon: CheckCircle2 },
  needs_review: { label: "Needs review", tone: "warn", icon: AlertTriangle },
  failed: { label: "Failed", tone: "danger", icon: XCircle },
  processing: { label: "In progress", tone: "info", icon: Loader2 },
};

export function ItemStatusPill({ status }: { status: string }) {
  const t = ITEM[status] ?? { label: status, tone: "neutral" as const, icon: CircleDashed };
  const Icon = t.icon;
  return (
    <Pill className={TONE[t.tone]}>
      <Icon className="h-3 w-3" aria-hidden />
      {t.label}
    </Pill>
  );
}

type Tile = { label: string; value: number; tone?: "ok" | "warn" | "danger" | "info" };
const VALUE_TONE = { ok: "text-ok", warn: "text-warn", danger: "text-danger", info: "text-info" } as const;

/** Counters of one run. Preview (dry-run) runs only fill a few of them, so they get their own set. */
export function StatTiles({ stats, dry }: { stats: SyncStats; dry?: boolean }) {
  const tiles: Tile[] = dry
    ? [
        { label: "Visits found", value: stats.rows_seen },
        { label: "Would import", value: stats.would_process, tone: "info" },
        { label: "Already imported", value: stats.already_done },
        { label: "Already in registry", value: stats.skipped_existing_entry },
        { label: "Gave up (max attempts)", value: stats.exhausted, tone: "warn" },
      ]
    : [
        { label: "Visits found", value: stats.rows_seen },
        { label: "Drafts created", value: stats.created, tone: "ok" },
        { label: "Merged", value: stats.merged },
        { label: "Needs review", value: stats.needs_review, tone: "warn" },
        { label: "Failed", value: stats.failed, tone: "danger" },
        { label: "Already imported", value: stats.already_done },
        { label: "Already in registry", value: stats.skipped_existing_entry },
        { label: "Gave up (max attempts)", value: stats.exhausted, tone: "warn" },
        ...(stats.unchanged ? [{ label: "Unchanged", value: stats.unchanged }] : []),
        ...(stats.existing_conflict ? [{ label: "Matched, fields differ", value: stats.existing_conflict, tone: "warn" as const }] : []),
      ];
  return (
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {tiles.map((t) => (
        <div key={t.label} className="rounded-ctl border border-line/80 bg-white px-3 py-2">
          <dt className="text-[12px] leading-tight text-ink-muted">{t.label}</dt>
          <dd className={cn("mt-0.5 font-display text-xl font-semibold tabular-nums", t.tone && t.value > 0 ? VALUE_TONE[t.tone] : "text-ink-heading")}>{t.value}</dd>
        </div>
      ))}
    </dl>
  );
}