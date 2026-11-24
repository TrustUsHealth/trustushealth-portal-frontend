"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Download, ExternalLink, FileText, RotateCcw, Search } from "lucide-react";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Pill } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogBody, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { EmptyState, Skeleton } from "@/components/ui/misc";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { downloadFile, errorMessage } from "@/core/api/client";
import type { SyncItem, SyncRun } from "@/core/api/types";
import { formatDate, formatDateTime, relativeTime } from "@/lib/format";
import { reportFilePath, useStartSync, useSyncItems, useSyncRuns, type SyncItemFilter } from "../api";
import {
  OUTCOME_HINT, OUTCOME_LABEL, SPECTRUM_KEY, TRIGGER_LABEL, WARNING_LABEL, daysBetween, effectiveStatus, formatDuration, labelFor,
  rangeLabel, runIsLive, summaryText,
} from "../sync-utils";
import { ItemStatusPill, RunStatusPill } from "./sync-ui";

type Tab = "visits" | "runs";
const FILTERS: { value: SyncItemFilter; label: string }[] = [
  { value: "failed", label: "Failed" },
  { value: "needs_review", label: "Needs review" },
  { value: "done", label: "Done" },
  { value: "all", label: "All" },
];
const GUIDE: Partial<Record<SyncItemFilter, { kind: "warning" | "info"; title: string; text: string }>> = {
  failed: {
    kind: "warning",
    title: "Visits that could not be completed",
    text: "Each one is retried automatically by the daily run until it has used all its attempts. Use Retry to try again now, including ones that gave up.",
  },
  needs_review: {
    kind: "info",
    title: "Visits waiting for a person",
    text: "The report is stored, but a similar patient already exists, so no entry was created. Open the registry for that date and decide, or download the report and add it through New entry.",
  },
};

