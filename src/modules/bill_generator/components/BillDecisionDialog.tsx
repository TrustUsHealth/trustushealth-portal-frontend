"use client";

import { useMemo, useState } from "react";
import { GitMerge, UserRoundPlus } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogFooter } from "@/components/ui/dialog";
import type { Resolution } from "@/core/api/types";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { BillDecision, BillSummary } from "../types";

export interface BillResolveChoice {
  target_entry_id?: string;
  force_new?: boolean;
  resolutions?: Record<string, Resolution>;
}

const show = (v: unknown) => {
  if (v === null || v === undefined || v === "") return "Empty";
  if (Array.isArray(v)) return v.length ? v.join("; ") : "Empty";
  return String(v);
};

/** The backend only merges "both" for `tests`, and tests must stay one-to-one with amounts, so only existing/incoming are offered. */
const LINKED: Record<string, string> = { tests: "test_amounts", test_amounts: "tests" };

function SummaryLine({ entry, action }: { entry: BillSummary; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-ctl border border-line bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-semibold text-ink-heading">{entry.patient_name ?? "Unnamed patient"}</p>
        <p className="text-xs text-ink-muted">Bill no. {entry.bill_no ?? "—"} · {formatDate(entry.registration_date)}</p>
      </div>
      {action}
    </div>
  );
}

function Body({ decision, busy, onResolve, onClose }: { decision: BillDecision; busy: boolean; onResolve: (c: BillResolveChoice) => void; onClose: () => void }) {
  const [picks, setPicks] = useState<Record<string, Resolution>>({});
  const conflicts = useMemo(() => decision.conflicts ?? [], [decision]);
  const allPicked = conflicts.length > 0 && conflicts.every((c) => picks[c.field]);

  const pick = (field: string, r: Resolution) =>
    setPicks((p) => {
      const next = { ...p, [field]: r };
      const twin = LINKED[field];
      if (twin && conflicts.some((c) => c.field === twin)) next[twin] = r;
      return next;
    });
  const setAll = (r: Resolution) => setPicks(Object.fromEntries(conflicts.map((c) => [c.field, r])));
  const touchesTests = conflicts.some((c) => c.field in LINKED);

  return (
    <DialogContent
      title={decision.outcome === "conflict" ? "Same visit found, values differ" : "This may be an existing patient"}
      description="Same lab and same registration date. Nothing is saved until you choose."
      className="md:!w-[min(94vw,44rem)]"
    >
      <DialogBody className="space-y-4">
        <Alert kind={decision.outcome === "conflict" ? "warning" : "info"} title={decision.outcome === "conflict" ? "Choose which value to keep" : "Pick the matching entry"}>
          {decision.message}
        </Alert>

        {decision.outcome === "possible_match" && (
          <ul className="space-y-2">
            {decision.possible_matches.map((m) => (
              <li key={m.id}>
                <SummaryLine entry={m} action={<Button size="sm" variant="slate" disabled={busy} onClick={() => onResolve({ target_entry_id: m.id })}><GitMerge className="h-4 w-4" aria-hidden />Use this entry</Button>} />
              </li>
            ))}
          </ul>
        )}

        {decision.outcome === "conflict" && (
          <>
            {decision.match && <SummaryLine entry={decision.match} />}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-ink-heading">{conflicts.length} field{conflicts.length > 1 ? "s" : ""} to decide</p>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => setAll("existing")}>Keep all existing</Button>
                <Button size="sm" variant="ghost" onClick={() => setAll("incoming")}>Use all new</Button>
              </div>
            </div>
            {touchesTests && <p className="text-xs text-ink-muted">Tests and their amounts are chosen together, because every test needs exactly one amount.</p>}
            <div className="space-y-3">
              {conflicts.map((c) => {
                const opts: { v: Resolution; label: string; value: unknown }[] = [
                  { v: "existing", label: "Keep existing", value: c.existing },
                  { v: "incoming", label: "Use new", value: c.incoming },
                ];
                return (
                  <fieldset key={c.field} className="rounded-ctl border border-line p-3">
                    <legend className="px-1 text-[13px] font-semibold text-ink-heading">{c.label}</legend>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {opts.map((o) => (
                        <label key={o.v} className={cn("flex cursor-pointer gap-2.5 rounded-lg border p-2.5 text-sm transition-colors", picks[c.field] === o.v ? "border-slate-nav bg-slate-nav/5 ring-1 ring-slate-nav" : "border-line hover:border-slate-nav/40")}>
                          <input type="radio" name={`res-${c.field}`} className="mt-1 accent-[#34495E]" checked={picks[c.field] === o.v} onChange={() => pick(c.field, o.v)} />
                          <span className="min-w-0">
                            <span className="block text-xs font-semibold text-ink-muted">{o.label}</span>
                            <span className="block break-words text-ink-heading">{show(o.value)}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                );
              })}
            </div>
          </>
        )}
      </DialogBody>
      <DialogFooter className="sm:justify-between">
        <div>
          {decision.can_force_new && (
            <Button variant="secondary" disabled={busy} onClick={() => onResolve({ force_new: true })}>
              <UserRoundPlus className="h-4 w-4" aria-hidden />This is a different patient
            </Button>
          )}
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button onClick={onClose} disabled={busy}>Back to form</Button>
          {decision.outcome === "conflict" && decision.match && (
            <Button variant="primary" loading={busy} disabled={!allPicked} onClick={() => onResolve({ target_entry_id: decision.match!.id, resolutions: picks })}>
              Save with these choices
            </Button>
          )}
        </div>
      </DialogFooter>
    </DialogContent>
  );
}

/** Duplicate resolver for the bill page (PRD 6.2): nothing is ever silently overwritten. */
export function BillDecisionDialog({
  decision, busy, onResolve, onClose,
}: { decision: BillDecision | null; busy: boolean; onResolve: (c: BillResolveChoice) => void; onClose: () => void }) {
  return (
    <Dialog open={!!decision} onOpenChange={(o) => !o && !busy && onClose()}>
      {decision && <Body key={decision.outcome + (decision.match?.id ?? "")} decision={decision} busy={busy} onResolve={onResolve} onClose={onClose} />}
    </Dialog>
  );
}