"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, RefreshCw, Save } from "lucide-react";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { StatusPill } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/misc";
import { Switch } from "@/components/ui/switch";
import { BillTag } from "@/components/bill-tag";
import { ApiError, errorMessage, saveBlob } from "@/core/api/client";
import { useAuth } from "@/core/auth/session";
import { useAppConfig } from "@/core/config/provider";
import { formatAge, formatDate, formatMoney } from "@/lib/format";
import { emailSpectrumBill, renderSpectrumFile, useEntryBill, useSaveBillData } from "../api";
import { centsToString, fromServer, parseCents, rowsFromEntry, rowsToPayload, sameRows, sumCents, validateRows, type BillRow } from "../bill-utils";
import type { BillDataPatch, Delivery, EntryBill, SpectrumRenderIn } from "../types";
import { BillPreview } from "./BillPreview";
import { BillRowsEditor } from "./BillRowsEditor";
import { DeliveryButtons } from "./DeliveryButtons";

type DiscountMode = "saved" | "none" | "custom";
interface Preview { url: string; blob: Blob; filename: string; key: string }

export function SpectrumBillView({ id }: { id: string }) {
  const { user } = useAuth();
  const { currency } = useAppConfig();
  const { data: entry, isLoading, error, refetch, isFetching } = useEntryBill(id);
  const saveMutation = useSaveBillData(id);

  const [rows, setRows] = useState<BillRow[]>([{ name: "", amount: "" }]);
  const [clientName, setClientName] = useState("");
  const [includeClient, setIncludeClient] = useState(false);
  const [discountMode, setDiscountMode] = useState<DiscountMode>("none");
  const [discountCustom, setDiscountCustom] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const [conflict, setConflict] = useState<string | null>(null);
  const [busy, setBusy] = useState<Delivery | "save" | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const initialised = useRef<string | null>(null);

  // First load of an entry fills the form once; later saves and reloads sync explicitly.
  useEffect(() => {
    if (entry && initialised.current !== entry.id) {
      initialised.current = entry.id;
      setRows(rowsFromEntry(entry));
      setClientName(entry.client_name ?? "");
      setIncludeClient(!!entry.client_name);
    }
  }, [entry]);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview.url); }, [preview]);

  const entryRows = useMemo(() => (entry ? rowsFromEntry(entry) : []), [entry]);
  const check = validateRows(rows);
  const gross = sumCents(rows);
  const savedDiscount = fromServer(entry?.discount_amount) ?? 0;
  const customC = parseCents(discountCustom);
  const discountC = discountMode === "none" ? 0 : discountMode === "custom" ? customC ?? 0 : savedDiscount;
  const discountError =
    discountMode === "custom" && customC === null ? "Enter an amount like 50 or 50.50"
    : discountC > gross ? "The discount cannot be more than the total."
    : undefined;
  const clientError = includeClient && !clientName.trim() ? "Enter the client name, or switch off “Include client name”." : undefined;
  const valid = check.ok && !discountError && !clientError;

  const dirtyRows = entry ? !sameRows(rows, entryRows) : false;
  const dirtyClient = entry ? clientName.trim() !== (entry.client_name ?? "") : false;
  const dirty = dirtyRows || dirtyClient;
  const inputKey = JSON.stringify([rows.map((r) => [r.name.trim(), parseCents(r.amount) ?? r.amount.trim()]), clientName.trim(), includeClient, discountMode, discountC]);

  function syncFrom(e: EntryBill) {
    setRows(rowsFromEntry(e));
    setClientName(e.client_name ?? "");
  }

  /** Saves the amounts and client name when they changed; returns the entry to render from, or null if it failed. */
  async function persist(): Promise<EntryBill | null> {
    if (!entry) return null;
    if (!dirty) return entry;
    const body: BillDataPatch = { expected_version: entry.version };
    if (dirtyRows) Object.assign(body, rowsToPayload(rows));
    if (dirtyClient) body.client_name = clientName.trim() || null;
    try {
      const saved = await saveMutation.mutateAsync(body);
      setConflict(null);
      syncFrom(saved);
      return saved;
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) setConflict(e.message);
      else toast.error(errorMessage(e));
      return null;
    }
  }

  async function saveOnly() {
    setShowErrors(true);
    if (dirtyRows && !check.ok) return void toast.error("Fix the tests and amounts first.");
    if (clientError && dirtyClient && includeClient) return void toast.error(clientError);
    setBusy("save");
    const saved = await persist();
    setBusy(null);
    if (saved && dirty) toast.success("Saved on the entry. Bill number unchanged.");
  }

  async function run(delivery: Delivery) {
    setShowErrors(true);
    if (!entry) return;
    if (!valid) return void toast.error(check.message ?? check.errors.find((e) => e.name || e.amount)?.name ?? discountError ?? clientError ?? "Fix the highlighted fields first.");
    setBusy(delivery);
    try {
      const saved = await persist();
      if (!saved) return;
      const body: Omit<SpectrumRenderIn, "delivery"> = {
        entry_id: saved.id,
        include_client: includeClient,
        ...(discountMode !== "saved" ? { bill_discount_amount: centsToString(discountC) } : {}),
      };
      if (delivery === "email") {
        await emailSpectrumBill(body);
        toast.success(`Bill emailed to ${user?.email ?? "you"}`);
      } else {
        const { blob, filename } = await renderSpectrumFile({ ...body, delivery });
        if (delivery === "download") {
          saveBlob(blob, filename);
          toast.success(`Downloaded ${filename}`);
        } else {
          setPreview({ url: URL.createObjectURL(blob), blob, filename, key: inputKey });
        }
      }
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  async function loadLatest() {
    const r = await refetch();
    if (r.data) {
      syncFrom(r.data);
      setConflict(null);
    }
  }

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-40 rounded-card" /><Skeleton className="h-96 rounded-card" /></div>;
  const back = <Link href="/bill_generator/spectrum" className={buttonStyles({ variant: "ghost", size: "sm" })}><ArrowLeft className="h-4 w-4" aria-hidden />Spectrum bills</Link>;
  if (error || !entry)
    return (
      <>
        <div className="mb-4">{back}</div>
        <Alert kind="error" title={(error as ApiError | null)?.status === 404 ? "Entry not found" : "Could not load this entry"}>{errorMessage(error)}</Alert>
      </>
    );
  if (entry.partner_key !== "spectrum")
    return (
      <>
        <div className="mb-4">{back}</div>
        <Alert kind="warning" title="This is not a Spectrum entry" action={<Link href="/bill_generator" className={buttonStyles({ size: "sm" })}>All labs</Link>}>
          This screen makes Spectrum bills. {entry.partner_name} bills start from the lab’s own PDF.
        </Alert>
      </>
    );

  const missingFinancials = entry.lab_cost == null || entry.gross_amount == null;
  const savedGross = fromServer(entry.gross_amount);
  const totalsDiffer = savedGross !== null && gross !== savedGross && check.ok;

  return (
    <>
      <div className="mb-3 md:mb-4">{back}</div>

      <Card className="mb-5 md:mb-7">
        <CardBody className="p-4 sm:p-6">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <BillTag billNo={entry.bill_no} size="large" className="shrink-0" />
            <h1 className="min-w-0 break-words font-display text-2xl font-semibold tracking-tight text-ink-heading sm:text-[28px]">{entry.patient_name}</h1>
            <StatusPill status={entry.status === "complete" ? "complete" : "draft"} />
          </div>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-muted">
            <p><span className="font-semibold text-ink-heading">Lab</span><span className="mx-2 text-line" aria-hidden>·</span>{entry.partner_name}</p>
            <p><span className="font-semibold text-ink-heading">Registered</span><span className="mx-2 text-line" aria-hidden>·</span>{formatDate(entry.registration_date)}</p>
            <p><span className="font-semibold text-ink-heading">Age / gender</span><span className="mx-2 text-line" aria-hidden>·</span>{[formatAge(entry.age, entry.age_unit), entry.gender].filter((x) => x && x !== "—").join(" / ") || "—"}</p>
            <p><span className="font-semibold text-ink-heading">Referred by</span><span className="mx-2 text-line" aria-hidden>·</span>{entry.referred_by || "—"}</p>
            <p><span className="font-semibold text-ink-heading">Patient ID</span><span className="mx-2 text-line" aria-hidden>·</span>{entry.lab_pid || "—"}</p>
          </div>
        </CardBody>
      </Card>

      {conflict && (
        <Alert kind="warning" title="This entry changed" className="mb-4"
          action={<Button size="sm" loading={isFetching} onClick={() => void loadLatest()}><RefreshCw className="h-4 w-4" aria-hidden />Load latest</Button>}>
          {conflict} Your edits were not saved. Load the latest version, then re-apply them.
        </Alert>
      )}
      {missingFinancials && (
        <Alert kind="warning" title="This entry has no lab cost or billed amount yet" className="mb-4"
          action={<Link href={`/patient_registry/${entry.id}`} className={buttonStyles({ size: "sm" })}>Open entry</Link>}>
          Changing the amounts may be refused until the lab cost and gross amount are filled in the Patient Registry. A bill with the amounts already saved still works.
        </Alert>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader title="Tests and amounts" description="Saved on the entry, so next time you only change what differs." />
            <CardBody className="space-y-5">
              <BillRowsEditor rows={rows} onChange={setRows} errors={showErrors ? check.errors : undefined} message={showErrors ? check.message : undefined} disabled={busy !== null} />
              {totalsDiffer && (
                <Alert kind="info" title="Registry totals stay as they are">
                  The bill prints the total of the amounts above. The entry’s saved gross amount ({formatMoney((savedGross ?? 0) / 100, currency)}) and Excel row are not changed by this screen.
                </Alert>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Options for this bill" />
            <CardBody className="space-y-5">
              <div>
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor="inc-client" className="text-[13px] font-semibold text-ink-heading">Include client name</label>
                  <Switch id="inc-client" label="Include client name on the bill" checked={includeClient} onCheckedChange={setIncludeClient} disabled={busy !== null} />
                </div>
                <div className="mt-3">
                  <Field label="Client name" htmlFor="client-name" error={showErrors ? clientError : undefined} hint="Printed on the bill only when the switch is on. Saved on the entry.">
                    <Input id="client-name" value={clientName} maxLength={120} disabled={busy !== null} invalid={showErrors && !!clientError} onChange={(e) => setClientName(e.target.value)} />
                  </Field>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Discount on this bill" htmlFor="disc-mode" hint="A bill-only change is never stored on the entry.">
                  <Select id="disc-mode" value={discountMode} disabled={busy !== null} onChange={(e) => setDiscountMode(e.target.value as DiscountMode)}>
                    <option value="saved">Use the saved discount ({formatMoney(savedDiscount / 100, currency)})</option>
                    <option value="none">No discount on this bill</option>
                    <option value="custom">A different amount</option>
                  </Select>
                </Field>
                {discountMode === "custom" && (
                  <Field label="Discount amount" htmlFor="disc-custom" error={showErrors ? discountError : undefined}>
                    <Input id="disc-custom" value={discountCustom} inputMode="decimal" placeholder="0" disabled={busy !== null} invalid={showErrors && !!discountError} onChange={(e) => setDiscountCustom(e.target.value)} />
                  </Field>
                )}
              </div>
              {discountMode !== "custom" && showErrors && discountError && <p role="alert" className="text-xs font-medium text-danger">Fix this: {discountError}</p>}

              <dl className="grid gap-3 rounded-card border border-line bg-ivory p-4 sm:grid-cols-3">
                <div><dt className="text-xs font-semibold text-ink-muted">Total</dt><dd className="font-display text-xl font-semibold tabular-nums text-ink-heading">{formatMoney(gross / 100, currency)}</dd></div>
                <div><dt className="text-xs font-semibold text-ink-muted">Discount</dt><dd className="font-display text-xl font-semibold tabular-nums text-ink-heading">{formatMoney(discountC / 100, currency)}</dd></div>
                <div><dt className="text-xs font-semibold text-ink-muted">Payable</dt><dd className="font-display text-xl font-semibold tabular-nums text-ink-heading">{formatMoney(Math.max(gross - discountC, 0) / 100, currency)}</dd></div>
              </dl>
            </CardBody>
          </Card>

          <div className="sticky bottom-0 -mx-4 space-y-3 border-t border-line bg-ivory/95 px-4 py-3 backdrop-blur md:mx-0 md:rounded-b-card md:px-0">
            <DeliveryButtons busy={busy === "save" ? null : busy} disabled={busy === "save"} onRun={(d) => void run(d)} email={user?.email} />
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-ink-muted">{dirty ? "Unsaved changes. They are saved automatically when you preview, download or email." : "Everything is saved."}</p>
              <Button size="sm" variant="slate" loading={busy === "save"} disabled={!dirty || busy !== null} onClick={() => void saveOnly()}><Save className="h-4 w-4" aria-hidden />Save changes</Button>
            </div>
          </div>
        </div>

        <div className="min-w-0 xl:sticky xl:top-6 xl:self-start">
          <BillPreview url={preview?.url ?? null} stale={!!preview && preview.key !== inputKey} loading={busy === "preview"} onDownload={preview ? () => saveBlob(preview.blob, preview.filename) : undefined} />
        </div>
      </div>
    </>
  );
}