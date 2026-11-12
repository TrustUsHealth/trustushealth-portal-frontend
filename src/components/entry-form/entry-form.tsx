"use client";

import { useEffect, useMemo } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { TagInput } from "@/components/ui/tag-input";
import { useAppConfig } from "@/core/config/provider";
import type { FieldDef } from "@/core/api/types";
import { formatMoney, humanizeKey } from "@/lib/format";
import { cn } from "@/lib/utils";
import { buildSchema, computeAmounts, editableFields, GROUPS, UNIT_LABEL, type FormValues } from "./entry-fields";

export interface EntryFormProps {
  fields: FieldDef[];
  defaults: FormValues;
  /** Keys to mark with the amber "Please verify" icon (low-confidence parse). Cleared once the user edits the field. */
  verify?: string[];
  /** Fields found by the parser (shows a small "Read from report" hint). */
  fromReport?: string[];
  isAdmin: boolean;
  submitLabel: string;
  busy?: boolean;
  onSubmit: (values: FormValues, dirtyKeys: string[]) => void;
  onCancel?: () => void;
  /** Disable the submit button until something changed (edit screens). */
  requireDirty?: boolean;
  disabled?: boolean;
  footerNote?: React.ReactNode;
  autoFocusName?: boolean;
  comfortable?: boolean;
  groupCards?: boolean;
}

const INPUT_TYPE: Record<string, string> = { date: "date", datetime: "datetime-local" };
const INPUT_MODE: Record<string, "numeric" | "decimal" | "tel" | "email" | undefined> = { number: "numeric", money: "decimal" };

