import Link from "next/link";
import { CalendarDays, FlaskConical, Hash } from "lucide-react";
import { StatusPill } from "@/components/ui/badge";
import type { EntrySummary } from "@/core/api/types";
import { formatAge, formatDate, humanizeKey } from "@/lib/format";

/** Compact entry card used in duplicate lists, customer history and report hints. */
export function EntryMini({ entry, labName, action, href }: { entry: EntrySummary; labName?: string; action?: React.ReactNode; href?: string }) {
  const title = (
    <span className="font-semibold text-ink-heading">{entry.patient_name}</span>
  );
  return (
    <div className="flex flex-col gap-3 rounded-ctl border border-line bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          {href ? <Link href={href} className="hover:underline">{title}</Link> : title}
          <StatusPill status={entry.status} />
        </div>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
          <span className="inline-flex items-center gap-1"><Hash className="h-3 w-3" aria-hidden />{entry.bill_no ?? "—"}</span>
          <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" aria-hidden />{formatDate(entry.registration_date)}</span>
          <span className="inline-flex items-center gap-1"><FlaskConical className="h-3 w-3" aria-hidden />{labName ?? humanizeKey(entry.partner_key)}</span>
          {entry.lab_pid && <span>PID {entry.lab_pid}</span>}
          {entry.age !== null && entry.age !== undefined && <span>{formatAge(entry.age, entry.age_unit)}{entry.gender ? ` · ${entry.gender}` : ""}</span>}
        </p>
        {entry.tests.length > 0 && <p className="mt-1 truncate text-xs text-ink-muted">{entry.tests.join("; ")}</p>}
      </div>
      {action}
    </div>
  );
}
