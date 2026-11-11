import { cn } from "@/lib/utils";

export function BillTag({ billNo, className }: { billNo?: string | null; className?: string }) {
  return (
    <span
      title={billNo ? `Bill no. ${billNo}` : "Bill number is assigned when the entry is saved"}
      className={cn("inline-flex h-7 items-stretch overflow-hidden rounded-md border border-line bg-white align-middle font-mono text-[13px] text-ink-heading", className)}
    >
      <span
        aria-hidden
        className="w-2.5 shrink-0 border-r border-dashed border-line bg-slate-nav"
        style={{ backgroundImage: "repeating-linear-gradient(90deg, transparent 0 2px, rgb(255 255 255 / 0.55) 2px 3px)" }}
      />
      <span className="flex items-center gap-2 px-2.5 tabular-nums">
        <span className="font-sans text-[11px] font-medium text-ink-muted">Bill</span>
        <span className="font-medium tracking-wide">{billNo ?? "—"}</span>
      </span>
    </span>
  );
}
