"use client";

import { useMemo, useState } from "react";
import { GitMerge, UserRoundPlus } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { EntryMini } from "@/components/entry-mini";
import type { DuplicateDecision, Resolution } from "@/core/api/types";
import { cn } from "@/lib/utils";

export interface ResolveChoice {
  target_entry_id?: string;
  force_new?: boolean;
  resolutions?: Record<string, Resolution>;
}

const show = (v: unknown) => {
  if (v === null || v === undefined || v === "") return "Empty";
  if (Array.isArray(v)) return v.length ? v.join("; ") : "Empty";
  return String(v);
};

/**
 * PRD 6.2: nothing is ever silently overwritten.
 *  - possible_match: pick the existing entry, or "This is a different patient".
 *  - conflict: for every field where both sides have a different value, staff picks one side.
 */
export function DuplicateDialog({
  decision, labNames, busy, onResolve, onClose,
}: {
  decision: DuplicateDecision | null; labNames: Record<string, string>; busy: boolean;
  onResolve: (c: ResolveChoice) => void; onClose: () => void;
}) {
  const [picks, setPicks] = useState<Record<string, Resolution>>({});
  const conflicts = useMemo(() => decision?.conflicts ?? [], [decision]);
  const allPicked = conflicts.length > 0 && conflicts.every((c) => picks[c.field]);

  const setAll = (r: Resolution) => setPicks(Object.fromEntries(conflicts.map((c) => [c.field, r])));
  const different = decision?.can_force_new && (
    <Button variant="secondary" disabled={busy} onClick={() => onResolve({ force_new: true })}>
      <UserRoundPlus className="h-4 w-4" aria-hidden />This is a different patient
    </Button>
  );

  return (
    <Dialog open={!!decision} onOpenChange={(o) => !o && !busy && onClose()}>
      {decision && (
        <DialogContent
          key={decision.outcome + (decision.match?.id ?? "")}
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
                    <EntryMini
                      entry={m}
                      labName={labNames[m.partner_key]}
                      action={<Button size="sm" variant="slate" disabled={busy} onClick={() => onResolve({ target_entry_id: m.id })}><GitMerge className="h-4 w-4" aria-hidden />Use this entry</Button>}
                    />
                  </li>
                ))}
              </ul>
            )}

            {decision.outcome === "conflict" && (
              <>
                {decision.match && <EntryMini entry={decision.match} labName={labNames[decision.match.partner_key]} />}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-ink-heading">{conflicts.length} field{conflicts.length > 1 ? "s" : ""} to decide</p>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setAll("existing")}>Keep all existing</Button>
                    <Button size="sm" variant="ghost" onClick={() => setAll("incoming")}>Use all new</Button>
                  </div>
                </div>
                <div className="space-y-3">
                  {conflicts.map((c) => {
                    const opts: { v: Resolution; label: string; value: unknown }[] = [
                      { v: "existing", label: "Keep existing", value: c.existing },
                      { v: "incoming", label: "Use new", value: c.incoming },
                    ];
                    const canBoth = Array.isArray(c.existing) && Array.isArray(c.incoming);
                    return (
                      <fieldset key={c.field} className="rounded-ctl border border-line p-3">
                        <legend className="px-1 text-[13px] font-semibold text-ink-heading">{c.label}</legend>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {opts.map((o) => (
                            <label key={o.v} className={cn("flex cursor-pointer gap-2.5 rounded-lg border p-2.5 text-sm transition-colors", picks[c.field] === o.v ? "border-slate-nav bg-slate-nav/5 ring-1 ring-slate-nav" : "border-line hover:border-slate-nav/40")}>
                              <input type="radio" name={`res-${c.field}`} className="mt-1 accent-[#34495E]" checked={picks[c.field] === o.v} onChange={() => setPicks((p) => ({ ...p, [c.field]: o.v }))} />
                              <span className="min-w-0">
                                <span className="block text-xs font-semibold text-ink-muted">{o.label}</span>
                                <span className="block break-words text-ink-heading">{show(o.value)}</span>
                              </span>
                            </label>
                          ))}
                        </div>
                        {canBoth && (
                          <label className={cn("mt-2 flex cursor-pointer items-center gap-2.5 rounded-lg border p-2.5 text-sm", picks[c.field] === "both" ? "border-slate-nav bg-slate-nav/5 ring-1 ring-slate-nav" : "border-line hover:border-slate-nav/40")}>
                            <input type="radio" name={`res-${c.field}`} className="accent-[#34495E]" checked={picks[c.field] === "both"} onChange={() => setPicks((p) => ({ ...p, [c.field]: "both" }))} />
                            <span className="font-semibold">Keep both lists combined</span>
                          </label>
                        )}
                      </fieldset>
                    );
                  })}
                </div>
              </>
            )}
          </DialogBody>
          <DialogFooter className="sm:justify-between">
            <div>{different}</div>
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
      )}
    </Dialog>
  );
}
