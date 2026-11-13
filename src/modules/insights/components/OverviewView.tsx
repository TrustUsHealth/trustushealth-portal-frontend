"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, Inbox } from "lucide-react";
import { Pill } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { useInsightsFilterOptions, useInsightsTab } from "../api";
import { useInsightsFilters, type InsightsFilters } from "../filters";
import { compactInr, formatCount, grainWord, inr, pct } from "../format";
import type { AttentionChip, FiltersOut, OverviewOut, RevenueByLab, TrendPoint } from "../types";
import { ColumnChart, Donut, Legend, PATTERN_CYCLE, TOKENS, describeSeries, type DonutSlice, type Series } from "./charts";
import { ChartCard } from "./ChartCard";
import { DataTable, type Column } from "./DataTable";
import { HighlightList } from "./HighlightList";
import { InsightsFrame } from "./InsightsFrame";
import { KpiGrid } from "./KpiCard";

const REVENUE: Series = { id: "revenue", label: "Billed Revenue (bars)", color: TOKENS.slate, pattern: "solid" };
const MARGIN: Series = { id: "margin", label: "Margin (line)", color: TOKENS.info };

/** The backend sends /insights/finance#below-cost; the PRD says the chip opens the review list, so that one goes there. */
function attentionHref(chip: AttentionChip, search: string): string {
  if (chip.link.startsWith("/insights/finance#below-cost")) return `/insights/below-cost${search}`;
  if (chip.link.startsWith("/insights")) {
    const [path, hash] = chip.link.split("#");
    return `${path}${search}${hash ? `#${hash}` : ""}`;
  }
  return chip.link;
}

