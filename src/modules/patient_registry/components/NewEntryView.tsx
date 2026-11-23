"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, Eye, FileUp, Loader2, PencilLine, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { PageHeader, Spinner } from "@/components/ui/misc";
import { EntryMini } from "@/components/entry-mini";
import { DuplicateDialog, type ResolveChoice } from "@/components/duplicate-dialog";
import { EntryForm } from "@/components/entry-form/entry-form";
import { toCreatePayload, toFormValues, type FormValues } from "@/components/entry-form/entry-fields";
import { LabSelector } from "@/components/lab-selector";
import { PdfPreview } from "@/components/pdf-preview";
import { ApiError, errorMessage } from "@/core/api/client";
import type { DuplicateDecision, EntryCreate, ParseOut } from "@/core/api/types";
import { useAuth } from "@/core/auth/session";
import { useAppConfig } from "@/core/config/provider";
import { usePartners } from "@/core/shell/tiles";
import { cn } from "@/lib/utils";
import { createEntry, parseReport, reportFilePath, useFields } from "../api";
import { RegistryNav } from "./RegistryNav";

type Step = "lab" | "source" | "form";

const FLAG_TEXT: Record<string, string> = {
  mixed_patients: "Mixed patients: pages of this file seem to belong to different people. Check every detail.",
  no_text: "No readable text found. This looks like a scanned file, so type the details yourself.",
  scanned: "No readable text found. This looks like a scanned file, so type the details yourself.",
};

