"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, Eye, FileUp, FlaskConical, Loader2, PencilLine, UploadCloud } from "lucide-react";
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
    <ol className="mb-6 flex items-center gap-2 overflow-x-auto" aria-label="Progress">
      {items.map((it, i) => {
        const current = it.id === step;
        const reachable = order.indexOf(it.id) < order.indexOf(step);
        return (
          <li key={it.id} className="flex shrink-0 items-center gap-2">
            <button disabled={!reachable} onClick={() => goto(it.id)} aria-current={current ? "step" : undefined}
              className={cn("inline-flex h-10 items-center gap-2 rounded-full border px-3.5 text-sm font-semibold transition-colors",
                current ? "border-slate-nav bg-slate-nav text-white" : it.done ? "border-ok/30 bg-ok-soft text-ok" : "border-line bg-white text-ink-muted", reachable && "hover:border-slate-nav")}>
              <span className={cn("grid h-5 w-5 place-items-center rounded-full text-[11px]", current ? "bg-white/20" : it.done ? "bg-ok text-white" : "bg-line/60")}>
                {it.done && !current ? <Check className="h-3 w-3" aria-hidden /> : i + 1}
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
  const [err, setErr] = useState<string | null>(null);
  const accept = cfg.upload_allowed.map((e) => `.${e}`).join(",");

  function take(f?: File) {
    if (!f) return;
    const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
    if (!cfg.upload_allowed.includes(ext)) return setErr(`Only ${cfg.upload_allowed.map((e) => e.toUpperCase()).join(" or ")} files can be read. This one is .${ext || "unknown"}.`);
    if (f.size > cfg.upload_max_mb * 1024 * 1024) return setErr(`This file is ${(f.size / 1048576).toFixed(1)} MB. The limit is ${cfg.upload_max_mb} MB.`);
    setErr(null);
    onFile(f);
  }

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); take(e.dataTransfer.files[0]); }}
        className={cn("flex min-h-56 flex-col items-center justify-center rounded-card border-2 border-dashed bg-white p-6 text-center transition-colors", over ? "border-brand bg-brand-soft/30" : "border-line")}
      >
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-nav text-white"><UploadCloud className="h-7 w-7" aria-hidden /></span>
        <h3 className="mt-4 text-lg font-semibold">Upload the lab report</h3>
        <p className="mt-1 max-w-xs text-sm text-ink-muted">Drop a {cfg.upload_allowed.map((e) => e.toUpperCase()).join(" or ")} here, or pick one from your phone or computer. Up to {cfg.upload_max_mb} MB.</p>
        <Button variant="primary" size="lg" className="mt-5" disabled={disabled} onClick={() => input.current?.click()}><FileUp className="h-4 w-4" aria-hidden />Choose file</Button>
        <input ref={input} type="file" accept={accept} className="sr-only" tabIndex={-1} onChange={(e) => { take(e.target.files?.[0]); e.target.value = ""; }} />
      </div>
      {err && <Alert kind="error" title="That file cannot be used" className="mt-3">{err}</Alert>}
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
  const [parseError, setParseError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [decision, setDecision] = useState<DuplicateDecision | null>(null);
  const [showReport, setShowReport] = useState(false);
  const pending = useRef<FormValues | null>(null);

  const defaults = useMemo(() => (fields ? toFormValues(fields, parse?.fields) : {}), [fields, parse]);
  const found = useMemo(() => (parse ? Object.entries(parse.fields).filter(([, v]) => (Array.isArray(v) ? v.length : v !== null && v !== undefined && v !== "")).map(([k]) => k) : []), [parse]);

  const goto = (s: Step) => { setStep(s); if (s !== "form") setParseError(null); };

  async function onFile(file: File) {
    if (!lab) return;
    setParsing(file.name);
    setParseError(null);
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
      } else setParseError(errorMessage(e));
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
      <PageHeader title="New patient entry" description="Pick the lab first so its reading rules load. Every value stays editable before you save."
        back={<Link href="/patient_registry" className={buttonStyles({ variant: "ghost", size: "sm" })}><ArrowLeft className="h-4 w-4" aria-hidden />All entries</Link>} />
      <RegistryNav />
      <Stepper step={step} lab={lab} labName={lab ? labNames[lab] : undefined} goto={goto} />

      {step === "lab" && (
        <section aria-label="Choose laboratory" className="animate-pop-in">
          <LabSelector module="patient_registry" value={lab} onChange={(k) => { setLab(k); setParse(null); setStep("source"); }} />
        </section>
      )}

      {step === "source" && lab && (
        <section aria-label="Choose how to enter" className="animate-pop-in">
          {parsing ? (
            <Card><CardBody className="flex flex-col items-center py-14 text-center">
              <Loader2 className="h-9 w-9 animate-spin text-brand" aria-hidden />
              <h3 className="mt-4 text-lg font-semibold">Reading {parsing}</h3>
              <p className="mt-1 text-sm text-ink-muted">Using {labNames[lab] ?? lab} rules. This takes a few seconds.</p>
            </CardBody></Card>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
              <UploadZone onFile={onFile} />
              <button onClick={() => { setParse(null); setStep("form"); }} className="flex min-h-56 flex-col items-center justify-center rounded-card border border-line bg-white p-6 text-center shadow-card transition-all hover:-translate-y-0.5 hover:border-slate-nav/50">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-soft text-brand"><PencilLine className="h-7 w-7" aria-hidden /></span>
                <h3 className="mt-4 text-lg font-semibold">Type it in</h3>
                <p className="mt-1 max-w-xs text-sm text-ink-muted">No report yet? Only name, registration date and lab are needed. Add the rest later.</p>
              </button>
            </div>
          )}
          {parseError && <Alert kind="error" title="Could not read that report" className="mt-4" action={<Button size="sm" onClick={() => { setParse(null); setStep("form"); }}>Type it in instead</Button>}>{parseError}</Alert>}
        </section>
      )}

      {step === "form" && lab && (
        <section aria-label="Review and save" className={cn("animate-pop-in grid gap-6", reportPath && "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]")}>
          {reportPath && (
            <div className="lg:sticky lg:top-24 lg:self-start">
              <Button className="mb-3 w-full lg:hidden" onClick={() => setShowReport((s) => !s)}><Eye className="h-4 w-4" aria-hidden />{showReport ? "Hide report" : "View report beside the form"}</Button>
              <div className={cn(showReport ? "block" : "hidden", "lg:block")}>
                <PdfPreview path={reportPath} title={parse?.filename ?? "Report"} />
              </div>
              {parse && <p className="mt-2 text-xs text-ink-muted">Read confidence {Math.round(parse.confidence * 100)}%. Amber marks show values worth a second look.</p>}
            </div>
          )}
          <Card className="min-w-0">
            <CardBody className="space-y-5">
              <div className="flex items-center gap-2 text-sm text-ink-muted"><FlaskConical className="h-4 w-4" aria-hidden />Laboratory: <b className="text-ink-heading">{labNames[lab] ?? lab}</b>{!parse && <span>· manual entry</span>}</div>
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
                  onSubmit={(v) => save(v)}
                  onCancel={() => router.push("/patient_registry")}
                  footerNote="Bill number is assigned when you save."
                />
              )}
            </CardBody>
          </Card>
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
