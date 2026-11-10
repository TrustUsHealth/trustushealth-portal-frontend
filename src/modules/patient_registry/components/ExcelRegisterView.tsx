"use client";

import { useMemo, useState } from "react";
import { CalendarClock, Download, FileSpreadsheet, Lock, Send } from "lucide-react";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Select } from "@/components/ui/input";
import { EmptyState, PageHeader, Spinner } from "@/components/ui/misc";
import { ApiError, errorMessage } from "@/core/api/client";
import { useAuth } from "@/core/auth/session";
import { formatDateTime } from "@/lib/format";
import { useRequestAccess } from "@/modules/access/api";
import { downloadWorkbook, useSendWorkbook, useWorkbooks } from "../api";
import { RegistryNav } from "./RegistryNav";

export function ExcelRegisterView() {
  const { isAdmin } = useAuth();
  const { data, isLoading, error } = useWorkbooks(true);
  const send = useSendWorkbook();
  const request = useRequestAccess();
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const [downloading, setDownloading] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const years = useMemo(() => [...new Set([thisYear, ...(data ?? []).map((w) => w.year)])].sort((a, b) => b - a), [data, thisYear]);
  const current = data?.find((w) => w.year === year);
  const forbidden = error instanceof ApiError && error.status === 403;

  async function download() {
    setDownloading(true);
    try {
      const name = await downloadWorkbook(year);
      toast.success(`Downloaded ${name}`);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setDownloading(false);
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
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <Card>
            <CardHeader title="Workbook" description="Pick a year, then download it or email it to the register recipients." />
            <CardBody className="space-y-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <label className="block w-full sm:w-44">
                  <span className="mb-1.5 block text-[13px] font-semibold text-ink-heading">Year</span>
                  <Select value={year} onChange={(e) => setYear(Number(e.target.value))}>{years.map((y) => <option key={y} value={y}>{y}</option>)}</Select>
                </label>
                <Button variant="primary" loading={downloading} onClick={download}><Download className="h-4 w-4" aria-hidden />Download now</Button>
                {isAdmin && <Button onClick={() => setConfirm(true)}><Send className="h-4 w-4" aria-hidden />Send now</Button>}
              </div>
              <div className="flex items-center gap-4 rounded-card border border-line bg-ivory p-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-ok text-white"><FileSpreadsheet className="h-6 w-6" aria-hidden /></span>
                <div className="min-w-0 text-sm">
                  <p className="truncate font-semibold text-ink-heading">{current?.filename ?? `TrustUs_Patient_Registry_${year}.xlsx`}</p>
                  {current ? (
                    <p className="text-ink-muted">Version {current.version} · {(current.size / 1024).toFixed(0)} KB · updated {formatDateTime(current.updated_at)}{current.last_sent_month ? ` · last emailed for ${current.last_sent_month}` : ""}</p>
                  ) : <p className="text-ink-muted">Created automatically when the first complete entry of the year is saved. Download now builds it fresh.</p>}
                </div>
              </div>
            </CardBody>
          </Card>
          <Card className="self-start">
            <CardHeader title="How the register works" />
            <CardBody>
              <ul className="space-y-3 text-sm text-ink">
                <li className="flex gap-3"><CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-slate-nav" aria-hidden />On the 1st of every month at 6:00 AM IST the workbook is emailed to the register recipients.</li>
                <li className="flex gap-3"><FileSpreadsheet className="mt-0.5 h-4 w-4 shrink-0 text-slate-nav" aria-hidden />Only <b>complete</b> entries (name, registration date and billed amount) get a row. Drafts wait for amounts.</li>
                <li className="flex gap-3"><FileSpreadsheet className="mt-0.5 h-4 w-4 shrink-0 text-slate-nav" aria-hidden />The month sheet follows the registration date, so back-dated entries land in the right month.</li>
              </ul>
            </CardBody>
          </Card>
        </div>
      )}
      <ConfirmDialog open={confirm} onOpenChange={setConfirm} title={`Email the ${year} register now?`} confirmLabel="Send workbook" loading={send.isPending}
        description="The current workbook goes to the configured register recipients. This is in addition to the automatic monthly email."
        onConfirm={() => send.mutate(year, { onSuccess: (r) => { toast.success(`Sent to ${r.sent} recipient${r.sent === 1 ? "" : "s"}`); setConfirm(false); }, onError: (e) => { toast.error(errorMessage(e)); setConfirm(false); } })} />
    </>
  );
}
