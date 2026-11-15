"use client";

import Link from "next/link";
import { useQueries } from "@tanstack/react-query";
import { Alert } from "@/components/ui/alert";
import { buttonStyles } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { bgKeys, fetchEntryBill } from "../api";
import type { ParsedOut } from "../types";

/** Duplicate hints after reading a report. The parse response lists entry ids only, so names are fetched for up to 3. */
export function ParsedHints({ parsed }: { parsed: ParsedOut }) {
  const ids = parsed.duplicate_entry_ids.slice(0, 3);
  const results = useQueries({ queries: ids.map((id) => ({ queryKey: bgKeys.entry(id), queryFn: () => fetchEntryBill(id) })) });
  if (!parsed.duplicate_kind || !ids.length) return null;
  const exact = parsed.duplicate_kind === "exact";

  return (
    <Alert kind={exact ? "warning" : "info"} title={exact ? "An entry for this visit already exists" : "Possible existing patient"}>
      {exact ? "Saving will update that entry instead of creating a new one." : "You will be asked to choose if it is the same person."}
      <ul className="mt-2 space-y-2">
        {ids.map((id, i) => {
          const e = results[i]?.data;
          return (
            <li key={id} className="flex flex-wrap items-center justify-between gap-2 rounded-ctl border border-line bg-white p-2.5 text-ink">
              <span className="min-w-0 text-sm">
                <span className="font-semibold text-ink-heading">{e?.patient_name ?? "Loading…"}</span>
                {e && <span className="ml-2 text-xs text-ink-muted">Bill no. {e.bill_no ?? "—"} · {formatDate(e.registration_date)}</span>}
              </span>
              <Link href={`/bill_generator/spectrum/${id}`} className={buttonStyles({ size: "sm" })}>Open bill</Link>
            </li>
          );
        })}
      </ul>
    </Alert>
  );
}