function Stepper({ step, lab, labName, goto }: { step: Step; lab: string | null; labName?: string; goto: (s: Step) => void }) {
  const items: { id: Step; label: string; done: boolean }[] = [
    { id: "lab", label: labName ? `Lab: ${labName}` : "Choose lab", done: !!lab },
    { id: "source", label: "Report or manual", done: step === "form" },
    { id: "form", label: "Review and save", done: false },
  ];
  const order = ["lab", "source", "form"];
  return (
    <ol className="mb-7 flex flex-wrap items-center gap-x-3 gap-y-2 overflow-x-auto" aria-label="Progress">
      {items.map((it, i) => {
        const current = it.id === step;
        const reachable = order.indexOf(it.id) < order.indexOf(step);
        return (
          <li key={it.id} className="flex shrink-0 items-center gap-2.5">
            <button disabled={!reachable} onClick={() => goto(it.id)} aria-current={current ? "step" : undefined}
              className={cn("inline-flex h-11 items-center gap-2.5 rounded-full border px-4 text-[15px] font-semibold transition-colors",
                current ? "border-slate-nav bg-slate-nav text-white" : it.done ? "border-ok/30 bg-ok-soft text-ok" : "border-line bg-white text-ink-muted", reachable && "hover:border-slate-nav")}>
              <span className={cn("grid size-6 place-items-center rounded-full text-xs", current ? "bg-white/20" : it.done ? "bg-ok text-white" : "bg-line/60")}>
                {it.done && !current ? <Check className="size-3.5" aria-hidden /> : i + 1}
              </span>
              {it.label}
            </button>
            {i < items.length - 1 && <span className="h-px w-5 bg-line" aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}

function UploadZone({ onFile, disabled }: { onFile: (f: File) => void; disabled?: boolean }) {
  const cfg = useAppConfig();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const accept = cfg.upload_allowed.map((e) => `.${e}`).join(",");

  function take(f?: File) {
    if (!f) return;
    const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
    if (!cfg.upload_allowed.includes(ext)) {
      toast.error("That file cannot be used", {
        description: `Only ${cfg.upload_allowed.map((e) => e.toUpperCase()).join(" or ")} files can be read. This one is .${ext || "unknown"}.`,
      });
      return;
    }
    if (f.size > cfg.upload_max_mb * 1024 * 1024) {
      toast.error("That file cannot be used", {
        description: `This file is ${(f.size / 1048576).toFixed(1)} MB. The limit is ${cfg.upload_max_mb} MB.`,
      });
      return;
    }
    onFile(f);
  }

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); take(e.dataTransfer.files[0]); }}
        className={cn("flex min-h-72 flex-col items-center justify-center rounded-card border-2 border-dashed bg-white p-8 text-center transition-colors", over ? "border-brand bg-brand-soft/30" : "border-line")}
      >
        <span className="grid size-16 place-items-center rounded-2xl bg-slate-nav text-white"><UploadCloud className="size-8" aria-hidden /></span>
        <h3 className="mt-5 text-xl font-semibold">Upload the lab report</h3>
        <p className="mt-1 max-w-sm text-[15px] text-ink-muted">Drop a {cfg.upload_allowed.map((e) => e.toUpperCase()).join(" or ")} here, or pick one from your phone or computer. Up to {cfg.upload_max_mb} MB.</p>
        <Button variant="primary" size="lg" className="mt-5" disabled={disabled} onClick={() => input.current?.click()}><FileUp className="size-5" aria-hidden />Choose file</Button>
        <input ref={input} type="file" accept={accept} className="sr-only" tabIndex={-1} onChange={(e) => { take(e.target.files?.[0]); e.target.value = ""; }} />
      </div>
    </div>
  );
}

export function NewEntryView() {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const { data: partners } = usePartners("patient_registry");
  const { data: fields, isLoading: fieldsLoading, error: fieldsError } = useFields();
  const labNames = useMemo(() => Object.fromEntries((partners ?? []).map((p) => [p.key, p.name])), [partners]);

  const [step, setStep] = useState<Step>("lab");
  const [lab, setLab] = useState<string | null>(null);
  const [parsing, setParsing] = useState<string | null>(null);
  const [parse, setParse] = useState<ParseOut | null>(null);
  const [saving, setSaving] = useState(false);
  const [decision, setDecision] = useState<DuplicateDecision | null>(null);
  const [showReport, setShowReport] = useState(false);
  const pending = useRef<FormValues | null>(null);

  const defaults = useMemo(() => (fields ? toFormValues(fields, parse?.fields) : {}), [fields, parse]);
  const found = useMemo(() => (parse ? Object.entries(parse.fields).filter(([, v]) => (Array.isArray(v) ? v.length : v !== null && v !== undefined && v !== "")).map(([k]) => k) : []), [parse]);

  const goto = (s: Step) => setStep(s);

  async function onFile(file: File) {
    if (!lab) return;
    setParsing(file.name);
    try {
      const out = await parseReport(lab, file);
      setParse(out);
      setStep("form");
      toast.success(`Report read · ${Math.round(out.confidence * 100)}% confidence`);
    } catch (e) {
      if (e instanceof ApiError && e.status === 400 && /manual/i.test(e.message)) {
        setParse(null);
        setStep("form");
        toast.info(e.message);
      } else {
        toast.error("Could not read that report", {
          description: errorMessage(e),
          action: {
            label: "Type it in instead",
            onClick: () => { setParse(null); setStep("form"); },
          },
        });
      }
    } finally {
      setParsing(null);
    }
  }

  async function save(values: FormValues, choice: ResolveChoice = {}) {
    if (!fields || !lab) return;
    pending.current = values;
    setSaving(true);
    try {
      const body: EntryCreate = { ...(toCreatePayload(fields, values) as EntryCreate), partner_key: lab, ...choice };
      if (parse?.report_id) body.report_id = parse.report_id;
      const r = await createEntry(body);
      if (!r.ok) { setDecision(r.conflict); return; }
      setDecision(null);
      const { outcome, entry, filled_fields } = r.data;
      if (outcome === "created") toast.success(`Entry saved · Bill no. ${entry.bill_no}`);
      else if (outcome === "merged") toast.success(`Matched an existing entry (Bill no. ${entry.bill_no}) and filled ${filled_fields.length} empty field${filled_fields.length === 1 ? "" : "s"}`);
      else toast.info(`This visit was already saved as Bill no. ${entry.bill_no}. Nothing changed.`);
      router.push(`/patient_registry/${entry.id}`);
    } catch (e) {
      toast.error(errorMessage(e));
      setDecision(null);
    } finally {
      setSaving(false);
    }
  }

  const reportPath = parse ? reportFilePath(parse.report_id) : null;
  const hints = parse && (
    <div className="space-y-3">
      {parse.file_duplicate && (
        <Alert kind="warning" title="This exact file was uploaded before"
          action={parse.existing_entry_id ? <Link className={buttonStyles({ size: "sm" })} href={`/patient_registry/${parse.existing_entry_id}`}>Open entry</Link> : undefined}>
          Saving will not create a second copy of the report.
        </Alert>
      )}
      {parse.duplicate && (
        <Alert kind={parse.duplicate.kind === "exact" ? "warning" : "info"} title={parse.duplicate.kind === "exact" ? "An entry for this visit already exists" : "Possible existing patient"}>
          {parse.duplicate.kind === "exact" ? "Saving will update that entry instead of creating a new one." : "You will be asked to choose if it is the same person."}
          <div className="mt-2 space-y-2">{parse.duplicate.entries.slice(0, 3).map((e) => <EntryMini key={e.id} entry={e} labName={labNames[e.partner_key]} href={`/patient_registry/${e.id}`} />)}</div>
        </Alert>
      )}
      {parse.flags.map((f) => <Alert key={f} kind="warning" title="Check this file">{FLAG_TEXT[f] ?? f.replace(/_/g, " ")}</Alert>)}
      {parse.warnings.map((w) => <Alert key={w} kind="info">{w}</Alert>)}
      {parse.missing_fields.length > 0 && (
        <Alert kind="info" title="Not found in the report">Please fill: {parse.missing_fields.map((f) => f.replace(/_/g, " ")).join(", ")}.</Alert>
      )}
    </div>
  );

  return (
    <>
      <div className="[&_h1]:text-[28px] [&_p]:text-[15px]">
        <PageHeader title="New patient entry" description="Choose the lab first so the right reading rules load. Then upload the report or type the details in."
          back={<Link href="/patient_registry" className={buttonStyles({ variant: "ghost", size: "sm" })}><ArrowLeft className="h-4 w-4" aria-hidden />All entries</Link>} />
      </div>
      <RegistryNav />
      <Stepper step={step} lab={lab} labName={lab ? labNames[lab] : undefined} goto={goto} />

      {step === "lab" && (
        <section aria-labelledby="lab-heading" className="animate-pop-in">
          <h2 id="lab-heading" className="mb-4 text-xl font-semibold">Which lab is this for?</h2>
          <LabSelector module="patient_registry" value={lab} onChange={(k) => { setLab(k); setParse(null); setStep("source"); }} />
        </section>
      )}

      {step === "source" && lab && (
        <section aria-labelledby="source-heading" className="animate-pop-in">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <h2 id="source-heading" className="text-xl font-semibold">How do you want to add the patient?</h2>
            <span className="rounded-full border border-info/25 bg-info-soft px-3 py-1 text-sm font-semibold text-info">{labNames[lab] ?? lab}</span>
            <Button variant="link" onClick={() => goto("lab")} className="text-sm">Change lab</Button>
          </div>
          {parsing ? (
            <Card><CardBody className="flex flex-col items-center py-14 text-center">
              <Loader2 className="size-10 animate-spin text-brand" aria-hidden />
              <h3 className="mt-4 text-xl font-semibold">Reading {parsing}</h3>
              <p className="mt-1 text-[15px] text-ink-muted">Using {labNames[lab] ?? lab} rules. This takes a few seconds.</p>
            </CardBody></Card>
          ) : (
            <div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
              <div>
                <h3 className="mb-3 flex items-center gap-2 text-base font-semibold"><UploadCloud className="size-5 text-ink-muted" aria-hidden />Upload the lab report</h3>
                <UploadZone onFile={onFile} />
                <p className="mt-3 text-sm text-ink-muted">Every value we read is editable on the next screen. Fields we are unsure about are marked <span className="font-semibold text-warn">Please verify</span>.</p>
              </div>
              <div>
                <h3 className="mb-3 flex items-center gap-2 text-base font-semibold"><PencilLine className="size-5 text-ink-muted" aria-hidden />No report yet?</h3>
                <button onClick={() => { setParse(null); setStep("form"); }} className="flex min-h-72 w-full flex-col items-center justify-center rounded-card border border-line bg-white p-7 text-center shadow-card transition-all hover:-translate-y-0.5 hover:border-slate-nav/50">
                  <span className="grid size-16 place-items-center rounded-2xl bg-brand-soft text-brand"><PencilLine className="size-8" aria-hidden /></span>
                  <h3 className="mt-5 text-xl font-semibold">Type it in</h3>
                  <p className="mt-1 max-w-xs text-[15px] text-ink-muted">Only name, registration date and the lab are needed. Add the rest later.</p>
                  <span className={cn(buttonStyles({ variant: "primary", size: "lg" }), "mt-5")}><PencilLine className="size-5" aria-hidden />Enter manually</span>
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {step === "form" && lab && (
        <section aria-label="Review and save" className="animate-pop-in">
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-info/25 bg-info-soft px-3 py-1 text-sm font-semibold text-info">{labNames[lab] ?? lab}</span>
            <span className="text-[15px] text-ink-muted">{parse ? `Read from ${parse.filename}` : "Manual entry"}</span>
            <Button variant="link" onClick={() => goto("source")} className="text-sm">{parse ? "Upload a different file" : "Change how I add it"}</Button>
          </div>
          <div className={cn("grid gap-6", reportPath && "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]")}>
          {reportPath && (
            <div className="lg:self-start">
              <Button className="mb-3 w-full lg:hidden" onClick={() => setShowReport((s) => !s)}><Eye className="size-5" aria-hidden />{showReport ? "Hide report" : "View the report"}</Button>
              <div className={cn(showReport ? "block" : "hidden", "lg:block")}>
                <PdfPreview path={reportPath} title={parse?.filename ?? "Report"} />
              </div>
              {parse && <p className="mt-2 text-xs text-ink-muted">Read confidence {Math.round(parse.confidence * 100)}%. Amber marks show values worth a second look.</p>}
            </div>
          )}
          <Card className="min-w-0">
            <CardBody className="space-y-6">
              <h2 className="text-xl font-semibold">Check the patient details</h2>
              {hints}
              {fieldsLoading ? <Spinner label="Loading form" /> : fieldsError || !fields ? (
                <Alert kind="error" title="Could not load the form">{errorMessage(fieldsError)}</Alert>
              ) : (
                <EntryForm
                  fields={fields}
                  defaults={defaults}
                  verify={parse?.needs_verify ?? []}
                  fromReport={found}
                  isAdmin={isAdmin}
                  busy={saving}
                  submitLabel="Save entry"
                  autoFocusName={!parse}
                  comfortable
                  onSubmit={(v) => save(v)}
                  onCancel={() => router.push("/patient_registry")}
                  footerNote="Bill number is assigned when you save."
                />
              )}
            </CardBody>
          </Card>
          </div>
        </section>
      )}

      <DuplicateDialog
        decision={decision}
        labNames={labNames}
        busy={saving}
        onClose={() => setDecision(null)}
        onResolve={(c) => pending.current && save(pending.current, c)}
      />
    </>
  );
}
