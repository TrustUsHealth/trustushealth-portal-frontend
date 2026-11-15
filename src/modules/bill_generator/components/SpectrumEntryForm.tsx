"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import { errorMessage } from "@/core/api/client";
import { useAppConfig } from "@/core/config/provider";
import { formatMoney, todayISO } from "@/lib/format";
import { useCreateBillEntry } from "../api";
import { centsToString, normalizeName, parseCents, sumCents, validateRows, type BillRow } from "../bill-utils";
import type { AgeUnit, Gender } from "@/core/api/types";
import type { ManualEntryIn, ParsedOut } from "../types";
import { BillDecisionDialog, type BillResolveChoice } from "./BillDecisionDialog";
import { BillRowsEditor } from "./BillRowsEditor";
import { ParsedHints } from "./ParsedHints";
import type { BillDecision } from "../types";

interface Values {
  patient_name: string; registration_date: string; age: string; age_unit: string; gender: string; lab_pid: string;
  referred_by: string; phone: string; email: string; client_name: string; lab_cost: string; discount_amount: string;
  rows: BillRow[];
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GENDERS = ["Male", "Female", "Other"];

const schema = z
  .object({
    patient_name: z.string().trim().min(2, "Enter the patient's name").max(120, "Keep the name under 120 characters"),
    registration_date: z.string().refine((v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && Number(v.slice(0, 4)) >= 2000 && Number(v.slice(0, 4)) <= new Date().getFullYear() + 1, "Pick a valid date"),
    age: z.string().refine((v) => !v.trim() || (/^\d{1,3}$/.test(v.trim()) && Number(v) <= 130), "Enter a whole number from 0 to 130"),
    age_unit: z.string(),
    gender: z.string(),
    lab_pid: z.string().max(40, "Keep it under 40 characters"),
    referred_by: z.string().max(120, "Keep it under 120 characters"),
    phone: z.string().max(30, "Keep it under 30 characters"),
    email: z.string().max(120, "Keep it under 120 characters").refine((v) => !v.trim() || EMAIL_RE.test(v.trim()), "Enter a valid email"),
    client_name: z.string().max(120, "Keep it under 120 characters"),
    lab_cost: z.string().refine((v) => parseCents(v) !== null, "Enter the lab cost, for example 450 or 450.50"),
    discount_amount: z.string().refine((v) => !v.trim() || parseCents(v) !== null, "Enter an amount like 50 or 50.50"),
    rows: z.array(z.object({ name: z.string(), amount: z.string() })),
  })
  .superRefine((v, ctx) => {
    const d = parseCents(v.discount_amount);
    if (d !== null && d > sumCents(v.rows)) ctx.addIssue({ code: "custom", path: ["discount_amount"], message: "The discount cannot be more than the total of the tests" });
  });

function defaultsFrom(parsed: ParsedOut | null): Values {
  const f = parsed?.fields ?? {};
  const s = (k: string) => (f[k] === null || f[k] === undefined || typeof f[k] === "object" ? "" : String(f[k]));
  const tests = Array.isArray(f.tests) ? (f.tests as unknown[]).map(String).filter(Boolean) : [];
  return {
    patient_name: s("patient_name"),
    registration_date: s("registration_date").slice(0, 10) || todayISO(),
    age: s("age"),
    age_unit: ["Y", "M", "D"].includes(s("age_unit")) ? s("age_unit") : "Y",
    gender: GENDERS.includes(s("gender")) ? s("gender") : "",
    lab_pid: s("lab_pid"),
    referred_by: s("referred_by"),
    phone: s("phone"),
    email: s("email"),
    client_name: "",
    lab_cost: "",
    discount_amount: "",
    rows: tests.length ? tests.map((name) => ({ name, amount: "" })) : [{ name: "", amount: "" }],
  };
}

/** Only keys that ManualEntryIn allows (the backend forbids extras); empty optional values are left out. */
function toBody(v: Values, choice: BillResolveChoice): ManualEntryIn {
  const rows = v.rows.map((r) => ({ name: normalizeName(r.name), cents: parseCents(r.amount) ?? 0 }));
  const body: ManualEntryIn = {
    partner_key: "spectrum",
    patient_name: v.patient_name.trim(),
    registration_date: v.registration_date,
    tests: rows.map((r) => r.name),
    test_amounts: rows.map((r) => centsToString(r.cents)),
    lab_cost: centsToString(parseCents(v.lab_cost) ?? 0),
  };
  const discount = parseCents(v.discount_amount);
  if (discount !== null) body.discount_amount = centsToString(discount);
  if (v.age.trim()) {
    body.age = Number(v.age);
    body.age_unit = v.age_unit as AgeUnit;
  }
  if (v.gender) body.gender = v.gender as Gender;
  if (v.lab_pid.trim()) body.lab_pid = v.lab_pid.trim();
  if (v.referred_by.trim()) body.referred_by = v.referred_by.trim();
  if (v.phone.trim()) body.phone = v.phone.trim();
  if (v.email.trim()) body.email = v.email.trim();
  if (v.client_name.trim()) body.client_name = v.client_name.trim();
  return { ...body, ...choice };
}

export function SpectrumEntryForm({ parsed, fileName, onBack }: { parsed: ParsedOut | null; fileName?: string; onBack: () => void }) {
  const router = useRouter();
  const { currency } = useAppConfig();
  const create = useCreateBillEntry();
  const defaults = useMemo(() => defaultsFrom(parsed), [parsed]);
  const [decision, setDecision] = useState<BillDecision | null>(null);
  const [showRowErrors, setShowRowErrors] = useState(false);
  const pending = useRef<Values | null>(null);

  const { register, control, handleSubmit, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema) as never,
    defaultValues: defaults,
    mode: "onBlur",
  });
  const rows = useWatch({ control, name: "rows" }) ?? defaults.rows;
  const discount = useWatch({ control, name: "discount_amount" }) ?? "";
  const check = validateRows(rows);
  const gross = sumCents(rows);
  const discountC = Math.min(parseCents(discount) ?? 0, gross);
  const err = (k: keyof Values) => (errors as Record<string, { message?: string } | undefined>)[k]?.message;
  const symbol = currency === "INR" ? "₹" : currency;

