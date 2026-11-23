"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/misc";
import { ApiError, errorMessage, saveBlob } from "@/core/api/client";
import { useAuth } from "@/core/auth/session";
import { useAppConfig } from "@/core/config/provider";
import { formatAge, formatDate, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { emailMetropolisBill, inspectMetropolis, renderMetropolisFile, useRefreshRegistry } from "../api";
import { centsToString, fromServer, parseCents } from "../bill-utils";
import type { Delivery, LabInspect } from "../types";
import { BillPreview } from "./BillPreview";
import { DeliveryButtons } from "./DeliveryButtons";
import { LabGate } from "./LabGate";
import { PdfUploadZone } from "./PdfUploadZone";

interface Preview { url: string; blob: Blob; filename: string; key: string }

function Flow({ labName }: { labName: string }) {
  const { user } = useAuth();
  const { currency } = useAppConfig();
  const refreshRegistry = useRefreshRegistry();

  const [file, setFile] = useState<File | null>(null);
  const [inspect, setInspect] = useState<LabInspect | null>(null);
  const [inspecting, setInspecting] = useState<string | null>(null);
  const [amounts, setAmounts] = useState<string[]>([]);
  const [labCost, setLabCost] = useState("");
  /** Only used when the lab bill matches several possible entries: an entry id, or "new" for a different patient. */
  const [choice, setChoice] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [busy, setBusy] = useState<Delivery | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview.url); }, [preview]);

  async function onFile(f: File) {
    setInspecting(f.name);
    try {
      const out = await inspectMetropolis(f);
      setFile(f);
      setInspect(out);
      setAmounts(out.rows.map((r) => String(fromServer(r.amount) === null ? "" : centsToString(fromServer(r.amount) ?? 0))));
      setLabCost(fromServer(out.entry_lab_cost) === null ? "" : centsToString(fromServer(out.entry_lab_cost) ?? 0));
      setChoice(null);
      setShowErrors(false);
      setPreview(null);
    } catch (e) {
      toast.error("Could not read that bill", { description: errorMessage(e) });
    } finally {
      setInspecting(null);
    }
  }

  function startOver() {
    setFile(null); setInspect(null); setAmounts([]); setLabCost(""); setChoice(null); setShowErrors(false); setPreview(null);
  }

  if (!inspect || !file)
    return (
      <>
        {inspecting ? (
          <Card><CardBody className="flex flex-col items-center py-14 text-center">
            <Loader2 className="size-10 animate-spin text-brand" aria-hidden />
            <h3 className="mt-4 text-xl font-semibold">Reading {inspecting}</h3>
            <p className="mt-1 text-[15px] text-ink-muted">Nothing is stored. The bill is read in memory.</p>
          </CardBody></Card>
        ) : (
          <PdfUploadZone allowed={["pdf"]} onFile={onFile} title={`Upload the ${labName} bill`} hint={`Drop the lab’s own bill PDF here. Only its amount cells are changed.`} />
        )}
      </>
    );

  // ── derived state ──
  const kind = inspect.match.kind;
  const entryId = kind === "exact" ? inspect.entry_id ?? null : kind === "possible" && choice && choice !== "new" ? choice : null;
  const forceNew = kind === "possible" && choice === "new";
  const needsChoice = kind === "possible" && !choice;
  const needsLabCost = !entryId;
  const amountErrors = amounts.map((a) => (!a.trim() ? "Enter the amount" : parseCents(a) === null ? "Use an amount like 450 or 450.50" : undefined));
  const gross = amounts.reduce((t, a) => t + (parseCents(a) ?? 0), 0);
  const printedDiscount = fromServer(inspect.printed_discount) ?? 0;
  const entryDiscount = entryId && entryId === inspect.entry_id ? fromServer(inspect.entry_discount) ?? 0 : 0;
  const discount = entryDiscount > 0 ? entryDiscount : printedDiscount;
  const labCostError = needsLabCost && parseCents(labCost) === null ? "Enter the lab cost, for example 450 or 450.50" : undefined;
  const taken = inspect.bill_no_taken && kind !== "possible";
  const blockers = [
    needsChoice ? "Choose the matching entry, or “different patient”." : "",
    amountErrors.find(Boolean) ? "Enter a valid amount for every test." : "",
    labCostError ?? "",
    taken ? `Bill No ${inspect.lab_bill_no} is already used by another entry.` : "",
    discount > gross ? "The discount cannot be more than the total." : "",
  ].filter(Boolean);
  const entryMissingFinancials = !!entryId && entryId === inspect.entry_id && (inspect.entry_lab_cost == null || inspect.entry_gross == null);
  const inputKey = JSON.stringify([amounts.map((a) => parseCents(a) ?? a.trim()), labCost.trim(), entryId, forceNew]);

  async function refresh(f: File) {
    try {
      setInspect(await inspectMetropolis(f));
    } catch {
      /* keep the screen as it is; the next action will report any problem */
    }
  }

  async function run(delivery: Delivery) {
    setShowErrors(true);
    if (blockers.length) return void toast.error(blockers[0]);
    if (!file) return;
    setBusy(delivery);
    const args = {
      file,
      amounts: amounts.map((a) => centsToString(parseCents(a) ?? 0)),
      entryId,
      forceNew,
      labCost: needsLabCost ? centsToString(parseCents(labCost) ?? 0) : null,
    };
    try {
      if (delivery === "email") {
        await emailMetropolisBill(args);
        toast.success(`Bill emailed to ${user?.email ?? "you"}`);
      } else {
        const { blob, filename } = await renderMetropolisFile({ ...args, delivery });
        if (delivery === "download") {
          saveBlob(blob, filename);
          toast.success(`Downloaded ${filename}`);
        } else {
          setPreview({ url: URL.createObjectURL(blob), blob, filename, key: inputKey });
        }
      }
      // The render saved the amounts and the lab bill number; learn which entry now holds them.
      refreshRegistry();
      await refresh(file);
    } catch (e) {
      toast.error(errorMessage(e));
      if (e instanceof ApiError && e.status === 409) await refresh(file);
    } finally {
      setBusy(null);
    }
  }

  const symbol = currency === "INR" ? "₹" : currency;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-6">
        <Card>
          <CardHeader title="Lab bill" description={file.name}
            action={<Button size="sm" variant="ghost" disabled={busy !== null} onClick={startOver}><RotateCcw className="h-4 w-4" aria-hidden />Use another file</Button>} />
          <CardBody>
            <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <div><dt className="text-ink-muted">Lab bill no.</dt><dd className="font-semibold text-ink-heading">{inspect.lab_bill_no}</dd></div>
              <div><dt className="text-ink-muted">Bill date</dt><dd className="font-semibold text-ink-heading">{formatDate(inspect.bill_date)}</dd></div>
              <div><dt className="text-ink-muted">Patient</dt><dd className="font-semibold text-ink-heading">{inspect.patient_name}</dd></div>
              <div><dt className="text-ink-muted">Age / gender</dt><dd className="font-semibold text-ink-heading">{[formatAge(inspect.age, inspect.age_unit), inspect.gender].filter((x) => x && x !== "—").join(" / ") || "—"}</dd></div>
              <div><dt className="text-ink-muted">Patient ID</dt><dd className="font-semibold text-ink-heading">{inspect.lab_pid || "—"}</dd></div>
              <div><dt className="text-ink-muted">Referred by</dt><dd className="font-semibold text-ink-heading">{inspect.referred_by || "—"}</dd></div>
            </dl>
          </CardBody>
        </Card>

        {taken && (
          <Alert kind="error" title={`Bill No ${inspect.lab_bill_no} is already used`}>
            Another entry already holds this lab bill number, so this bill cannot be saved. Check that you uploaded the right file.
          </Alert>
        )}
        {kind === "possible" && inspect.bill_no_taken && (
          <Alert kind="info" title={`Bill No ${inspect.lab_bill_no} is already saved`}>It belongs to one of the similar entries below. Choose that entry to continue.</Alert>
        )}

        <Card>
          <CardHeader title="Which entry is this?" description="Amounts and the lab’s bill number are saved on it." />
          <CardBody className="space-y-3">
            {kind === "exact" && inspect.match.entries[0] && (
              <Alert kind="success" title="Matches a saved entry">
                <span className="font-semibold text-ink-heading">{inspect.match.entries[0].patient_name}</span>
                <span className="ml-2 text-xs text-ink-muted">Bill no. {inspect.match.entries[0].bill_no ?? "—"} · {formatDate(inspect.match.entries[0].registration_date)}</span>
                <span className="mt-1 block">The amounts below will be saved on this entry.</span>
              </Alert>
            )}
            {kind === "none" && (
              <Alert kind="info" title="No saved entry matches">A new entry will be created for this patient when you make the bill. Enter the lab cost below.</Alert>
            )}
            {kind === "possible" && (
              <fieldset className="space-y-2">
                <legend className="mb-1 text-sm text-ink">Similar patients are already saved for this lab and date. Choose one, or say it is someone else.</legend>
                {inspect.match.entries.map((e) => (
                  <label key={e.id} className={cn("flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition-colors", choice === e.id ? "border-slate-nav bg-slate-nav/5 ring-1 ring-slate-nav" : "border-line hover:border-slate-nav/40")}>
                    <input type="radio" name="match" className="mt-1 accent-[#34495E]" checked={choice === e.id} disabled={busy !== null} onChange={() => setChoice(e.id)} />
                    <span>
                      <span className="block font-semibold text-ink-heading">{e.patient_name ?? "Unnamed patient"}</span>
                      <span className="text-xs text-ink-muted">Bill no. {e.bill_no ?? "—"} · {formatDate(e.registration_date)}</span>
                    </span>
                  </label>
                ))}
                <label className={cn("flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition-colors", choice === "new" ? "border-slate-nav bg-slate-nav/5 ring-1 ring-slate-nav" : "border-line hover:border-slate-nav/40")}>
                  <input type="radio" name="match" className="mt-1 accent-[#34495E]" checked={choice === "new"} disabled={busy !== null} onChange={() => setChoice("new")} />
                  <span className="font-semibold text-ink-heading">This is a different patient: create a new entry</span>
                </label>
                {showErrors && needsChoice && <p role="alert" className="text-xs font-medium text-danger">Fix this: choose one option to continue.</p>}
              </fieldset>
            )}
            {entryMissingFinancials && (
              <Alert kind="warning" title="This entry has no lab cost or billed amount yet"
                action={inspect.entry_id ? <Link href={`/patient_registry/${inspect.entry_id}`} className={buttonStyles({ size: "sm" })}>Open entry</Link> : undefined}>
                Changing amounts may be refused until those are filled in the Patient Registry.
              </Alert>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Amounts" description="One amount for every test row of the lab bill. The tests themselves cannot be changed." />
          <CardBody className="space-y-5">
            <ul className="space-y-3">
              {inspect.rows.map((r, i) => (
                <li key={i} className="grid gap-2 rounded-ctl border border-line/70 bg-ivory/50 p-3 sm:grid-cols-[minmax(0,1fr)_10rem] sm:items-start sm:gap-3">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-semibold text-ink-heading">{r.name}</p>
                    <p className="text-xs text-ink-muted">Printed by the lab: {formatMoney((fromServer(r.printed_amount) ?? 0) / 100, currency)}</p>
                  </div>
                  <div>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-muted" aria-hidden>{symbol}</span>
                      <Input aria-label={`Amount for ${r.name}`} value={amounts[i] ?? ""} inputMode="decimal" disabled={busy !== null} invalid={showErrors && !!amountErrors[i]} className="pl-7 text-right tabular-nums"
                        onChange={(e) => setAmounts((a) => a.map((x, j) => (j === i ? e.target.value : x)))} />
                    </div>
                    {showErrors && amountErrors[i] && <p role="alert" className="mt-1 text-xs font-medium text-danger">Fix this: {amountErrors[i]}</p>}
                  </div>
                </li>
              ))}
            </ul>

            {needsLabCost ? (
              <Field label="Lab cost" htmlFor="mp-cost" required error={showErrors ? labCostError : undefined} hint="Needed to create the entry. Internal: never printed on the bill.">
                <div className="relative max-w-xs">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-muted" aria-hidden>{symbol}</span>
                  <Input id="mp-cost" value={labCost} inputMode="decimal" placeholder="0" className="pl-7" disabled={busy !== null} invalid={showErrors && !!labCostError} onChange={(e) => setLabCost(e.target.value)} />
                </div>
              </Field>
            ) : (
              <p className="text-sm text-ink-muted">Lab cost on the entry: <b className="text-ink-heading">{inspect.entry_lab_cost == null ? "not set" : formatMoney((fromServer(inspect.entry_lab_cost) ?? 0) / 100, currency)}</b>. It is kept as it is.</p>
            )}

            <dl className="grid gap-3 rounded-card border border-line bg-ivory p-4 sm:grid-cols-3">
              <div><dt className="text-xs font-semibold text-ink-muted">Total</dt><dd className="font-display text-xl font-semibold tabular-nums text-ink-heading">{formatMoney(gross / 100, currency)}</dd></div>
              <div><dt className="text-xs font-semibold text-ink-muted">Discount</dt><dd className="font-display text-xl font-semibold tabular-nums text-ink-heading">{formatMoney(discount / 100, currency)}</dd></div>
              <div><dt className="text-xs font-semibold text-ink-muted">Payable</dt><dd className="font-display text-xl font-semibold tabular-nums text-ink-heading">{formatMoney(Math.max(gross - discount, 0) / 100, currency)}</dd></div>
            </dl>
            {showErrors && discount > gross && <p role="alert" className="text-xs font-medium text-danger">Fix this: the discount cannot be more than the total.</p>}
            <p className="text-xs text-ink-muted">The discount is the entry’s saved discount when it has one, otherwise the one printed on the lab bill.</p>
          </CardBody>
        </Card>

        <Alert kind="info" title="What making the bill saves">
          The test amounts and the lab’s bill number ({inspect.lab_bill_no}) are saved on the entry, and the entry is created if needed. The lab’s PDF is edited only in its amount cells. The PDF itself is not stored.
        </Alert>

        <div className="sticky bottom-0 -mx-4 border-t border-line bg-ivory/95 px-4 py-3 backdrop-blur md:mx-0 md:rounded-b-card md:px-0">
          <DeliveryButtons busy={busy} onRun={(d) => void run(d)} email={user?.email} />
        </div>
      </div>

      <div className="min-w-0 xl:sticky xl:top-6 xl:self-start">
        <BillPreview url={preview?.url ?? null} stale={!!preview && preview.key !== inputKey} loading={busy === "preview"} onDownload={preview ? () => saveBlob(preview.blob, preview.filename) : undefined} />
      </div>
    </div>
  );
}

export function MetropolisView() {
  return (
    <>
      <PageHeader
        title="Metropolis bill"
        description="Upload the lab’s own bill, enter your amounts, and get the same PDF back with only the amount cells changed."
        back={<Link href="/bill_generator" className={buttonStyles({ variant: "ghost", size: "sm" })}><ArrowLeft className="h-4 w-4" aria-hidden />All labs</Link>}
      />
      <LabGate labKey="metropolis" mode="edit_pdf">{(lab) => <Flow labName={lab.name} />}</LabGate>
    </>
  );
}