/** Ledger of visits (what was imported, what failed, what needs staff) and the list of runs of every kind. */
export function SyncActivityDialog({
  open, onOpenChange, initialStatus, busy,
}: { open: boolean; onOpenChange: (o: boolean) => void; initialStatus: SyncItemFilter; busy: boolean }) {
  const [tab, setTab] = useState<Tab>("visits");
  const [filter, setFilter] = useState<SyncItemFilter>(initialStatus);
  const [retrying, setRetrying] = useState<string | null>(null);
  const items = useSyncItems(filter === "all" ? undefined : filter, open, 100);
  const runs = useSyncRuns(open, 20);
  const start = useStartSync();

  useEffect(() => {
    if (open) { setTab("visits"); setFilter(initialStatus); }
  }, [open, initialStatus]);

  function launch(key: string, body: Parameters<typeof start.mutate>[0], okText: string) {
    setRetrying(key);
    start.mutate(body, {
      onSuccess: () => { toast.success(okText); onOpenChange(false); },
      onError: (e) => toast.error(errorMessage(e)),
      onSettled: () => setRetrying(null),
    });
  }

  const list = items.data?.items ?? [];
  // "Retry all failed" is only offered when every failed visit is on screen and the dates fit one run (max a year).
  const failedSpan = useMemo(() => {
    if (filter !== "failed" || !list.length || list.length !== items.data?.total) return null;
    const dates = list.map((i) => i.sid_date).sort();
    return daysBetween(dates[0], dates[dates.length - 1]) <= 366 ? { from: dates[0], to: dates[dates.length - 1] } : null;
  }, [filter, list, items.data?.total]);

  const guide = GUIDE[filter];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Spectrum sync activity" description="Every visit the sync has seen, and every run: scheduled, admin, cron and command line." className="md:w-[min(94vw,62rem)]">
        <DialogBody>
          <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
            <TabsList className="w-fit">
              <TabsTrigger value="visits">Visits</TabsTrigger>
              <TabsTrigger value="runs">Runs</TabsTrigger>
            </TabsList>

            <TabsContent value="visits" className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div role="group" aria-label="Visit status" className="inline-flex rounded-ctl border border-line bg-ivory p-1">
                  {FILTERS.map((f) => (
                    <button key={f.value} type="button" aria-pressed={filter === f.value} onClick={() => setFilter(f.value)}
                      className={`h-9 rounded-md px-3.5 text-sm font-medium transition-colors ${filter === f.value ? "bg-white text-ink-heading shadow-sm" : "text-ink-muted hover:text-ink-heading"}`}>
                      {f.label}
                    </button>
                  ))}
                </div>
                {failedSpan && (
                  <Button size="sm" variant="primary" disabled={busy} loading={retrying === "all"}
                    onClick={() => launch("all", { date_from: failedSpan.from, date_to: failedSpan.to, retry_failed: true }, "Retrying all failed visits")}>
                    <RotateCcw className="h-4 w-4" aria-hidden />Retry all failed
                  </Button>
                )}
              </div>
              {busy && <Alert kind="info" title="A sync is running">Retries can be started once it has finished.</Alert>}
              {guide && <Alert kind={guide.kind} title={guide.title}>{guide.text}</Alert>}

              {items.error ? (
                <Alert kind="error" title="Could not load visits">{errorMessage(items.error)}</Alert>
              ) : items.isLoading ? (
                <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20" />)}</div>
              ) : !list.length ? (
                <Card><EmptyState icon={Search} title="Nothing here">{filter === "failed" ? "No failed visits. Everything the sync touched went through." : filter === "needs_review" ? "No visits are waiting for review." : "No visits in this list yet."}</EmptyState></Card>
              ) : (
                <>
                  <p className="text-sm text-ink-muted" aria-live="polite">
                    {items.data!.total} {items.data!.total === 1 ? "visit" : "visits"}{items.data!.total > list.length ? `, showing the latest ${list.length}` : ""}
                  </p>
                  <Card className="overflow-hidden">
                    <ul className="divide-y divide-line/70">
                      {list.map((it) => (
                        <ItemRow key={it.source_key} it={it} busy={busy} retrying={retrying === it.source_key}
                          onClose={() => onOpenChange(false)}
                          onRetry={() => launch(it.source_key, { date_from: it.sid_date, date_to: it.sid_date, retry_failed: true }, `Retrying visits of ${formatDate(it.sid_date)}`)} />
                      ))}
                    </ul>
                  </Card>
                </>
              )}
            </TabsContent>

            <TabsContent value="runs" className="space-y-3">
              {runs.error ? (
                <Alert kind="error" title="Could not load runs">{errorMessage(runs.error)}</Alert>
              ) : runs.isLoading ? (
                <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20" />)}</div>
              ) : !runs.data?.length ? (
                <Card><EmptyState icon={Search} title="No runs yet">Use Import past data, or wait for the daily run.</EmptyState></Card>
              ) : (
                <Card className="overflow-hidden">
                  <ul className="divide-y divide-line/70">
                    {runs.data.map((run) => (
                      <RunRow key={run.id} run={run} busy={busy} loading={retrying === run.id}
                        onAgain={() => launch(run.id, { date_from: run.date_from, date_to: run.date_to, dry_run: false, retry_failed: false }, `Started ${rangeLabel(run.date_from, run.date_to)}`)} />
                    ))}
                  </ul>
                </Card>
              )}
              <p className="text-xs text-ink-muted">Runs are kept for 180 days. Running a range again is safe: finished visits are never imported twice.</p>
            </TabsContent>
          </Tabs>
        </DialogBody>
        <DialogFooter><Button onClick={() => onOpenChange(false)}>Close</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ItemRow({ it, busy, retrying, onRetry, onClose }: { it: SyncItem; busy: boolean; retrying: boolean; onRetry: () => void; onClose: () => void }) {
  const hint = it.outcome ? OUTCOME_HINT[it.outcome] : undefined;
  return (
    <li className="flex flex-col gap-2 px-4 py-3.5 md:px-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="font-semibold text-ink-heading">SID {it.sid_no}</span>
        <span className="text-sm text-ink-muted">{formatDate(it.sid_date)}</span>
        <ItemStatusPill status={it.status} />
        {it.attempts > 0 && <span className="text-xs text-ink-muted">{it.attempts} {it.attempts === 1 ? "attempt" : "attempts"}</span>}
        {it.updated_at && <span className="text-xs text-ink-muted sm:ml-auto" title={formatDateTime(it.updated_at)}>{relativeTime(it.updated_at)}</span>}
      </div>
      {it.outcome && <p className="text-sm text-ink">{labelFor(OUTCOME_LABEL, it.outcome)}</p>}
      {hint && <p className="text-[13px] text-ink-muted">{hint}</p>}
      {it.last_error && <p className="break-words rounded-ctl border border-danger/25 bg-danger-soft px-3 py-2 text-[13px] text-danger">{it.last_error}</p>}
      {it.warnings.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {it.warnings.map((w) => <Pill key={w} className="border-warn/30 bg-warn-soft text-warn">{labelFor(WARNING_LABEL, w)}</Pill>)}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {it.entry_id && (
          <Link href={`/patient_registry/${it.entry_id}`} onClick={onClose} className="inline-flex h-10 items-center gap-1.5 rounded-ctl border border-line bg-white px-3 text-[13px] font-semibold text-ink-heading hover:bg-ivory md:h-8">
            <ExternalLink className="h-4 w-4" aria-hidden />Open entry
          </Link>
        )}
        {it.status === "needs_review" && (
          <Link href={`/patient_registry?partner_key=${SPECTRUM_KEY}&date_from=${it.sid_date}&date_to=${it.sid_date}`} onClick={onClose}
            className="inline-flex h-10 items-center gap-1.5 rounded-ctl border border-line bg-white px-3 text-[13px] font-semibold text-ink-heading hover:bg-ivory md:h-8">
            <Search className="h-4 w-4" aria-hidden />Entries of {formatDate(it.sid_date)}
          </Link>
        )}
        {it.report_ref && (
          <Button size="sm" onClick={() => downloadFile(reportFilePath(it.report_ref!), { download: true }, `spectrum_${it.sid_no}.pdf`).catch((e) => toast.error(errorMessage(e)))}>
            {it.status === "needs_review" ? <Download className="h-4 w-4" aria-hidden /> : <FileText className="h-4 w-4" aria-hidden />}Report
          </Button>
        )}
        {it.status === "failed" && (
          <Button size="sm" variant="primary" disabled={busy} loading={retrying} onClick={onRetry} title="Retries every pending visit of this date">
            <RotateCcw className="h-4 w-4" aria-hidden />Retry
          </Button>
        )}
      </div>
    </li>
  );
}

function RunRow({ run, busy, loading, onAgain }: { run: SyncRun; busy: boolean; loading: boolean; onAgain: () => void }) {
  const live = runIsLive(run);
  return (
    <li className="flex flex-col gap-1.5 px-4 py-3.5 md:px-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <RunStatusPill status={effectiveStatus(run)} dry={run.dry_run} />
        <span className="font-semibold text-ink-heading">{rangeLabel(run.date_from, run.date_to)}</span>
        <span className="text-sm text-ink-muted">{TRIGGER_LABEL[run.trigger] ?? labelFor({}, run.trigger)}</span>
        <span className="text-xs text-ink-muted sm:ml-auto" title={formatDateTime(run.started_at)}>
          Started {relativeTime(run.started_at)}{run.finished_at ? ` · took ${formatDuration(run.started_at, run.finished_at)}` : ""}
        </span>
      </div>
      <p className="text-sm text-ink-muted">{summaryText(run.stats, run.dry_run)}</p>
      {run.message && <p className="text-[13px] text-ink">{run.message}</p>}
      {!live && (
        <div>
          <Button size="sm" disabled={busy} loading={loading} onClick={onAgain}>
            <RotateCcw className="h-4 w-4" aria-hidden />{run.status === "partial" ? "Continue" : run.dry_run ? "Import this range" : "Run again"}
          </Button>
        </div>
      )}
    </li>
  );
}