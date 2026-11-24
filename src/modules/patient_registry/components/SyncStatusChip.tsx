"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, XCircle } from "lucide-react";
import { relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useSyncAvailable, useSyncOverview } from "../api";
import { TRIGGER_LABEL, effectiveStatus, labelFor, rangeLabel, summaryText } from "../sync-utils";

const TONE = {
  ok: "border-ok/25 bg-ok-soft text-ok",
  warn: "border-warn/30 bg-warn-soft text-warn",
  danger: "border-danger/25 bg-danger-soft text-danger",
  info: "border-info/25 bg-info-soft text-info",
  neutral: "border-line bg-white text-ink-muted",
} as const;

/** Tiny "last sync" pill for the registry header (admins only). Tapping it opens the Lab sync tab. */
export function SyncStatusChip() {
  const { lab } = useSyncAvailable();
  const { live, last, attention } = useSyncOverview(!!lab);
  if (!lab) return null;

  let tone: keyof typeof TONE = "neutral";
  let Icon = RefreshCw;
  let word = "";
  let when = "No sync yet";
  let detail = "No sync has run yet.";

  if (live) {
    tone = "info"; Icon = Loader2; when = "Syncing…";
    detail = `Sync running: ${rangeLabel(live.date_from, live.date_to)}`;
  } else if (last) {
    const status = effectiveStatus(last);
    when = relativeTime(last.finished_at ?? last.started_at);
    if (status === "completed") { tone = "ok"; Icon = CheckCircle2; }
    else if (status === "completed_with_errors" || status === "partial") { tone = "warn"; Icon = AlertTriangle; word = "Partial"; }
    else { tone = "danger"; Icon = XCircle; word = status === "failed" ? "Failed" : "Interrupted"; }
    detail = `Last sync: ${TRIGGER_LABEL[last.trigger] ?? labelFor({}, last.trigger)} · ${rangeLabel(last.date_from, last.date_to)} · ${summaryText(last.stats, last.dry_run)}`;
  }
  if (!live && attention > 0 && tone === "ok") { tone = "warn"; Icon = AlertTriangle; }
  if (attention > 0) detail += ` · ${attention} need attention`;

  return (
    <Link href="/patient_registry/lab_sync" title={detail} aria-label={detail}
      className={cn("inline-flex h-10 max-w-full items-center gap-1.5 rounded-ctl border px-3 text-[13px] font-semibold transition-colors hover:brightness-95", TONE[tone])}>
      <Icon className={cn("h-4 w-4 shrink-0", live && "animate-spin")} aria-hidden />
      <span className="truncate">
        {!live && !word && last && <span className="hidden sm:inline">Synced </span>}
        {word && <>{word} · </>}
        {when}
      </span>
      {attention > 0 && <span className="rounded-full bg-warn px-1.5 text-[11px] font-semibold leading-5 text-white">{attention}</span>}
    </Link>
  );
}