"use client";

import { Inbox } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { useInsightsFilterOptions, useInsightsTab } from "../api";
import { useInsightsFilters } from "../filters";
import { formatCount, grainWord, hoursText, inr, pct } from "../format";
import type { LabsOut, TurnaroundRow, VisitsByLabPoint } from "../types";
import { BarRows, ColumnChart, Legend, PATTERN_CYCLE, TOKENS, describeSeries, type BarRow, type Series } from "./charts";
import { ChartCard } from "./ChartCard";
import { DataTable, type Column } from "./DataTable";
import { InsightsFrame } from "./InsightsFrame";

function Swatch({ color }: { color: string }) {
  return <span className="size-3 shrink-0 rounded-sm border border-black/10" style={{ backgroundColor: color }} aria-hidden />;
}

function Body({ d }: { d: LabsOut }) {
  const labSeries: Series[] = d.visits_by_lab.labs.map((l, i) => ({ id: l.lab, label: l.name, color: l.color, pattern: PATTERN_CYCLE[i % PATTERN_CYCLE.length] }));
  const points = d.visits_by_lab.points;
  const totals = points.map((p) => Object.values(p.counts).reduce((a, b) => a + b, 0));

  const visitCols: Column<VisitsByLabPoint>[] = [
    { key: "label", header: grainWord(d.grain)[0].toUpperCase() + grainWord(d.grain).slice(1), cell: (p) => p.label },
    ...d.visits_by_lab.labs.map((l) => ({ key: l.lab, header: l.name, align: "right" as const, cell: (p: VisitsByLabPoint) => formatCount(p.counts[l.lab] ?? 0) })),
    { key: "total", header: "All labs", align: "right", cell: (p) => formatCount(Object.values(p.counts).reduce((a, b) => a + b, 0)) },
  ];

  const MEDIAN = { id: "median", label: "Median", color: TOKENS.slate, pattern: "solid" } as const satisfies Series;
  const SLOWEST = { id: "slowest", label: "Slowest 10%", color: TOKENS.slate, pattern: "hatch" } as const satisfies Series;
  const maxHours = Math.max(0, ...d.turnaround.flatMap((t) => [t.median_hours ?? 0, t.slowest_10_hours ?? 0]));
  const turnRows: BarRow[] = d.turnaround.map((t) => ({
    key: t.lab,
    label: <span className="inline-flex items-center gap-2"><Swatch color={t.color} />{t.name}</span>,
    caption: `${formatCount(t.sample)} reports measured`,
    segments: [
      { series: { id: `${t.lab}-median`, label: "Median", color: t.color, pattern: "solid" }, value: t.median_hours ?? 0, text: t.median_display },
      { series: { id: `${t.lab}-slowest`, label: "Slowest 10%", color: t.color, pattern: "hatch" }, value: t.slowest_10_hours ?? 0, text: t.slowest_10_display },
    ],
  }));
  const turnCols: Column<TurnaroundRow>[] = [
    { key: "lab", header: "Lab", cell: (t) => t.name },
    { key: "median", header: "Median", align: "right", cell: (t) => t.median_display },
    { key: "slow", header: "Slowest 10%", align: "right", cell: (t) => t.slowest_10_display },
    { key: "n", header: "Reports measured", align: "right", cell: (t) => formatCount(t.sample) },
  ];

  const cs = d.lab_cost_statement;
  type MonthRow = { key: string; label: string; byLab: Record<string, string>; total: string };
  const monthRows: MonthRow[] = cs.months.map((m) => ({
    key: m.key,
    label: m.label,
    byLab: Object.fromEntries(cs.rows.map((r) => [r.lab, r.cells[m.key] ?? "0.00"])),
    total: cs.totals[m.key] ?? "0.00",
  }));
  const costCols: Column<MonthRow>[] = [
    { key: "month", header: "Month", cell: (r) => r.label, total: "Total" },
    ...cs.rows.map((r) => ({ key: r.lab, header: r.name, align: "right" as const, cell: (row: MonthRow) => inr(row.byLab[r.lab]), total: inr(r.total) })),
    { key: "all", header: "All labs", align: "right", cell: (r) => inr(r.total), total: inr(cs.grand_total) },
  ];

  if (d.empty) {
    return <EmptyState icon={Inbox} title={d.empty_message ?? "No visits in this period"}>Try another period or lab.</EmptyState>;
  }

  return (
    <>
      <section aria-label="Lab cards" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {d.lab_cards.map((c) => (
          <Card key={c.lab} className="p-4">
            <h3 className="flex items-center gap-2 text-base font-semibold"><Swatch color={c.color} />{c.name}</h3>
            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5 text-sm">
              <div><dt className="text-xs text-ink-muted">Visits</dt><dd className="font-display text-xl font-semibold tabular-nums text-ink-heading">{formatCount(c.visits)}</dd></div>
              <div><dt className="text-xs text-ink-muted">Billed Revenue</dt><dd className="font-display text-xl font-semibold tabular-nums text-ink-heading">{inr(c.billed_revenue)}</dd></div>
              <div><dt className="text-xs text-ink-muted">Margin %</dt><dd className="font-display text-xl font-semibold tabular-nums text-ink-heading">{pct(c.margin_pct)}</dd></div>
              <div><dt className="text-xs text-ink-muted">Median Turnaround</dt><dd className="font-display text-xl font-semibold tabular-nums text-ink-heading">{c.median_turnaround_display}</dd></div>
            </dl>
          </Card>
        ))}
      </section>

      <ChartCard
        title="Visits by Lab"
        description={`Volume mix and trend per ${grainWord(d.grain)}.`}
        table={<DataTable columns={visitCols} rows={points} rowKey={(p) => p.key} caption="Visits by lab and period" />}
      >
        <ColumnChart
          points={points}
          stacked
          integer
          bars={labSeries.map((s) => ({ series: s, values: points.map((p) => p.counts[s.id] ?? 0) }))}
          format={(n) => formatCount(n)}
          summary={describeSeries("Visits across all labs", points.map((p) => p.label), totals, formatCount)}
        />
        <Legend items={labSeries.map((s) => ({ label: s.label, series: s }))} />
      </ChartCard>

      <ChartCard
        title="Report Turnaround by Lab"
        description="Median is the typical report; Slowest 10% is the long tail. Shown in days above 48 hours."
        note="Only visits with both a collection and a report time are counted."
        table={<DataTable columns={turnCols} rows={d.turnaround} rowKey={(t) => t.lab} caption="Report turnaround by lab" />}
      >
        {turnRows.length === 0 ? (
          <p className="text-sm text-ink-muted">No report times recorded in this period.</p>
        ) : (
          <>
            <BarRows
              rows={turnRows}
              mode="grouped"
              max={maxHours || 1}
              summary={`Report turnaround by lab: ${d.turnaround.map((t) => `${t.name} median ${t.median_display}, slowest 10 percent ${t.slowest_10_display}`).join("; ")}.`}
            />
            <Legend items={[{ label: "Median (solid bar)", series: MEDIAN }, { label: "Slowest 10% (hatched bar)", series: SLOWEST }]} />
            <p className="mt-2 text-xs text-ink-muted">Longest bar: {hoursText(maxHours)}.</p>
          </>
        )}
      </ChartCard>

      {cs.months.length > 0 && (
        <Card>
          <CardHeader title="Lab Cost Statement" description="Lab Cost per lab per month, to check against each lab's invoice." />
          <CardBody>
            <DataTable columns={costCols} rows={monthRows} rowKey={(r) => r.key} caption="Lab cost statement by month and lab" totals mobile="scroll" />
          </CardBody>
        </Card>
      )}
    </>
  );
}

export function LabsView() {
  const filters = useInsightsFilters();
  const options = useInsightsFilterOptions();
  const query = useInsightsTab<LabsOut>("labs", filters);
  return (
    <InsightsFrame tab="labs" endpoint="labs" title="Labs" question="Which lab is delivering?" filters={filters} options={options.data} query={query}>
      {(d) => <Body d={d} />}
    </InsightsFrame>
  );
}