"use client";

import { useState } from "react";
import { Download, Mail } from "lucide-react";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogClose, DialogContent, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { ApiError, errorMessage } from "@/core/api/client";
import { useAuth } from "@/core/auth/session";
import { useDownloadReport, useEmailReport } from "../api";
import { describeFilters, type InsightsFilters } from "../filters";
import { DEFAULT_SECTIONS, SECTION_LABELS, type FiltersOut } from "../types";

/** Report actions use the current filters and one shared section selection (PRD 10.7). */
export function ReportSheet({ filters, options, rangeLabel, disabled }: {
  filters: InsightsFilters;
  options?: FiltersOut;
  rangeLabel?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [intent, setIntent] = useState<"download" | "email">("download");
  const { user } = useAuth();
  const download = useDownloadReport();
  const emailReport = useEmailReport();
  const sections: string[] = options?.report_sections ?? [...DEFAULT_SECTIONS];
  const d = describeFilters(filters.state, options);
  const chosen = sections.filter((s) => picked.includes(s));
  const busy = download.isPending || emailReport.isPending;

  function onOpenChange(v: boolean) {
    setOpen(v);
    if (v) {
      setPicked([...sections]);
      download.reset();
      emailReport.reset();
    }
  }

  function toggle(s: string) {
    setPicked((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));
  }

  function run() {
    download.mutate({ filters, sections: chosen }, {
      onSuccess: (name) => {
        toast.success(`Report saved as ${name}`);
        setOpen(false);
      },
    });
  }

  function send() {
    emailReport.mutate({ filters, sections: chosen }, {
      onSuccess: () => {
        toast.success(`Report emailed to ${user?.email}`);
        setOpen(false);
      },
    });
  }

  const downloadStatus = download.error instanceof ApiError ? download.error.status : 0;
  const emailStatus = emailReport.error instanceof ApiError ? emailReport.error.status : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <div className="flex flex-wrap gap-2">
        <DialogTrigger asChild>
          <Button variant="primary" disabled={disabled || !filters.ready} onClick={() => setIntent("download")}>
            <Download className="size-4" aria-hidden />
            Download report
          </Button>
        </DialogTrigger>
        <DialogTrigger asChild>
          <Button variant="secondary" disabled={disabled || !filters.ready || !user?.email} onClick={() => setIntent("email")}>
            <Mail className="size-4" aria-hidden />
            Email me a copy
          </Button>
        </DialogTrigger>
      </div>
      <DialogContent
        title={intent === "email" ? "Email business report" : "Download business report"}
        description={intent === "email"
          ? `A PDF of these numbers will be sent to ${user?.email}. The report is generated on request and is not stored.`
          : "A PDF of these numbers. It is generated on request and is not stored."}
      >
        <DialogBody className="space-y-4">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            <dt className="text-ink-muted">Period</dt><dd className="font-medium text-ink-heading">{rangeLabel ?? d.period}</dd>
            <dt className="text-ink-muted">Labs</dt><dd className="font-medium text-ink-heading">{d.labs}</dd>
            <dt className="text-ink-muted">Compare</dt><dd className="font-medium text-ink-heading">{d.compare}</dd>
          </dl>
          <fieldset>
            <legend className="mb-1.5 text-[13px] font-semibold text-ink-heading">Sections to include</legend>
            <div className="space-y-1">
              {sections.map((s) => (
                <label key={s} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-ctl px-2 text-sm hover:bg-ivory">
                  <input type="checkbox" className="size-4 accent-slate-nav" checked={picked.includes(s)} onChange={() => toggle(s)} />
                  {SECTION_LABELS[s] ?? s}
                </label>
              ))}
            </div>
            {chosen.length === 0 && <p role="alert" className="mt-1.5 text-xs font-medium text-danger">Fix this: choose at least one section.</p>}
            <p className="mt-2 text-xs text-ink-muted">A Notes page with data notes is always added at the end.</p>
          </fieldset>
          {intent === "email" && (
            <p className="rounded-ctl border border-line bg-ivory px-3 py-2 text-sm text-ink">
              This report will be emailed to <span className="font-semibold text-ink-heading">{user?.email}</span>.
            </p>
          )}
          {download.isError && (
            <Alert kind={downloadStatus === 429 ? "warning" : "error"} title={downloadStatus === 429 ? "Too many reports" : downloadStatus === 403 ? "Admin access only" : "Could not make the report"}>
              {errorMessage(download.error)}
            </Alert>
          )}
          {emailReport.isError && (
            <Alert kind={emailStatus === 429 ? "warning" : "error"} title={emailStatus === 429 ? "Too many reports" : emailStatus === 403 ? "Admin access only" : "Could not send the report"}>
              {errorMessage(emailReport.error)}
            </Alert>
          )}
        </DialogBody>
        <DialogFooter>
          <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
          {intent === "email" ? (
            <Button variant="primary" loading={emailReport.isPending} disabled={busy || chosen.length === 0 || !filters.ready || !user?.email} onClick={send}>
              <Mail className="size-4" aria-hidden />
              Email report
            </Button>
          ) : (
            <Button variant="primary" loading={download.isPending} disabled={busy || chosen.length === 0 || !filters.ready} onClick={run}>
              <Download className="size-4" aria-hidden />
              Download PDF
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}