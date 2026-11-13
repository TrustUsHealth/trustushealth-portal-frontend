"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, Inbox } from "lucide-react";
import { Pill } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { cn } from "@/lib/utils";
import { useInsightsFilterOptions, useInsightsTab } from "../api";
import { useInsightsFilters, type InsightsFilters } from "../filters";
import { compactInr, formatCount, grainWord, inr, pct } from "../format";
import type { DiscountPoint, FiltersOut, FinanceOut, LabFinanceRow, MoneySplit } from "../types";
import { BarRows, ColumnChart, Legend, TOKENS, describeSeries, type BarRow, type Series } from "./charts";
import { ChartCard } from "./ChartCard";
import { DataTable, type Column } from "./DataTable";
import { InsightsFrame } from "./InsightsFrame";
import { KpiGrid } from "./KpiCard";

const LAB_COST: Series = { id: "lab_cost", label: "Lab Cost", color: TOKENS.slateLight, pattern: "hatch" };
const MARGIN: Series = { id: "margin", label: "Margin", color: TOKENS.info, pattern: "solid" };
const NO_COST: Series = { id: "no_cost", label: "Revenue without a Lab Cost", color: TOKENS.muted, pattern: "dots" };
const DISCOUNTS: Series = { id: "discounts", label: "Discounts Given (bars)", color: TOKENS.slate, pattern: "solid" };
const RATE: Series = { id: "rate", label: "Discount Rate (line, right axis)", color: TOKENS.info };

function LabName({ name, color }: { name: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="size-3 shrink-0 rounded-sm border border-black/10" style={{ backgroundColor: color }} aria-hidden />
      {name}
    </span>
  );
}

function Stat({ label, value, children, id }: { label: string; value: string; children?: React.ReactNode; id?: string }) {
  return (
    <Card id={id} className={cn("scroll-mt-24 p-4")}>
      <p className="text-[13px] font-medium text-ink-muted">{label}</p>
      <p className="mt-0.5 font-display text-2xl font-semibold tabular-nums text-ink-heading">{value}</p>
      {children && <div className="mt-2">{children}</div>}
    </Card>
  );
}

