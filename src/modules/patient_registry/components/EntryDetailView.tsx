"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Download, FileText, RefreshCw, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { StatusPill } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton } from "@/components/ui/misc";
import { EntryForm } from "@/components/entry-form/entry-form";
import { toFormValues, toPatchPayload, type FormValues } from "@/components/entry-form/entry-fields";
import { PdfPreview } from "@/components/pdf-preview";
import { ApiError, downloadFile, errorMessage } from "@/core/api/client";
import { useAuth } from "@/core/auth/session";
import { useAppConfig } from "@/core/config/provider";
import { usePartners } from "@/core/shell/tiles";
import { formatDate, formatDateTime, formatMoney, humanizeKey } from "@/lib/format";
import { cn } from "@/lib/utils";
import { reportFilePath, useDeleteEntry, useEntry, useFields, usePatchEntry } from "../api";
import { RegistryNav } from "./RegistryNav";

export function EntryDetailView({ id }: { id: string }) {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const { currency } = useAppConfig();
  const { data: partners } = usePartners("patient_registry");
  const { data: entry, isLoading, error, refetch, isFetching } = useEntry(id);
  const { data: fields } = useFields();
  const patch = usePatchEntry(id);
  const del = useDeleteEntry();
  const [stale, setStale] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [reportId, setReportId] = useState<string | null>(null);

  const defaults = useMemo(() => (fields && entry ? toFormValues(fields, entry) : {}), [fields, entry]);
  useEffect(() => { if (entry?.reports.length && !reportId) setReportId(entry.reports[0].id); }, [entry, reportId]);

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-40 rounded-card" /><Skeleton className="h-96 rounded-card" /></div>;
  if (error || !entry)
    return (
      <Alert kind="error" title={(error as ApiError | null)?.status === 404 ? "Entry not found" : "Could not load this entry"}
        action={<Link href="/patient_registry" className={buttonStyles({ size: "sm" })}>Back to entries</Link>}>
        {errorMessage(error)}
      </Alert>
    );

  const labName = partners?.find((p) => p.key === entry.partner_key)?.name ?? entry.partner_name ?? humanizeKey(entry.partner_key);

  function save(values: FormValues) {
    if (!fields || !entry) return;
    const body = toPatchPayload(fields, defaults, values);
    if (!Object.keys(body).length) return toast.info("Nothing to save: no values changed.");
    patch.mutate({ ...body, expected_version: entry.version }, {
      onSuccess: (e) => { setStale(false); toast.success(`Saved · same record, Bill no. ${e.bill_no}`); },
      onError: (e) => {
        if (e instanceof ApiError && e.status === 409) setStale(true);
        else toast.error(errorMessage(e));
      },
    });
  }

  return (
    <>
      <div className="mb-4"><Link href="/patient_registry" className={buttonStyles({ variant: "ghost", size: "sm" })}><ArrowLeft className="h-4 w-4" aria-hidden />All entries</Link></div>
      <RegistryNav />

      <Card className="mb-6 overflow-hidden">
        <div className="grid gap-px bg-line/70 md:grid-cols-[1.2fr_1fr_1fr]">
          <div className="bg-white p-5">
            <p className="text-xs font-semibold text-ink-muted">Bill no.</p>
            <p className="font-display text-4xl font-semibold tabular-nums tracking-tight text-ink-heading">{entry.bill_no ?? "—"}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2"><StatusPill status={entry.status} /><span className="text-sm text-ink-muted">{labName}</span></div>
          </div>
          <div className="bg-white p-5">
            <p className="text-xs font-semibold text-ink-muted">Patient</p>
            <p className="mt-0.5 truncate text-lg font-semibold text-ink-heading">{entry.patient_name}</p>
            <p className="text-sm text-ink-muted">Registered {formatDate(entry.registration_date)}</p>
            {entry.customer_id && (
              <Link href={`/patient_registry/customers/${entry.customer_id}`} className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-nav hover:underline"><UserRound className="h-4 w-4" aria-hidden />Visit history</Link>
            )}
          </div>
          <div className="bg-white p-5">
            <p className="text-xs font-semibold text-ink-muted">Billed amount</p>
            <p className="font-display text-3xl font-semibold tabular-nums text-ink-heading">{formatMoney(entry.net_amount, currency)}</p>
            <p className="text-sm text-ink-muted">
              {entry.gross_amount != null ? `${formatMoney(entry.gross_amount, currency)} − ${formatMoney(entry.discount_amount ?? 0, currency)} discount` : "Add amounts to complete"}
              {isAdmin && entry.margin != null && <span className="block">Margin {formatMoney(entry.margin, currency)}</span>}
            </p>
          </div>
        </div>
      </Card>

      {stale && (
        <Alert kind="warning" title="Someone else changed this entry" className="mb-4"
          action={<Button size="sm" loading={isFetching} onClick={() => refetch().then(() => setStale(false))}><RefreshCw className="h-4 w-4" aria-hidden />Load latest</Button>}>
          Your edits were not saved. Load the latest version, then re-apply them.
        </Alert>
      )}

      <div className={cn("grid gap-6", entry.reports.length && "xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]")}>
        <Card className="min-w-0">
          <CardHeader title="Entry details" description={`Version ${entry.version} · updated ${formatDateTime(entry.updated_at)}`}
            action={isAdmin ? <Button size="sm" variant="danger" onClick={() => setConfirmDelete(true)}><Trash2 className="h-4 w-4" aria-hidden />Delete</Button> : undefined} />
          <CardBody>
            {fields ? (
              <EntryForm fields={fields} defaults={defaults} isAdmin={isAdmin} busy={patch.isPending} requireDirty submitLabel="Save changes"
                onSubmit={save}
                footerNote="Edits update this same record, its Excel row and keep the bill number." />
            ) : <Skeleton className="h-72" />}
          </CardBody>
        </Card>

        {entry.reports.length > 0 && (
          <div className="min-w-0 space-y-4 xl:sticky xl:top-24 xl:self-start">
            <Card>
              <CardHeader title="Stored reports" description="Linked to this entry." />
              <ul className="divide-y divide-line/70">
                {entry.reports.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                    <FileText className="h-5 w-5 shrink-0 text-slate-nav" aria-hidden />
                    <button onClick={() => setReportId(r.id)} className={cn("min-w-0 flex-1 text-left", reportId === r.id && "font-semibold")}>
                      <span className="block truncate text-sm text-ink-heading">{r.filename}</span>
                      <span className="text-xs text-ink-muted">{(r.size / 1024).toFixed(0)} KB · {formatDateTime(r.created_at)}</span>
                    </button>
                    <Button size="icon" variant="ghost" aria-label={`Download ${r.filename}`} onClick={() => downloadFile(reportFilePath(r.id), { download: true }, r.filename).catch((e) => toast.error(errorMessage(e)))}><Download className="h-4 w-4" /></Button>
                  </li>
                ))}
              </ul>
            </Card>
            {reportId && <PdfPreview key={reportId} path={reportFilePath(reportId)} title="Preview" />}
          </div>
        )}
      </div>

      <ConfirmDialog open={confirmDelete} onOpenChange={setConfirmDelete} destructive title="Delete this entry?" confirmLabel="Delete entry" loading={del.isPending}
        description={<>Bill no. <b>{entry.bill_no}</b> for <b>{entry.patient_name}</b> will be removed from the registry and the Excel sheet. The bill number stays retired and is never reused.</>}
        onConfirm={() => del.mutate(id, { onSuccess: () => { toast.success("Entry deleted"); router.replace("/patient_registry"); }, onError: (e) => toast.error(errorMessage(e)) })} />
    </>
  );
}
