"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarRange, History, Loader2, RefreshCw } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/misc";
import { usePartners } from "@/core/shell/tiles";
import { relativeTime } from "@/lib/format";
import { prKeys, useSyncItems, useSyncRuns, type SyncItemFilter } from "../api";
import { SPECTRUM_KEY, TRIGGER_LABEL, effectiveStatus, labelFor, rangeLabel, runIsLive, summaryText } from "../sync-utils";
import { SyncActivityDialog } from "./SyncActivityDialog";
import { SyncRunDialog } from "./SyncRunDialog";
import { RunStatusPill, StatTiles } from "./sync-ui";

/**
 * Admin-only strip on top of the Patient Registry: status of the Spectrum auto-sync, live progress, anything that
 * needs attention, and the entry points to import past data and to review the sync activity.
 */
export function SpectrumSyncPanel({ onShowDrafts }: { onShowDrafts: () => void }) {
  const qc = useQueryClient();
  const { data: partners } = usePartners("patient_registry");
  const enabled = !!partners?.some((p) => p.key === SPECTRUM_KEY);
  const runs = useSyncRuns(enabled, 10);
  const failed = useSyncItems("failed", enabled, 1);
  const review = useSyncItems("needs_review", enabled, 1);
  const [runOpen, setRunOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [activityStatus, setActivityStatus] = useState<SyncItemFilter>("failed");

  const live = runs.data?.find(runIsLive);
  const last = runs.data?.find((r) => !runIsLive(r));
  const failedTotal = failed.data?.total ?? 0;
  const reviewTotal = review.data?.total ?? 0;
  const attention = failedTotal + reviewTotal;

  // When a run ends, the entry list and the sync lists are stale: refresh them.
  const liveId = live?.id ?? null;
  const prevLive = useRef<string | null>(null);
  useEffect(() => {
    if (prevLive.current && !liveId) {
      void qc.invalidateQueries({ queryKey: ["pr", "entries"] });
      void qc.invalidateQueries({ queryKey: prKeys.syncAll });
    }
    prevLive.current = liveId;
  }, [liveId, qc]);

  if (!enabled) return null;

  function openActivity(status: SyncItemFilter) {
    setActivityStatus(status);
    setActivityOpen(true);
  }

  return (
    <>
      <Card className="mb-5 overflow-hidden">
        <div className="flex flex-wrap items-start gap-4 p-4 md:p-5">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-nav/10 text-slate-nav"><RefreshCw className="h-5 w-5" aria-hidden /></span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[15px] font-semibold">Spectrum auto-sync</h2>
            <p className="mt-0.5 max-w-2xl text-[13px] text-ink-muted">
              Visits and reports are pulled from the Spectrum portal as draft entries by the daily run, and on demand. Visits already imported are never entered twice.
            </p>
            {last ? (
              <div className="mt-3 space-y-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
                  <span className="font-semibold text-ink-heading">Last run</span>
                  <RunStatusPill status={effectiveStatus(last)} dry={last.dry_run} />
                  <span className="text-ink-muted">
                    {TRIGGER_LABEL[last.trigger] ?? labelFor({}, last.trigger)} · {rangeLabel(last.date_from, last.date_to)} · {relativeTime(last.finished_at ?? last.started_at)}
                  </span>
                </div>
                <p className="text-sm text-ink-muted">{summaryText(last.stats, last.dry_run)}</p>
                {last.message && <p className="text-[13px] text-ink">{last.message}</p>}
              </div>
            ) : runs.isLoading ? (
              <Skeleton className="mt-3 h-5 w-64" />
            ) : runs.error ? (
              <p className="mt-3 text-sm text-danger">Could not load the sync status.</p>
            ) : (
              <p className="mt-3 text-sm text-ink-muted">No sync has run yet. Use Import past data to bring visits in.</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary" onClick={() => setRunOpen(true)}><CalendarRange className="h-4 w-4" aria-hidden />Import past data</Button>
            <Button onClick={() => openActivity(failedTotal ? "failed" : reviewTotal ? "needs_review" : "done")}>
              <History className="h-4 w-4" aria-hidden />Sync activity
              {attention > 0 && <span className="rounded-full bg-warn px-1.5 text-xs font-semibold text-white" aria-label={`${attention} need attention`}>{attention}</span>}
            </Button>
            <Button variant="ghost" onClick={onShowDrafts}>Show Spectrum drafts</Button>
          </div>
        </div>

        {live && (
          <div className="space-y-3 border-t border-line/70 bg-info-soft/40 px-4 py-3.5 md:px-5" role="status" aria-live="polite">
            <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-info">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              {live.dry_run ? "Counting visits" : "Sync running"} · {rangeLabel(live.date_from, live.date_to)} · started {relativeTime(live.started_at)}
            </p>
            <StatTiles stats={live.stats} dry={live.dry_run} />
          </div>
        )}

        {attention > 0 && (
          <div className="border-t border-line/70 p-4 md:px-5">
            <Alert kind="warning" title={`${attention} ${attention === 1 ? "visit needs" : "visits need"} attention`}
              action={<Button size="sm" onClick={() => openActivity(failedTotal ? "failed" : "needs_review")}>Review</Button>}>
              {[failedTotal ? `${failedTotal} failed (retried automatically, or retry now)` : "", reviewTotal ? `${reviewTotal} waiting for a person to check a possible duplicate` : ""].filter(Boolean).join(" · ")}
            </Alert>
          </div>
        )}
      </Card>

      <SyncRunDialog open={runOpen} onOpenChange={setRunOpen} busy={!!live} onOpenActivity={() => openActivity(failedTotal ? "failed" : reviewTotal ? "needs_review" : "done")} />
      <SyncActivityDialog open={activityOpen} onOpenChange={setActivityOpen} initialStatus={activityStatus} busy={!!live} />
    </>
  );
}