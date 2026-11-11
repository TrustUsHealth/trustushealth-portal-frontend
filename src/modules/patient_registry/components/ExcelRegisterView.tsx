"use client";

import { useMemo, useState } from "react";
import { CalendarCheck, CalendarClock, Download, FileSpreadsheet, Lock, Send } from "lucide-react";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState, PageHeader, Spinner } from "@/components/ui/misc";
import { ApiError, errorMessage } from "@/core/api/client";
import { useAuth } from "@/core/auth/session";
import { formatDateTime, todayISO } from "@/lib/format";
import { useRequestAccess } from "@/modules/access/api";
import { downloadWorkbook, useSendWorkbook, useWorkbooks } from "../api";
import { RegistryNav } from "./RegistryNav";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function ExcelRegisterView() {
  const { isAdmin } = useAuth();
  const { data, isLoading, error } = useWorkbooks(true);
  const send = useSendWorkbook();
  const request = useRequestAccess();
  const today = todayISO();
  const thisYear = Number(today.slice(0, 4));
  const currentMonth = Number(today.slice(5, 7));
  const [downloading, setDownloading] = useState<number | null>(null);
  const [confirmYear, setConfirmYear] = useState<number | null>(null);

  const years = useMemo(() => [...new Set([thisYear, ...(data ?? []).map((w) => w.year)])].sort((a, b) => b - a), [data, thisYear]);
  const forbidden = error instanceof ApiError && error.status === 403;

  async function download(year: number) {
    setDownloading(year);
    try {
      const name = await downloadWorkbook(year);
      toast.success(`Downloaded ${name}`);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setDownloading(null);
    }
  }

  return (
    <>
      <PageHeader title="Excel register" description="One workbook per year with a sheet for each month. Rebuilt from the database every time, so it is never stale." />
      <RegistryNav />
      {forbidden ? (
        <Card>
          <EmptyState icon={Lock} title="The Excel register is locked for you"
            action={<Button variant="primary" loading={request.isPending} onClick={() => request.mutate({ module: "patient_registry", submodule: "excel_register" }, { onSuccess: () => toast.success("Access requested. An admin will review it."), onError: (e) => toast.error(errorMessage(e)) })}>Request access</Button>}>
            Ask an admin to open it for you. Your entries are not affected.
          </EmptyState>
        </Card>
      ) : isLoading ? <Spinner />
      : error ? <Alert kind="error" title="Could not load the register">{errorMessage(error)}</Alert>
      : (
        <div className="grid gap-5 lg:grid-cols-2">
          {years.map((year) => {
            const workbook = data?.find((item) => item.year === year);
            const lastSentMonth = workbook?.last_sent_month?.startsWith(String(year)) ? Number(workbook.last_sent_month.slice(5, 7)) : 0;
            return (
              <Card key={year}>
                <CardBody>
                  <div className="flex flex-wrap items-start gap-4">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-ok-soft text-ok"><FileSpreadsheet className="h-6 w-6" aria-hidden /></span>
                    <div className="min-w-0 flex-1">
                      <h2 className="font-display text-2xl font-semibold">{year}</h2>
                      <p className="truncate text-sm text-ink-muted">{workbook?.filename ?? `TrustUs_Patient_Registry_${year}.xlsx`}</p>
                    </div>
                    {workbook ? (
                      <span className="rounded-full border border-info/25 bg-info-soft px-2.5 py-1 text-xs font-semibold text-info">Version {workbook.version}</span>
                    ) : (
                      <span className="rounded-full border border-line bg-ivory px-2.5 py-1 text-xs font-semibold text-ink-muted">Created on first download</span>
                    )}
                  </div>

                  <div className="mt-5" role="group" aria-label={`Months of ${year}`}>
                    <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-12 lg:grid-cols-6 xl:grid-cols-12">
                      {MONTHS.map((month, index) => {
                        const sent = index + 1 <= lastSentMonth;
                        const current = year === thisYear && index + 1 === currentMonth;
                        return (
                          <div key={month} title={sent ? `${month}: sent` : current ? `${month}: current month` : month}
                            className={`grid h-11 place-items-center rounded-md border text-[13px] font-medium ${sent ? "border-ok/25 bg-ok-soft text-ok" : current ? "border-slate-nav bg-slate-nav/10 text-slate-nav" : "border-line bg-ivory text-ink-muted"}`}>
                            {month}<span className="sr-only">{sent ? " sent" : current ? " current month" : ""}</span>
                          </div>
                        );
                      })}
                    </div>
                    <p className="mt-2 flex items-center gap-1.5 text-[13px] text-ink-muted">
                      <CalendarCheck className="h-4 w-4" aria-hidden />
                      {workbook?.last_sent_month ? `Last monthly email: ${workbook.last_sent_month}` : "No monthly email sent yet"}
                    </p>
                  </div>

                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div><dt className="text-ink-muted">Size</dt><dd className="font-medium text-ink-heading">{workbook?.size ? `${(workbook.size / 1024).toFixed(0)} KB` : "—"}</dd></div>
                    <div><dt className="text-ink-muted">Last rebuilt</dt><dd className="font-medium text-ink-heading">{workbook?.updated_at ? formatDateTime(workbook.updated_at) : "—"}</dd></div>
                  </dl>

                  <div className="mt-5 flex flex-wrap gap-2.5">
                    <Button variant="secondary" loading={downloading === year} onClick={() => void download(year)}><Download className="h-5 w-5" aria-hidden />Download now</Button>
                    {isAdmin && <Button onClick={() => setConfirmYear(year)}><Send className="h-5 w-5" aria-hidden />Send now</Button>}
                  </div>
                </CardBody>
              </Card>
            );
          })}
          <Card className="self-start">
            <CardHeader title="How the register works" />
            <CardBody>
              <ul className="space-y-3 text-sm text-ink-heading">
                <li className="flex gap-3"><CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-slate-nav" aria-hidden />On the 1st of every month at 6:00 AM IST the workbook is emailed to the register recipients.</li>
                <li className="flex gap-3"><FileSpreadsheet className="mt-0.5 h-4 w-4 shrink-0 text-slate-nav" aria-hidden />Only <b>complete</b> entries (name, registration date and billed amount) get a row. Drafts wait for amounts.</li>
                <li className="flex gap-3"><FileSpreadsheet className="mt-0.5 h-4 w-4 shrink-0 text-slate-nav" aria-hidden />The month sheet follows the registration date, so back-dated entries land in the right month.</li>
              </ul>
            </CardBody>
          </Card>
        </div>
      )}
      {!forbidden && !isLoading && !error && <p className="mt-5 text-sm text-ink-muted">Only complete entries (with a billed amount) appear here. The workbook is also emailed automatically on the 1st of every month at 06:00 IST.</p>}
      <ConfirmDialog open={confirmYear !== null} onOpenChange={(open) => !open && setConfirmYear(null)} title={`Email the ${confirmYear} register now?`} confirmLabel="Send workbook" loading={send.isPending}
        description="The current workbook goes to the configured register recipients. This is in addition to the automatic monthly email."
        onConfirm={() => confirmYear !== null && send.mutate(confirmYear, { onSuccess: (r) => { toast.success(`Sent to ${r.sent} recipient${r.sent === 1 ? "" : "s"}`); setConfirmYear(null); }, onError: (e) => { toast.error(errorMessage(e)); setConfirmYear(null); } })} />
    </>
  );
}
