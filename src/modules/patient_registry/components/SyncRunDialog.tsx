"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarRange, FlaskConical, Play, RotateCcw } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/misc";
import { Switch } from "@/components/ui/switch";
import { errorMessage } from "@/core/api/client";
import type { SyncRunIn } from "@/core/api/types";
import { formatDate, todayISO } from "@/lib/format";
import { useStartSync, useSyncRun } from "../api";
import { addDays, daysBetween, monthBounds, prevMonth, rangeLabel } from "../sync-utils";
import { RunStatusPill, StatTiles } from "./sync-ui";

type Mode = "month" | "range";

/**
 * Admin "Import past data": a month or any date range (max one year per run, the backend's limit), optional preview
 * (dry run), then live progress. The run itself happens on the server, so closing this window does not stop it.
 */
export function SyncRunDialog({
  open, onOpenChange, busy, onOpenActivity,
}: { open: boolean; onOpenChange: (o: boolean) => void; busy: boolean; onOpenActivity: () => void }) {
  const today = todayISO();
  const thisMonth = today.slice(0, 7);
  const [mode, setMode] = useState<Mode>("month");
  const [month, setMonth] = useState(prevMonth(thisMonth));
  const [from, setFrom] = useState(addDays(today, -29));
  const [to, setTo] = useState(today);
  const [retryFailed, setRetryFailed] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const [params, setParams] = useState<SyncRunIn | null>(null);
  const [error, setError] = useState<string | null>(null);
  const start = useStartSync();
  const run = useSyncRun(runId);

  useEffect(() => {
    if (open) { setRunId(null); setParams(null); setError(null); }
  }, [open]);

  // Same rules as the backend (resolve_window), so mistakes show up before the request.
  const win = useMemo((): { error?: string; days?: number; from?: string; to?: string } => {
    if (mode === "month") {
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return { error: "Choose a month (YYYY-MM)." };
      if (month > thisMonth) return { error: "That month has not started yet." };
      const b = monthBounds(month);
      const end = b.to > today ? today : b.to;
      return { from: b.from, to: end, days: daysBetween(b.from, end) + 1 };
    }
    if (!from || !to) return { error: "Choose both dates." };
    if (from > to) return { error: "The start date must not be after the end date." };
    if (from > today) return { error: "The start date is in the future." };
    if (daysBetween(from, to) > 366) return { error: "Choose at most one year at a time. For longer periods, import in parts." };
    const end = to > today ? today : to;
    return { from, to: end, days: daysBetween(from, end) + 1 };
  }, [mode, month, from, to, today, thisMonth]);

  const presets: { label: string; apply: () => void }[] = [
    { label: "Last 7 days", apply: () => { setMode("range"); setFrom(addDays(today, -6)); setTo(today); } },
    { label: "Last 30 days", apply: () => { setMode("range"); setFrom(addDays(today, -29)); setTo(today); } },
    { label: "This month", apply: () => { setMode("month"); setMonth(thisMonth); } },
    { label: "Last month", apply: () => { setMode("month"); setMonth(prevMonth(thisMonth)); } },
    { label: "Year to date", apply: () => { setMode("range"); setFrom(`${today.slice(0, 4)}-01-01`); setTo(today); } },
  ];

  function launch(body: SyncRunIn) {
    setError(null);
    start.mutate(body, {
      onSuccess: (r) => { setRunId(r.run_id); setParams(body); },
      onError: (e) => setError(errorMessage(e)),
    });
  }
  const formBody = (dry: boolean): SyncRunIn =>
    mode === "month"
      ? { month, dry_run: dry, retry_failed: retryFailed }
      : { date_from: from, date_to: to, dry_run: dry, retry_failed: retryFailed };

  const r = run.data;
  const finished = !!r && r.status !== "running";
  const canImportAfterPreview = finished && r.dry_run && r.status !== "failed" && r.stats.would_process > 0 && !!params;
  const canContinue = finished && !r.dry_run && r.status === "partial" && !!params;
  const hasIssues = finished && !r.dry_run && (r.stats.failed > 0 || r.stats.needs_review > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Import Spectrum visits" description="Load visits and reports from the Spectrum portal as draft entries." className="md:w-[min(92vw,40rem)]">
        <DialogBody className="space-y-4">
          {runId === null ? (
            <>
              {busy && (
                <Alert kind="warning" title="A sync is already running">
                  Wait for it to finish, then start this import. Progress is shown on the registry page.
                </Alert>
              )}
              {error && <Alert kind="error" title="Could not start the import">{error}</Alert>}

              <div>
                <p className="mb-1.5 text-[13px] font-semibold text-ink-heading">Quick choices</p>
                <div className="flex flex-wrap gap-2">
                  {presets.map((p) => (
                    <button key={p.label} type="button" onClick={p.apply}
                      className="h-8 rounded-full border border-line bg-white px-3 text-xs font-semibold text-ink-heading hover:bg-ivory">
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div role="group" aria-label="What to import" className="inline-flex rounded-ctl border border-line bg-ivory p-1">
                {([["month", "A month"], ["range", "Custom date range"]] as const).map(([v, label]) => (
                  <button key={v} type="button" aria-pressed={mode === v} onClick={() => setMode(v)}
                    className={`h-9 rounded-md px-3.5 text-sm font-medium transition-colors ${mode === v ? "bg-white text-ink-heading shadow-sm" : "text-ink-muted hover:text-ink-heading"}`}>
                    {label}
                  </button>
                ))}
              </div>

              {mode === "month" ? (
                <Field label="Month" htmlFor="sync-month" hint="Every day of the month up to today is read.">
                  <Input id="sync-month" type="month" max={thisMonth} value={month} onChange={(e) => setMonth(e.target.value)} placeholder="YYYY-MM" />
                </Field>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="From date" htmlFor="sync-from"><Input id="sync-from" type="date" max={today} value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
                  <Field label="To date" htmlFor="sync-to"><Input id="sync-to" type="date" max={today} value={to} onChange={(e) => setTo(e.target.value)} /></Field>
                </div>
              )}

              {win.error ? (
                <p role="alert" className="text-sm font-medium text-danger">{win.error}</p>
              ) : (
                <p className="flex items-center gap-2 text-sm text-ink-muted" aria-live="polite">
                  <CalendarRange className="h-4 w-4 shrink-0" aria-hidden />
                  Reads {rangeLabel(win.from!, win.to!)} ({win.days} {win.days === 1 ? "day" : "days"}), one day at a time.
                </p>
              )}
              {!win.error && (win.days ?? 0) > 31 && (
                <Alert kind="info" title="Large range">
                  Each patient is fetched in its own portal session, so this can take a long time. One run handles up to the configured
                  maximum of entries; if it stops early, use <b>Continue</b> afterwards and it picks up where it left off.
                </Alert>
              )}

              <label className="flex items-start gap-3 rounded-ctl border border-line/80 p-3">
                <Switch label="Also retry visits that used all their attempts" checked={retryFailed} onCheckedChange={setRetryFailed} className="mt-0.5" />
                <span className="text-sm">
                  <span className="block font-semibold text-ink-heading">Also retry visits that gave up</span>
                  <span className="text-[13px] text-ink-muted">Visits that failed too many times are skipped by default. Turn this on to try them again.</span>
                </span>
              </label>

              <Alert kind="info" title="What happens">
                New visits become <b>draft</b> entries with their report attached. Visits already imported, or already in the registry with a report,
                are skipped, so running a range twice never creates duplicates. Anything that fails is kept for retry or review.
              </Alert>
            </>
          ) : !r ? (
            <Spinner label="Starting" />
          ) : (
            <div className="space-y-4" aria-live="polite">
              <div className="flex flex-wrap items-center gap-3">
                <RunStatusPill status={r.status} dry={r.dry_run} />
                <span className="text-sm text-ink-muted">{rangeLabel(r.date_from, r.date_to)}</span>
              </div>
              {r.status === "running" && (
                <Alert kind="info" title={r.dry_run ? "Counting visits…" : "Importing…"}>
                  This runs on the server. You can close this window; progress stays visible on the registry page.
                </Alert>
              )}
              {finished && r.dry_run && r.status !== "failed" && (
                <Alert kind={r.stats.would_process ? "success" : "info"} title={r.stats.would_process ? `${r.stats.would_process} visits would be imported` : "Nothing to import"}>
                  {r.stats.would_process ? "Nothing was saved. Start the import to bring them in." : "Everything in this range is already in the registry."}
                </Alert>
              )}
              {finished && r.message && <Alert kind={r.status === "failed" ? "error" : "warning"} title={r.status === "failed" ? "The run stopped" : "Note"}>{r.message}</Alert>}
              {finished && !r.dry_run && r.status !== "failed" && !r.message && (
                <Alert kind={hasIssues ? "warning" : "success"} title={hasIssues ? "Finished, some visits need attention" : "Import finished"}>
                  {hasIssues ? "Failed visits are retried by the daily run; ones needing review are listed in Sync activity." : "All visits in this range are in the registry as drafts."}
                </Alert>
              )}
              <StatTiles stats={r.stats} dry={r.dry_run} />
              <p className="text-xs text-ink-muted">Range {formatDate(r.date_from)} to {formatDate(r.date_to)} · {r.stats.windows} {r.stats.windows === 1 ? "day" : "days"} read so far</p>
            </div>
          )}
        </DialogBody>

        <DialogFooter>
          {runId === null ? (
            <>
              <Button onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button disabled={!!win.error || busy} loading={start.isPending && !!params === false && start.variables?.dry_run === true} onClick={() => launch(formBody(true))}>
                <FlaskConical className="h-4 w-4" aria-hidden />Preview count
              </Button>
              <Button variant="primary" disabled={!!win.error || busy} loading={start.isPending && start.variables?.dry_run === false} onClick={() => launch(formBody(false))}>
                <Play className="h-4 w-4" aria-hidden />Start import
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => { setRunId(null); setError(null); }}>New range</Button>
              {hasIssues && <Button onClick={() => { onOpenChange(false); onOpenActivity(); }}>Review issues</Button>}
              {canContinue && params && (
                <Button variant="primary" loading={start.isPending} disabled={busy} onClick={() => launch({ ...params, dry_run: false })}>
                  <RotateCcw className="h-4 w-4" aria-hidden />Continue import
                </Button>
              )}
              {canImportAfterPreview && params && r && (
                <Button variant="primary" loading={start.isPending} disabled={busy} onClick={() => launch({ ...params, dry_run: false })}>
                  <Play className="h-4 w-4" aria-hidden />Import these {r.stats.would_process} visits
                </Button>
              )}
              <Button onClick={() => onOpenChange(false)}>Close</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}