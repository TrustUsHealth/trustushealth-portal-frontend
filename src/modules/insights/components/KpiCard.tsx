import { Pill } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { deltaParts, kpiCompareValue, kpiValue } from "../format";
import type { Kpi } from "../types";
import { Sparkline } from "./charts";

export function KpiCard({ kpi, badge }: { kpi: Kpi; badge?: string }) {
  const value = kpiValue(kpi);
  const before = kpiCompareValue(kpi);
  const delta = deltaParts(kpi.kind, kpi.direction, kpi.delta_pct);
  const spark = kpi.sparkline.length > 1
    ? `${kpi.label} trend over the period, from ${kpi.sparkline[0]} to ${kpi.sparkline[kpi.sparkline.length - 1]}`
    : "";

  return (
    <Card className="flex min-w-0 flex-col p-3.5 md:p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] font-medium text-ink-muted">{kpi.label}</p>
        {badge && <Pill className="border-info/25 bg-info-soft text-info">{badge}</Pill>}
      </div>
      <p className="mt-1 break-words font-display text-2xl font-semibold tabular-nums leading-tight text-ink-heading md:text-3xl">{value}</p>
      {kpi.detail && <p className="mt-0.5 text-[13px] text-ink-muted">{kpi.detail}</p>}
      <div className="mt-2 flex flex-wrap items-end justify-between gap-2">
        <p className="text-[13px] text-ink">
          {delta ? (
            <>
              {delta.glyph && <span aria-hidden className="mr-1">{delta.glyph}</span>}
              <span className="font-semibold">{delta.text}</span>
              {before && kpi.direction !== "new" && <span className="block text-xs text-ink-muted">Earlier: {before}</span>}
              {kpi.direction === "new" && <span className="block text-xs text-ink-muted">Nothing in the earlier period</span>}
            </>
          ) : (
            <span className="text-xs text-ink-muted">Comparison off</span>
          )}
        </p>
        {spark && <Sparkline values={kpi.sparkline} label={spark} />}
      </div>
    </Card>
  );
}

export function KpiGrid({ kpis, badges }: { kpis: Kpi[]; badges?: Record<string, string> }) {
  return (
    <section aria-label="Key numbers" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {kpis.map((k) => <KpiCard key={k.key} kpi={k} badge={badges?.[k.key]} />)}
    </section>
  );
}