  async function save(values: Values, choice: BillResolveChoice = {}) {
    pending.current = values;
    try {
      const r = await create.mutateAsync(toBody(values, choice));
      if (!r.ok) {
        setDecision(r.conflict);
        return;
      }
      setDecision(null);
      const { outcome, entry, filled_fields } = r.data;
      if (outcome === "created") toast.success(`Entry saved · Bill no. ${entry.bill_no}`);
      else if (outcome === "merged") toast.success(`Matched an existing entry (Bill no. ${entry.bill_no}) and filled ${filled_fields.length} empty field${filled_fields.length === 1 ? "" : "s"}`);
      else toast.info(`This visit was already saved as Bill no. ${entry.bill_no}. Nothing changed.`);
      router.push(`/bill_generator/spectrum/${entry.id}`);
    } catch (e) {
      toast.error(errorMessage(e));
      setDecision(null);
    }
  }

  function onValid(values: Values) {
    if (!validateRows(values.rows).ok) {
      setShowRowErrors(true);
      toast.error("Check the tests and amounts.");
      return;
    }
    void save(values);
  }

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <span className="rounded-full border border-info/25 bg-info-soft px-3 py-1 text-sm font-semibold text-info">Spectrum Laboratory</span>
        <span className="text-[15px] text-ink-muted">{parsed ? `Read from ${fileName ?? "the report"}. Check every value.` : "Manual entry"}</span>
        <Button variant="link" onClick={onBack} className="text-sm">{parsed ? "Upload a different file" : "Change how I add it"}</Button>
      </div>
      {parsed && <div className="mb-5"><ParsedHints parsed={parsed} /></div>}