function Body({ d, filters, options }: { d: FinanceOut; filters: InsightsFilters; options?: FiltersOut }) {
  const labels = d.money_split.map((p) => p.label);
  const hasNoCost = d.money_split.some((p) => Number(p.revenue_no_cost) !== 0);
  const threshold = d.low_margin_threshold_pct;
  const highDiscount = options?.thresholds.high_discount_pct;

  const splitCols: Column<MoneySplit>[] = [
    { key: "label", header: grainWord(d.grain)[0].toUpperCase() + grainWord(d.grain).slice(1), cell: (p) => p.label },
    { key: "rev", header: "Billed Revenue", align: "right", cell: (p) => inr(p.billed_revenue) },
    { key: "cost", header: "Lab Cost", align: "right", cell: (p) => inr(p.lab_cost) },
    { key: "margin", header: "Margin", align: "right", cell: (p) => inr(p.margin) },
    ...(hasNoCost ? [{ key: "nocost", header: "Without Lab Cost", align: "right" as const, cell: (p: MoneySplit) => inr(p.revenue_no_cost) }] : []),
  ];

  const marginRows: BarRow[] = d.margin_by_lab.map((m) => ({
    key: m.lab,
    label: <LabName name={m.name} color={m.color} />,
    segments: [{ series: { id: m.lab, label: m.name, color: m.color, pattern: "solid" }, value: m.margin_pct, text: pct(m.margin_pct) }],
    valueText: pct(m.margin_pct),
    flag: m.below_threshold ? (
      <Pill className="border-warn/30 bg-warn-soft text-warn"><AlertTriangle className="size-3" aria-hidden />Below the {threshold}% limit</Pill>
    ) : undefined,
  }));
  const marginCols: Column<(typeof d.margin_by_lab)[number]>[] = [
    { key: "lab", header: "Lab", cell: (m) => m.name },
    { key: "pct", header: "Margin %", align: "right", cell: (m) => pct(m.margin_pct) },
    { key: "status", header: `Against the ${threshold}% limit`, cell: (m) => (m.below_threshold ? "Below the limit" : "At or above the limit") },
  ];

  const discountCols: Column<DiscountPoint>[] = [
    { key: "label", header: grainWord(d.grain)[0].toUpperCase() + grainWord(d.grain).slice(1), cell: (p) => p.label },
    { key: "amount", header: "Discounts Given", align: "right", cell: (p) => inr(p.discounts) },
    { key: "rate", header: "Discount Rate", align: "right", cell: (p) => pct(p.discount_rate_pct) },
  ];

  const t = d.lab_table.totals;
  const labCols: Column<LabFinanceRow>[] = [
    { key: "lab", header: "Lab", cell: (r) => <LabName name={r.name} color={r.color} />, total: "Total" },
    { key: "visits", header: "Billed Visits", align: "right", cell: (r) => formatCount(r.billed_visits), total: formatCount(t.billed_visits) },
    { key: "rev", header: "Billed Revenue", align: "right", cell: (r) => inr(r.billed_revenue), total: inr(t.billed_revenue) },
    { key: "cost", header: "Lab Cost", align: "right", cell: (r) => inr(r.lab_cost), total: inr(t.lab_cost) },
    { key: "margin", header: "Margin", align: "right", cell: (r) => inr(r.margin), total: inr(t.margin) },
    { key: "mpct", header: "Margin %", align: "right", cell: (r) => pct(r.margin_pct), total: pct(t.margin_pct) },
    { key: "disc", header: "Discount Rate", align: "right", cell: (r) => pct(r.discount_rate_pct), total: pct(t.discount_rate_pct) },
  ];

  return (
    <>
      <KpiGrid kpis={d.kpis} />
      {d.empty ? (
        <EmptyState icon={Inbox} title={d.empty_message ?? "No billed visits in this period"}>
          Finance counts billed visits only. Try another period or lab.
        </EmptyState>
      ) : (
        <>
          <ChartCard
            title="Where the money goes"
            description={`Each bar is Billed Revenue, split into Lab Cost and Margin, per ${grainWord(d.grain)}.`}
            table={<DataTable columns={splitCols} rows={d.money_split} rowKey={(p) => p.key} caption="Where the money goes by period" />}
          >
            <ColumnChart
              points={d.money_split}
              stacked
              bars={[
                { series: LAB_COST, values: d.money_split.map((p) => Number(p.lab_cost)) },
                { series: MARGIN, values: d.money_split.map((p) => Number(p.margin)) },
                ...(hasNoCost ? [{ series: NO_COST, values: d.money_split.map((p) => Number(p.revenue_no_cost)) }] : []),
              ]}
              format={compactInr}
              summary={describeSeries("Billed Revenue split into Lab Cost and Margin", labels, d.money_split.map((p) => Number(p.billed_revenue)), inr)}
            />
            <Legend items={[
              { label: LAB_COST.label, series: LAB_COST },
              { label: MARGIN.label, series: MARGIN },
              ...(hasNoCost ? [{ label: NO_COST.label, series: NO_COST }] : []),
            ]} />
          </ChartCard>

          <ChartCard
            title="Margin % by Lab"
            description="Which lab earns what."
            note={`The vertical marker shows the low-margin limit of ${threshold}%.`}
            table={<DataTable columns={marginCols} rows={d.margin_by_lab} rowKey={(m) => m.lab} caption="Margin percent by lab" />}
          >
            {marginRows.length === 0 ? (
              <p className="text-sm text-ink-muted">No labs with a Lab Cost in this period.</p>
            ) : (
              <BarRows
                rows={marginRows}
                mode="stacked"
                marker={{ value: threshold, label: `Low-margin limit ${threshold}%` }}
                summary={`Margin percent by lab: ${d.margin_by_lab.map((m) => `${m.name} ${pct(m.margin_pct)}`).join(", ")}. Low-margin limit ${threshold} percent.`}
              />
            )}
          </ChartCard>

          <ChartCard
            title="Discounts"
            description="Discounts Given per period, with the Discount Rate."
            note={highDiscount !== undefined ? `Highlights warn when the Discount Rate goes above ${highDiscount}%.` : undefined}
            table={<DataTable columns={discountCols} rows={d.discounts} rowKey={(p) => p.key} caption="Discounts by period" />}
          >
            <ColumnChart
              points={d.discounts}
              bars={[{ series: DISCOUNTS, values: d.discounts.map((p) => Number(p.discounts)) }]}
              lines={[{ series: RATE, axis: "right", values: d.discounts.map((p) => p.discount_rate_pct) }]}
              format={compactInr}
              rightFormat={(n) => `${n}%`}
              summary={describeSeries("Discounts Given", d.discounts.map((p) => p.label), d.discounts.map((p) => Number(p.discounts)), inr)}
            />
            <Legend items={[
              { label: DISCOUNTS.label, series: DISCOUNTS },
              { label: RATE.label, line: { color: RATE.color } },
            ]} />
          </ChartCard>

          <Card>
            <CardHeader title="Lab-wise table" description="Billed visits only. Margin uses visits that have a Lab Cost." />
            <CardBody>
              <DataTable columns={labCols} rows={d.lab_table.rows} rowKey={(r) => r.lab} caption="Finance by lab, with totals" totals />
            </CardBody>
          </Card>
        </>
      )}

      <section aria-label="Small stats" className="grid gap-3 sm:grid-cols-3">
        <Stat label="Avg Bill Value" value={d.stats.avg_bill_value === null ? "n/a" : inr(d.stats.avg_bill_value)} />
        <Stat label="Awaiting Billing" value={formatCount(d.stats.awaiting_billing)}>
          <Link href="/patient_registry?status=draft" className={buttonStyles({ variant: "link", size: "sm" })}>
            Open drafts <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </Stat>
        <Stat id="below-cost" label="Below-Cost Bills" value={formatCount(d.stats.below_cost_bills)}>
          <Link href={`/insights/below-cost${filters.search}`} className={buttonStyles({ variant: "link", size: "sm" })}>
            Review these bills <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </Stat>
      </section>
    </>
  );
}

export function FinanceView() {
  const filters = useInsightsFilters();
  const options = useInsightsFilterOptions();
  const query = useInsightsTab<FinanceOut>("finance", filters);
  return (
    <InsightsFrame tab="finance" endpoint="finance" title="Finance" question="Where does the money come from and go?" filters={filters} options={options.data} query={query}>
      {(d) => <Body d={d} filters={filters} options={options.data} />}
    </InsightsFrame>
  );
}