export function EntryForm({
  fields, defaults, verify = [], fromReport = [], isAdmin, submitLabel, busy, onSubmit, onCancel, requireDirty, disabled, footerNote, autoFocusName, comfortable, groupCards,
}: EntryFormProps) {
  const { currency } = useAppConfig();
  const schema = useMemo(() => buildSchema(fields), [fields]);
  const { register, control, handleSubmit, reset, formState: { errors, dirtyFields, isDirty } } = useForm<FormValues>({
    resolver: zodResolver(schema) as never,
    defaultValues: defaults,
    mode: "onBlur",
  });

  // A fresh parse result or a reloaded entry replaces the form contents.
  useEffect(() => reset(defaults), [defaults, reset]);

  const watched = useWatch({ control }) as FormValues;
  const amounts = computeAmounts(watched);

  const byKey = useMemo(() => new Map(editableFields(fields).map((f) => [f.key, f])), [fields]);
  const listed = new Set(GROUPS.flatMap((g) => g.keys));
  const extras = [...byKey.keys()].filter((k) => !listed.has(k));
  const formGroups = groupCards
    ? GROUPS.filter((g) => g.id !== "tests").map((g) => g.id === "visit"
      ? { ...g, keys: [...g.keys, ...GROUPS.find((item) => item.id === "tests")!.keys] }
      : g)
    : GROUPS;
  const groups = [...formGroups, ...(extras.length ? [{ id: "more", title: "More details", keys: extras }] : [])]
    .map((g) => ({ ...g, keys: g.keys.filter((k) => byKey.has(k)) }))
    .filter((g) => g.keys.length);

  const dirtyKeys = Object.keys(dirtyFields);
  const flagged = (k: string) => verify.includes(k) && !(dirtyFields as Record<string, unknown>)[k] && !(k === "age" && (dirtyFields as Record<string, unknown>).age_unit);
  const err = (k: string) => (errors as Record<string, { message?: string } | undefined>)[k]?.message;

  function adornment(k: string) {
    if (flagged(k))
      return <span className="inline-flex items-center gap-1 rounded-full bg-warn-soft px-2 py-0.5 text-[11px] font-semibold text-warn"><AlertTriangle className="h-3 w-3" aria-hidden />Please verify</span>;
    if (fromReport.includes(k) && !(dirtyFields as Record<string, unknown>)[k]) return <span className="text-[11px] font-medium text-ink-muted">from report</span>;
    return null;
  }

  function control_(f: FieldDef) {
    const id = `f-${f.key}`;
    const invalid = !!err(f.key);
    const warn = flagged(f.key);
    const warnCls = warn ? "border-warn bg-warn-soft/40" : "";
    if (f.type === "text_list")
      return (
        <Controller name={f.key} control={control} render={({ field }) => (
          <TagInput id={id} value={(field.value as string[]) ?? []} onChange={field.onChange} invalid={invalid} disabled={disabled} placeholder="Type a test name, press Enter" />
        )} />
      );
    if (f.key === "age")
      return (
        <div className="flex gap-2">
          <Input id={id} {...register("age")} inputMode="numeric" disabled={disabled} invalid={invalid} className={warnCls} placeholder="45" />
          <Select aria-label="Age unit" {...register("age_unit")} disabled={disabled} className="w-32 shrink-0">
            {(["Y", "M", "D"] as const).map((u) => <option key={u} value={u}>{UNIT_LABEL[u]}</option>)}
          </Select>
        </div>
      );
    if (f.type === "enum")
      return (
        <Select id={id} {...register(f.key)} disabled={disabled} invalid={invalid} className={warnCls}>
          <option value="">Not set</option>
          {(f.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
        </Select>
      );
    if (f.type === "money")
      return (
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-muted" aria-hidden>{currency === "INR" ? "₹" : currency}</span>
          <Input id={id} {...register(f.key)} inputMode="decimal" disabled={disabled} invalid={invalid} className={cn("pl-7", warnCls)} placeholder="0" />
        </div>
      );
    return (
      <Input
        id={id}
        {...register(f.key)}
        type={INPUT_TYPE[f.type] ?? (f.key === "email" ? "email" : "text")}
        inputMode={INPUT_MODE[f.type] ?? (f.key === "phone" ? "tel" : undefined)}
        autoComplete={f.key === "patient_name" ? "off" : undefined}
        autoFocus={autoFocusName && f.key === "patient_name"}
        disabled={disabled}
        invalid={invalid}
        className={warnCls}
      />
    );
  }

  const span = (k: string) => (k === "tests" || k === "patient_name" || k === "email" ? "sm:col-span-2" : "");

  return (
    <form onSubmit={handleSubmit((v) => onSubmit(v, dirtyKeys))} noValidate className={cn("space-y-7", comfortable && "space-y-8 [&_input]:h-11 [&_input]:text-base [&_label]:text-sm [&_select]:h-11 [&_select]:text-base")}>
      {groups.map((g) => (
        <fieldset key={g.id} disabled={disabled} className={cn("min-w-0", groupCards && "rounded-card border border-line/80 bg-white p-4 shadow-card sm:p-5")}>
          <legend className={cn("mb-3 font-display text-[15px] font-semibold text-ink-heading", comfortable && "mb-4 text-base", groupCards && "px-1 text-base")}>{g.title}</legend>
          <div className={cn("grid gap-x-4 gap-y-4 sm:grid-cols-2", comfortable && "gap-x-5 gap-y-5")}>
            {g.keys.map((k) => {
              const f = byKey.get(k)!;
              return (
                <Field key={k} label={f.label || humanizeKey(k)} htmlFor={`f-${k}`} required={f.required} error={err(k)} adornment={adornment(k)} className={span(k)}
                  hint={k === "tests" ? "Exactly as printed on the report. Add or remove freely." : f.internal ? "Internal: never printed on the patient's bill." : undefined}>
                  {control_(f)}
                </Field>
              );
            })}
          </div>

          {g.id === "billing" && (
            <div className={cn("mt-4 grid gap-3 rounded-card border border-line bg-ivory p-4 sm:grid-cols-2", comfortable && "p-5")}>
              <div>
                <p className={cn("text-xs font-semibold text-ink-muted", comfortable && "text-sm")}>Billed amount (gross − discount)</p>
                <p className={cn("mt-0.5 font-display text-2xl font-semibold tabular-nums text-ink-heading", comfortable && "text-3xl")}>{formatMoney(amounts.net, currency)}</p>
                <p className={cn("mt-1 text-xs text-ink-muted", comfortable && "text-sm")}>An entry becomes <b>complete</b> and joins the Excel register once this is set.</p>
              </div>
              {isAdmin && (
                <div>
                  <p className={cn("flex items-center gap-1 text-xs font-semibold text-ink-muted", comfortable && "text-sm")}><Lock className="h-3 w-3" aria-hidden />Margin (admin only)</p>
                  <p className={cn("mt-0.5 font-display text-2xl font-semibold tabular-nums text-ink-heading", comfortable && "text-3xl")}>{formatMoney(amounts.margin, currency)}</p>
                  <p className={cn("mt-1 text-xs text-ink-muted", comfortable && "text-sm")}>Billed amount − lab cost.</p>
                </div>
              )}
            </div>
          )}
        </fieldset>
      ))}

      <div className={cn("sticky bottom-0 -mx-4 flex flex-col gap-3 border-t border-line bg-ivory/95 px-4 py-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between md:-mx-0 md:rounded-b-card md:px-0", comfortable && "py-4")}>
        <div className={cn("text-xs text-ink-muted", comfortable && "text-sm")}>{footerNote}</div>
        <div className="flex gap-2">
          {onCancel && <Button onClick={onCancel} disabled={busy} className={comfortable ? "md:h-11 md:text-[15px]" : undefined}>Cancel</Button>}
          <Button type="submit" variant="primary" loading={busy} disabled={disabled || (requireDirty && !isDirty)} className={cn("flex-1 sm:flex-none", comfortable && "md:h-11 md:text-[15px]")}>{submitLabel}</Button>
        </div>
      </div>
    </form>
  );
}