      <form onSubmit={handleSubmit(onValid)} noValidate className="space-y-6">
        <Card>
          <CardHeader title="Patient" description="Name and registration date are the only must-haves for the patient." />
          <CardBody className="grid gap-x-4 gap-y-4 sm:grid-cols-2">
            <Field label="Patient name" htmlFor="sp-name" required error={err("patient_name")} className="sm:col-span-2">
              <Input id="sp-name" {...register("patient_name")} autoComplete="off" invalid={!!err("patient_name")} autoFocus={!parsed} />
            </Field>
            <Field label="Registration date" htmlFor="sp-date" required error={err("registration_date")}>
              <Input id="sp-date" type="date" {...register("registration_date")} invalid={!!err("registration_date")} />
            </Field>
            <Field label="Patient ID" htmlFor="sp-pid" error={err("lab_pid")} hint="The lab's own patient number, if you have it.">
              <Input id="sp-pid" {...register("lab_pid")} invalid={!!err("lab_pid")} />
            </Field>
            <Field label="Age" htmlFor="sp-age" error={err("age")}>
              <div className="flex gap-2">
                <Input id="sp-age" {...register("age")} inputMode="numeric" placeholder="45" invalid={!!err("age")} />
                <Select aria-label="Age unit" {...register("age_unit")} className="w-32 shrink-0">
                  <option value="Y">Years</option><option value="M">Months</option><option value="D">Days</option>
                </Select>
              </div>
            </Field>
            <Field label="Gender" htmlFor="sp-gender" error={err("gender")}>
              <Select id="sp-gender" {...register("gender")}>
                <option value="">Not set</option>
                {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
              </Select>
            </Field>
            <Field label="Referred by" htmlFor="sp-ref" error={err("referred_by")}>
              <Input id="sp-ref" {...register("referred_by")} invalid={!!err("referred_by")} />
            </Field>
            <Field label="Phone" htmlFor="sp-phone" error={err("phone")}>
              <Input id="sp-phone" {...register("phone")} inputMode="tel" invalid={!!err("phone")} />
            </Field>
            <Field label="Email" htmlFor="sp-email" error={err("email")} className="sm:col-span-2">
              <Input id="sp-email" type="email" {...register("email")} invalid={!!err("email")} />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Bill" description="Every test needs its own amount. These are saved on the entry." />
          <CardBody className="space-y-6">
            <Controller
              name="rows"
              control={control}
              render={({ field }) => (
                <BillRowsEditor rows={field.value} onChange={field.onChange} errors={showRowErrors ? check.errors : undefined} message={showRowErrors ? check.message : undefined} />
              )}
            />
            <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2">
              <Field label="Lab cost" htmlFor="sp-cost" required error={err("lab_cost")} hint="Internal: never printed on the patient's bill.">
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-muted" aria-hidden>{symbol}</span>
                  <Input id="sp-cost" {...register("lab_cost")} inputMode="decimal" placeholder="0" className="pl-7" invalid={!!err("lab_cost")} />
                </div>
              </Field>
              <Field label="Discount" htmlFor="sp-disc" error={err("discount_amount")} hint="Leave empty for no discount.">
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-muted" aria-hidden>{symbol}</span>
                  <Input id="sp-disc" {...register("discount_amount")} inputMode="decimal" placeholder="0" className="pl-7" invalid={!!err("discount_amount")} />
                </div>
              </Field>
              <Field label="Client name" htmlFor="sp-client" error={err("client_name")} hint="Printed on the bill only if you switch it on when making the bill." className="sm:col-span-2">
                <Input id="sp-client" {...register("client_name")} invalid={!!err("client_name")} />
              </Field>
            </div>
            <dl className="grid gap-3 rounded-card border border-line bg-ivory p-4 sm:grid-cols-3">
              <div><dt className="text-xs font-semibold text-ink-muted">Total</dt><dd className="font-display text-xl font-semibold tabular-nums text-ink-heading">{formatMoney(gross / 100, currency)}</dd></div>
              <div><dt className="text-xs font-semibold text-ink-muted">Discount</dt><dd className="font-display text-xl font-semibold tabular-nums text-ink-heading">{formatMoney(discountC / 100, currency)}</dd></div>
              <div><dt className="text-xs font-semibold text-ink-muted">Payable</dt><dd className="font-display text-xl font-semibold tabular-nums text-ink-heading">{formatMoney((gross - discountC) / 100, currency)}</dd></div>
            </dl>
          </CardBody>
        </Card>

        {create.isError && !decision && <Alert kind="error" title="Could not save">{errorMessage(create.error)}</Alert>}

        <div className="sticky bottom-0 -mx-4 flex flex-col gap-3 border-t border-line bg-ivory/95 px-4 py-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between md:mx-0 md:px-0">
          <p className="text-xs text-ink-muted">Saving creates the entry and its bill number. You can preview, download or email the bill on the next screen.</p>
          <div className="flex gap-2">
            <Button onClick={onBack} disabled={create.isPending}>Back</Button>
            <Button type="submit" variant="primary" loading={create.isPending} onClick={() => setShowRowErrors(true)} className="flex-1 sm:flex-none">Save entry and continue</Button>
          </div>
        </div>
      </form>

      <BillDecisionDialog decision={decision} busy={create.isPending} onClose={() => setDecision(null)} onResolve={(c) => pending.current && void save(pending.current, c)} />
    </>
  );
}