import { cn } from "@/lib/utils";

export function BillTag({ billNo, className, size = "default" }: { billNo?: string | null; className?: string; size?: "default" | "large" }) {
  const large = size === "large";
  return (
    <span
      title={billNo ? `Bill no. ${billNo}` : "Bill number is assigned when the entry is saved"}
      className={cn("inline-flex items-stretch overflow-hidden border border-line bg-white align-middle font-mono text-ink-heading", large ? "h-10 rounded-lg text-base" : "h-7 rounded-md text-[13px]", className)}
    >
      <span
        aria-hidden
        className={cn("shrink-0 border-r border-dashed border-line bg-slate-nav", large ? "w-3" : "w-2.5")}
        style={{ backgroundImage: "repeating-linear-gradient(90deg, transparent 0 2px, rgb(255 255 255 / 0.55) 2px 3px)" }}
      />
      <span className={cn("flex items-center tabular-nums", large ? "gap-2.5 px-3" : "gap-2 px-2.5")}>
        <span className={cn("font-sans font-medium text-ink-muted", large ? "text-xs" : "text-[11px]")}>Bill</span>
        <span className="font-medium tracking-wide">{billNo ?? "—"}</span>
      </span>
    </span>
  );
}