function Attention({ chips, filters }: { chips: AttentionChip[]; filters: InsightsFilters }) {
  return (
    <section aria-label="Needs attention">
      <h3 className="mb-2 text-base font-semibold">Needs attention</h3>
      <ul className="grid gap-3 sm:grid-cols-3">
        {chips.map((c) => (
          <li key={c.key}>
            <Link href={attentionHref(c, filters.search)} className="group flex h-full items-center justify-between gap-3 rounded-card border border-line/80 bg-white p-4 shadow-card transition-colors hover:border-slate-nav/50">
              <span className="min-w-0">
                <span className="block font-display text-2xl font-semibold tabular-nums text-ink-heading">{formatCount(c.count)}</span>
                <span className="block text-sm text-ink">{c.label}</span>
                {c.count > 0 ? (
                  <Pill className="mt-1.5 border-warn/30 bg-warn-soft text-warn"><AlertTriangle className="size-3" aria-hidden />Needs a look</Pill>
                ) : (
                  <Pill className="mt-1.5 border-ok/25 bg-ok-soft text-ok"><CheckCircle2 className="size-3" aria-hidden />All clear</Pill>
                )}
              </span>
              <ArrowRight className="size-5 shrink-0 text-ink-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Body({ d, filters, options }: { d: OverviewOut; filters: InsightsFilters; options?: FiltersOut }) {
  const compareColor = options?.palette.compare_line ?? TOKENS.muted;
  const showCompare = !!d.compare_range && d.trend.some((p) => p.compare_billed_revenue !== null && p.compare_billed_revenue !== undefined);
  const compareSeries: Series = { id: "compare", label: `Billed Revenue, ${d.compare_range?.label ?? "earlier period"} (dashed)`, color: compareColor };
  const labels = d.trend.map((p) => p.label);
  const revenue = d.trend.map((p) => Number(p.billed_revenue));
  const margin = d.trend.map((p) => Number(p.margin));
  const totalRevenue = d.revenue_by_lab.reduce((a, r) => a + Number(r.billed_revenue), 0);

  const trendCols: Column<TrendPoint>[] = [
    { key: "label", header: grainWord(d.grain)[0].toUpperCase() + grainWord(d.grain).slice(1), cell: (p) => p.label },
    { key: "rev", header: "Billed Revenue", align: "right", cell: (p) => inr(p.billed_revenue) },
    { key: "margin", header: "Margin", align: "right", cell: (p) => inr(p.margin) },
    ...(showCompare ? [{ key: "cmp", header: "Earlier Billed Revenue", align: "right" as const, cell: (p: TrendPoint) => inr(p.compare_billed_revenue) }] : []),
  ];
  const labCols: Column<RevenueByLab>[] = [
    { key: "lab", header: "Lab", cell: (r) => r.name },
    { key: "share", header: "Share", align: "right", cell: (r) => pct(r.share_pct) },
    { key: "rev", header: "Billed Revenue", align: "right", cell: (r) => inr(r.billed_revenue) },
    { key: "visits", header: "Visits", align: "right", cell: (r) => formatCount(r.visits) },
  ];
  const slices: DonutSlice[] = d.revenue_by_lab.map((r, i) => ({
    key: r.lab,
    label: r.name,
    value: Number(r.billed_revenue),
    color: r.color,
    pattern: PATTERN_CYCLE[i % PATTERN_CYCLE.length],
    detail: `${pct(r.share_pct)} · ${inr(r.billed_revenue)} · ${formatCount(r.visits)} visits`,
  }));

  return (
    <>
      <KpiGrid kpis={d.kpis} />
      {d.empty ? (
        <EmptyState icon={Inbox} title={d.empty_message ?? "No billed visits in this period"}>
          Try another period or lab. Visits awaiting billing still show below.
        </EmptyState>
      ) : (
        <HighlightList items={d.highlights} />
      )}
      <Attention chips={d.attention} filters={filters} />
      {!d.empty && (
        <>
          <ChartCard
            title="Revenue and Margin"
            description={`Billed Revenue per ${grainWord(d.grain)} with Margin as a line.`}
            note="Margin counts only visits that have a Lab Cost."
            table={<DataTable columns={trendCols} rows={d.trend} rowKey={(p) => p.key} caption="Revenue and Margin by period" />}
          >
            <ColumnChart
              points={d.trend}
              bars={[{ series: REVENUE, values: revenue }]}
              lines={[
                { series: MARGIN, values: margin },
                ...(showCompare
                  ? [{ series: compareSeries, dashed: true, values: d.trend.map((p) => (p.compare_billed_revenue === null || p.compare_billed_revenue === undefined ? null : Number(p.compare_billed_revenue))) }]
                  : []),
              ]}
              format={compactInr}
              summary={`${describeSeries("Billed Revenue", labels, revenue, inr)} ${describeSeries("Margin", labels, margin, inr)}`}
            />
            <Legend items={[
              { label: REVENUE.label, series: REVENUE },
              { label: MARGIN.label, line: { color: MARGIN.color } },
              ...(showCompare ? [{ label: compareSeries.label, line: { color: compareColor, dashed: true } }] : []),
            ]} />
          </ChartCard>

          <ChartCard
            title="Revenue by Lab"
            description="Share of Billed Revenue, with visits beside each lab."
            table={<DataTable columns={labCols} rows={d.revenue_by_lab} rowKey={(r) => r.lab} caption="Revenue by lab" />}
          >
            {slices.length === 0 ? (
              <p className="text-sm text-ink-muted">No revenue to split between labs.</p>
            ) : (
              <Donut
                slices={slices}
                centerLabel="Billed Revenue"
                centerValue={compactInr(totalRevenue)}
                summary={`Billed Revenue by lab: ${d.revenue_by_lab.map((r) => `${r.name} ${pct(r.share_pct)}`).join(", ")}.`}
              />
            )}
          </ChartCard>
        </>
      )}
    </>
  );
}

export function OverviewView() {
  const filters = useInsightsFilters();
  const options = useInsightsFilterOptions();
  const query = useInsightsTab<OverviewOut>("overview", filters);
  return (
    <InsightsFrame tab="overview" endpoint="overview" title="Overview" question="How are we doing?" filters={filters} options={options.data} query={query}>
      {(d) => <Body d={d} filters={filters} options={options.data} />}
    </InsightsFrame>
  );
}