"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppConfig } from "@/core/config/provider";
import { formatMoney } from "@/lib/format";
import { MAX_ROWS, sumCents, type BillRow, type RowError } from "../bill-utils";

/** Tests and their amounts are edited as pairs, because the backend needs one amount for every test. */
export function BillRowsEditor({
  rows, onChange, errors, message, disabled,
}: { rows: BillRow[]; onChange: (rows: BillRow[]) => void; errors?: RowError[]; message?: string; disabled?: boolean }) {
  const { currency } = useAppConfig();
  const update = (i: number, patch: Partial<BillRow>) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const symbol = currency === "INR" ? "₹" : currency;

  return (
    <div>
      <div className="hidden grid-cols-[minmax(0,1fr)_10rem_2.75rem] gap-3 px-1 pb-1.5 text-xs font-semibold text-ink-muted sm:grid">
        <span>Test</span><span>Amount</span><span />
      </div>
      <ul className="space-y-3 sm:space-y-2.5">
        {rows.map((r, i) => {
          const e = errors?.[i];
          return (
            <li key={i} className="grid gap-2 rounded-ctl border border-line/70 bg-ivory/50 p-3 sm:grid-cols-[minmax(0,1fr)_10rem_2.75rem] sm:items-start sm:gap-3 sm:border-0 sm:bg-transparent sm:p-0">
              <div>
                <Input aria-label={`Test ${i + 1} name`} value={r.name} disabled={disabled} invalid={!!e?.name} placeholder="Test name, as printed on the report" onChange={(ev) => update(i, { name: ev.target.value })} />
                {e?.name && <p role="alert" className="mt-1 text-xs font-medium text-danger">Fix this: {e.name}</p>}
              </div>
              <div>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-muted" aria-hidden>{symbol}</span>
                  <Input aria-label={`Test ${i + 1} amount`} value={r.amount} disabled={disabled} invalid={!!e?.amount} inputMode="decimal" placeholder="0" className="pl-7 text-right tabular-nums" onChange={(ev) => update(i, { amount: ev.target.value })} />
                </div>
                {e?.amount && <p role="alert" className="mt-1 text-xs font-medium text-danger">Fix this: {e.amount}</p>}
              </div>
              <Button size="icon" variant="ghost" aria-label={`Remove test ${i + 1}`} disabled={disabled || rows.length === 1} onClick={() => onChange(rows.filter((_, j) => j !== i))}>
                <Trash2 className="h-4 w-4" aria-hidden />
              </Button>
            </li>
          );
        })}
      </ul>
      {message && <p role="alert" className="mt-2 text-xs font-medium text-danger">Fix this: {message}</p>}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <Button size="sm" disabled={disabled || rows.length >= MAX_ROWS} onClick={() => onChange([...rows, { name: "", amount: "" }])}>
          <Plus className="h-4 w-4" aria-hidden />Add test
        </Button>
        <p className="text-sm text-ink-muted">Total <b className="ml-1 font-display text-lg tabular-nums text-ink-heading">{formatMoney(sumCents(rows) / 100, currency)}</b></p>
      </div>
    </div>
  );
}