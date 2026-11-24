"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ClipboardList, Loader2, RefreshCw } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Pill } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { PageHeader, Skeleton } from "@/components/ui/misc";
import { relativeTime } from "@/lib/format";
import { useSyncAvailable, useSyncOverview, type SyncItemFilter } from "../api";
import { TRIGGER_LABEL, effectiveStatus, labelFor, rangeLabel, summaryText } from "../sync-utils";
import { RegistryNav } from "./RegistryNav";
import { SyncActivity, type ActivityTab } from "./SyncActivity";
import { SyncImportCard } from "./SyncImportCard";
import { RunStatusPill, StatTiles } from "./sync-ui";

/** Registry tab "Lab sync" (admins): status of the automatic lab-portal import, loading past data, and what needs attention. */
export function LabSyncView() {
  const { isAdmin, lab, ready } = useSyncAvailable();
  const { runs, live, last, failedTotal, reviewTotal, attention } = useSyncOverview(isAdmin && !!lab);
  const [tab, setTab] = useState<ActivityTab>("visits");
  const [filter, setFilter] = useState<SyncItemFilter>("failed");
  const activityRef = useRef<HTMLDivElement>(null);

  function review() {
    setTab("visits");
    setFilter(failedTotal ? "failed" : reviewTotal ? "needs_review" : "done");
    activityRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <>
      <PageHeader
        title="Lab sync"
        description="Visits and reports pulled automatically from lab portals as draft entries. Load any past period here."
        actions={lab && (
          <Link href={`/patient_registry?partner_key=${lab.key}&status=draft`} className={buttonStyles({ variant: "secondary" })}>
            <ClipboardList className="h-4 w-4" aria-hidden />Synced drafts
          </Link>
        )}
      />
      <RegistryNav />

      {!isAdmin ? (
        <Alert kind="warning" title="Admins only">Ask an admin to manage the lab sync.</Alert>
      ) : !ready ? (
        <Skeleton className="h-32 rounded-card" />
      ) : !lab ? (
        <Alert kind="info" title="No lab with automatic sync">No laboratory with an automatic portal import is enabled for the patient registry.</Alert>
      ) : (
        <div className="space-y-5">
          <Card>
            <CardBody className="space-y-4">
              <div className="flex flex-wrap items-start gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-nav/10 text-slate-nav">
                  {live ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <RefreshCw className="h-5 w-5" aria-hidden />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-[15px] font-semibold">{live ? (live.dry_run ? "Counting visits" : "Sync running") : "Last run"}</h2>
                    <Pill className="border-slate-nav/20 bg-slate-nav/10 text-slate-nav">{lab.name}</Pill>
                  </div>
                  {live ? (
                    <p className="mt-1 text-sm text-ink-muted">{rangeLabel(live.date_from, live.date_to)} · started {relativeTime(live.started_at)}</p>
                  ) : last ? (
                    <div className="mt-1.5 space-y-1">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
                        <RunStatusPill status={effectiveStatus(last)} dry={last.dry_run} />
                        <span className="text-ink-muted">
                          {TRIGGER_LABEL[last.trigger] ?? labelFor({}, last.trigger)} · {rangeLabel(last.date_from, last.date_to)} · {relativeTime(last.finished_at ?? last.started_at)}
                        </span>
                      </div>
                      <p className="text-sm text-ink-muted">{summaryText(last.stats, last.dry_run)}</p>
                      {last.message && <p className="text-[13px] text-ink">{last.message}</p>}
                    </div>
                  ) : runs.isLoading ? (
                    <Skeleton className="mt-2 h-5 w-64" />
                  ) : runs.error ? (
                    <p className="mt-1 text-sm text-danger">Could not load the sync status.</p>
                  ) : (
                    <p className="mt-1 text-sm text-ink-muted">No sync has run yet. Import a past period below, or wait for the daily run.</p>
                  )}
                </div>
              </div>
              {live && <div role="status" aria-live="polite"><StatTiles stats={live.stats} dry={live.dry_run} /></div>}
            </CardBody>
          </Card>

          {attention > 0 && (
            <Alert kind="warning" title={`${attention} ${attention === 1 ? "visit needs" : "visits need"} attention`}
              action={<Button size="sm" onClick={review}>Review</Button>}>
              {[failedTotal ? `${failedTotal} failed (retried automatically, or retry now)` : "", reviewTotal ? `${reviewTotal} waiting for a person to check a possible duplicate` : ""].filter(Boolean).join(" · ")}
            </Alert>
          )}

          <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
            <SyncImportCard busy={!!live} onReview={review} />
            <div ref={activityRef} className="scroll-mt-24">
              <SyncActivity tab={tab} onTab={setTab} filter={filter} onFilter={setFilter} busy={!!live} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}