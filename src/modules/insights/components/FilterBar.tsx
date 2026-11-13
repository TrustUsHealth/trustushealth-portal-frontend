"use client";

import { useId, useState } from "react";
import { Check, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { describeFilters, type InsightsFilters } from "../filters";
import { COMPARE_KEYS, COMPARE_LABELS, PERIOD_KEYS, PERIOD_LABELS, type ComparePick, type FiltersOut, type PeriodKey } from "../types";

const chip = (checked: boolean) =>
  cn(
    "inline-flex h-10 cursor-pointer items-center gap-2 rounded-ctl border px-3 text-sm font-medium transition-colors focus-within:ring-2 focus-within:ring-slate-nav focus-within:ring-offset-2 focus-within:ring-offset-ivory",
    checked ? "border-slate-nav bg-slate-nav/10 text-ink-heading" : "border-line bg-white text-ink hover:border-slate-nav/40",
  );

function FilterControls({ filters, options }: { filters: InsightsFilters; options?: FiltersOut }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const { state } = filters;
  const periods: { key: string; label: string }[] = options
    ? [...options.presets.map((p) => ({ key: p.key, label: p.label })), { key: "custom", label: PERIOD_LABELS.custom }]
    : PERIOD_KEYS.map((k) => ({ key: k, label: PERIOD_LABELS[k] }));
  const compareOptions: { key: string; label: string }[] = options?.compare_options ?? COMPARE_KEYS.map((k) => ({ key: k, label: COMPARE_LABELS[k] }));
  const current = state.period ?? options?.default_period ?? "this_month";
  const compare = state.compare ?? options?.default_compare ?? "previous";
  const labs = options?.labs ?? [];

  function pickPeriod(key: string) {
    if (key === "custom") {
      const base = options?.presets.find((p) => p.key === current);
      filters.update({ period: "custom", from: state.from ?? base?.start ?? null, to: state.to ?? base?.end ?? null });
    } else {
      filters.update({ period: key as PeriodKey, from: null, to: null });
    }
  }

  function toggleLab(key: string) {
    const next = state.labs.includes(key) ? state.labs.filter((k) => k !== key) : [...state.labs, key];
    filters.update({ labs: next.length === labs.length ? [] : next });
  }

  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="mb-1.5 text-[13px] font-semibold text-ink-heading">Period</legend>
        <div role="radiogroup" aria-label="Period" className="flex flex-wrap gap-2">
          {periods.map((p) => {
            const checked = current === p.key;
            return (
              <label key={p.key} className={chip(checked)}>
                <input type="radio" name={`${uid}-period`} className="sr-only" checked={checked} onChange={() => pickPeriod(p.key)} />
                {checked && <Check className="size-4" aria-hidden />}
                {p.label}
              </label>
            );
          })}
        </div>
      </fieldset>

      {current === "custom" && (
        <div className="grid gap-3 sm:grid-cols-2 sm:max-w-md">
          <Field label="From" htmlFor={`${uid}-from`}>
            <Input id={`${uid}-from`} type="date" value={state.from ?? ""} min={options?.earliest_data_date ?? undefined} max={options?.today}
              onChange={(e) => filters.update({ period: "custom", from: e.target.value || null })} />
          </Field>
          <Field label="To" htmlFor={`${uid}-to`} error={filters.rangeError && state.from && state.to ? filters.rangeError : undefined}
            hint={!state.from || !state.to ? "Choose both dates to see the numbers." : undefined}>
            <Input id={`${uid}-to`} type="date" value={state.to ?? ""} min={state.from ?? options?.earliest_data_date ?? undefined} max={options?.today}
              onChange={(e) => filters.update({ period: "custom", to: e.target.value || null })} />
          </Field>
        </div>
      )}

      {labs.length > 0 && (
        <fieldset>
          <legend className="mb-1.5 text-[13px] font-semibold text-ink-heading">Labs</legend>
          <div className="flex flex-wrap gap-2">
            <label className={chip(state.labs.length === 0)}>
              <input type="checkbox" className="sr-only" checked={state.labs.length === 0} onChange={() => filters.update({ labs: [] })} />
              {state.labs.length === 0 && <Check className="size-4" aria-hidden />}
              All labs
            </label>
            {labs.map((l) => {
              const checked = state.labs.includes(l.key);
              return (
                <label key={l.key} className={chip(checked)}>
                  <input type="checkbox" className="sr-only" checked={checked} onChange={() => toggleLab(l.key)} />
                  {checked && <Check className="size-4" aria-hidden />}
                  <span className="size-3 rounded-sm border border-black/10" style={{ backgroundColor: l.color }} aria-hidden />
                  {l.name}
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <Field label="Compare with" htmlFor={`${uid}-compare`} className="w-full sm:w-64">
          <Select id={`${uid}-compare`} value={compare} onChange={(e) => filters.update({ compare: e.target.value as ComparePick })}>
            {compareOptions.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
          </Select>
        </Field>
        <Button variant="ghost" size="sm" onClick={filters.reset}>Reset filters</Button>
      </div>
    </div>
  );
}

/** One shared filter bar: inline on desktop, one "Filters" sheet on phones. State lives in the URL. */
export function FilterBar({ filters, options }: { filters: InsightsFilters; options?: FiltersOut }) {
  const [open, setOpen] = useState(false);
  const d = describeFilters(filters.state, options);

  return (
    <>
      <Card className="hidden md:block">
        <CardBody className="p-4">
          <FilterControls filters={filters} options={options} />
        </CardBody>
      </Card>

      <div className="md:hidden">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="secondary" className="h-auto w-full justify-start gap-3 whitespace-normal py-2.5 text-left">
              <SlidersHorizontal className="size-4 shrink-0" aria-hidden />
              <span className="min-w-0">
                <span className="block">Filters</span>
                <span className="block text-xs font-normal text-ink-muted">{d.period} · {d.labs} · {d.compare}</span>
              </span>
            </Button>
          </DialogTrigger>
          <DialogContent title="Filters" description="Period, labs and comparison apply to every Insights screen.">
            <DialogBody>
              <FilterControls filters={filters} options={options} />
            </DialogBody>
            <DialogFooter>
              <Button variant="ghost" onClick={filters.reset}>Reset</Button>
              <Button variant="primary" onClick={() => setOpen(false)}>Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}