"use client";

import { Check, FlaskConical } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/misc";
import { usePartners } from "@/core/shell/tiles";
import { cn } from "@/lib/utils";

/** Lab first (PRD 6.4): cards come from partner YAML via /config/partners?module=<key>. */
export function LabSelector({ module, value, onChange }: { module: string; value?: string | null; onChange: (key: string) => void }) {
  const { data, isLoading, error } = usePartners(module);

  if (isLoading)
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 rounded-card" />)}
      </div>
    );
  if (error) return <Alert kind="error" title="Could not load laboratories">{(error as Error).message}</Alert>;
  if (!data?.length)
    return (
      <Alert kind="warning" title="No laboratory is open to you here">
        Ask an admin to grant access to a lab in this module.
      </Alert>
    );

  return (
    <div role="radiogroup" aria-label="Laboratory" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {data.map((lab) => {
        const on = value === lab.key;
        return (
          <button
            key={lab.key}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(lab.key)}
            className={cn(
              "group relative flex min-h-32 flex-col justify-between overflow-hidden rounded-card border bg-white p-5 text-left shadow-card transition-all",
              on ? "border-slate-nav ring-2 ring-slate-nav" : "border-line hover:-translate-y-0.5 hover:border-slate-nav/50",
            )}
          >
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-slate-nav/10 text-slate-nav"><FlaskConical className="size-5" aria-hidden /></span>
            <span>
              <span className="block font-display text-lg font-semibold text-ink-heading">{lab.name}</span>
              <span className="text-[13px] text-ink-muted">{lab.key.replace(/_/g, " ")}</span>
            </span>
            {on && <span className="absolute right-3 top-3 grid size-7 place-items-center rounded-full bg-slate-nav text-white"><Check className="size-4" aria-label="Selected" /></span>}
          </button>
        );
      })}
    </div>
  );
}
