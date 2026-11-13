import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: string;
  align?: "left" | "right";
  cell: (row: T) => ReactNode;
  /** Shown in the totals row. */
  total?: ReactNode;
}

/** Table on wide screens; on phones each row becomes a small card (or scrolls sideways when `mobile="scroll"`). */
export function DataTable<T>({
  columns, rows, rowKey, caption, totals = false, totalLabel = "Total", mobile = "cards", className,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  caption: string;
  totals?: boolean;
  totalLabel?: string;
  mobile?: "cards" | "scroll";
  className?: string;
}) {
  const [first, ...rest] = columns;
  const align = (c: Column<T>) => (c.align === "right" ? "text-right tabular-nums" : "text-left");

  const table = (
    <div className={cn("scroll-x", mobile === "cards" && "hidden md:block", className)}>
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col" className={cn("whitespace-nowrap border-b border-line px-3 py-2 text-[13px] font-semibold text-ink-muted", align(c))}>{c.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={rowKey(r, i)} className="border-b border-line/60 last:border-0">
              {columns.map((c, ci) =>
                ci === 0 ? (
                  <th key={c.key} scope="row" className="px-3 py-2.5 text-left font-medium text-ink-heading">{c.cell(r)}</th>
                ) : (
                  <td key={c.key} className={cn("px-3 py-2.5", align(c))}>{c.cell(r)}</td>
                ),
              )}
            </tr>
          ))}
        </tbody>
        {totals && (
          <tfoot>
            <tr className="border-t-2 border-line font-semibold text-ink-heading">
              {columns.map((c, ci) => (
                <td key={c.key} className={cn("px-3 py-2.5", align(c))}>{c.total ?? (ci === 0 ? totalLabel : "")}</td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );

  if (mobile === "scroll") return table;

  return (
    <>
      {table}
      <ul className="space-y-2 md:hidden" aria-label={caption}>
        {rows.map((r, i) => (
          <li key={rowKey(r, i)} className="rounded-ctl border border-line bg-white p-3">
            <p className="text-sm font-semibold text-ink-heading">{first.cell(r)}</p>
            <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
              {rest.map((c) => (
                <div key={c.key}>
                  <dt className="text-xs text-ink-muted">{c.header}</dt>
                  <dd className="tabular-nums text-ink-heading">{c.cell(r)}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
        {totals && (
          <li className="rounded-ctl border-2 border-line bg-ivory p-3">
            <p className="text-sm font-semibold text-ink-heading">{first.total ?? totalLabel}</p>
            <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
              {rest.map((c) => (
                <div key={c.key}>
                  <dt className="text-xs text-ink-muted">{c.header}</dt>
                  <dd className="font-semibold tabular-nums text-ink-heading">{c.total ?? ""}</dd>
                </div>
              ))}
            </dl>
          </li>
        )}
      </ul>
    </>
  );
}