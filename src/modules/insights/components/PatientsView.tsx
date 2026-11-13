"use client";

import { Inbox } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { useInsightsFilterOptions, useInsightsTab } from "../api";
import { useInsightsFilters } from "../filters";
import { formatCount, grainWord, inr, pct } from "../format";
import type { AgeGenderRow, FiltersOut, NewReturningPoint, PatientsOut, ReferrerRow } from "../types";
import { BarRows, ColumnChart, Legend, TOKENS, describeSeries, type BarRow, type Series } from "./charts";
import { ChartCard } from "./ChartCard";
import { DataTable, type Column } from "./DataTable";
import { InsightsFrame } from "./InsightsFrame";
import { KpiGrid } from "./KpiCard";

const NEW_P: Series = { id: "new", label: "New patients", color: TOKENS.slate, pattern: "solid" };
const RET_P: Series = { id: "returning", label: "Returning patients", color: TOKENS.info, pattern: "hatch" };
const MALE: Series = { id: "male", label: "Male", color: TOKENS.slate, pattern: "solid" };
const FEMALE: Series = { id: "female", label: "Female", color: TOKENS.info, pattern: "hatch" };
const OTHER: Series = { id: "other", label: "Other", color: TOKENS.slateLight, pattern: "dots" };
const NOT_REC: Series = { id: "not_recorded", label: "Not recorded", color: TOKENS.muted, pattern: "cross" };

function Body({ d, options }: { d: PatientsOut; options?: FiltersOut }) {
  const nvr = d.new_vs_returning;
  const nvrCols: Column<NewReturningPoint>[] = [
    { key: "label", header: grainWord(d.grain)[0].toUpperCase() + grainWord(d.grain).slice(1), cell: (p) => p.label },
    { key: "new", header: "New", align: "right", cell: (p) => formatCount(p.new) },
    { key: "ret", header: "Returning", align: "right", cell: (p) => formatCount(p.returning) },
  ];

  const ageRows: BarRow[] = d.age_gender.map((r) => ({
    key: r.band,
    label: r.band,
    caption: `Male ${r.male} · Female ${r.female} · Other ${r.other} · Not recorded ${r.not_recorded}`,
    segments: [
      { series: MALE, value: r.male, text: String(r.male) },
      { series: FEMALE, value: r.female, text: String(r.female) },
      { series: OTHER, value: r.other, text: String(r.other) },
      { series: NOT_REC, value: r.not_recorded, text: String(r.not_recorded) },
    ],
    valueText: `${formatCount(r.total)} visits`,
  }));
  const ageCols: Column<AgeGenderRow>[] = [
    { key: "band", header: "Age band", cell: (r) => r.band },
    { key: "male", header: "Male", align: "right", cell: (r) => formatCount(r.male) },
    { key: "female", header: "Female", align: "right", cell: (r) => formatCount(r.female) },
    { key: "other", header: "Other", align: "right", cell: (r) => formatCount(r.other) },
    { key: "nr", header: "Not recorded", align: "right", cell: (r) => formatCount(r.not_recorded) },
    { key: "total", header: "Visits", align: "right", cell: (r) => formatCount(r.total) },
  ];

  const TESTS: Series = { id: "tests", label: "Visits", color: TOKENS.slate, pattern: "solid" };
  const OTHERS: Series = { id: "others", label: "Others", color: options?.palette.others ?? TOKENS.line, pattern: "solid" };
  const testRows: BarRow[] = [
    ...d.top_tests.rows.map((t) => ({ key: t.test, label: t.test, segments: [{ series: TESTS, value: t.visits, text: formatCount(t.visits) }], valueText: formatCount(t.visits) })),
    ...(d.top_tests.others > 0
      ? [{ key: "__others", label: "Others", segments: [{ series: OTHERS, value: d.top_tests.others, text: formatCount(d.top_tests.others) }], valueText: formatCount(d.top_tests.others) }]
      : []),
  ];
  const testTable = [...d.top_tests.rows.map((t) => ({ test: t.test, visits: t.visits })), ...(d.top_tests.others > 0 ? [{ test: "Others", visits: d.top_tests.others }] : [])];
  const testCols: Column<{ test: string; visits: number }>[] = [
    { key: "test", header: "Test", cell: (t) => t.test },
    { key: "visits", header: "Visits containing it", align: "right", cell: (t) => formatCount(t.visits) },
  ];

  const refRows: ReferrerRow[] = [...d.top_referrers.rows, ...(d.top_referrers.others ? [d.top_referrers.others] : [])];
  const refCols: Column<ReferrerRow>[] = [
    { key: "ref", header: "Referrer", cell: (r) => r.referrer },
    { key: "visits", header: "Visits", align: "right", cell: (r) => formatCount(r.visits) },
    { key: "rev", header: "Billed Revenue", align: "right", cell: (r) => inr(r.billed_revenue) },
    { key: "share", header: "Share", align: "right", cell: (r) => pct(r.share_pct) },
  ];

  return (
    <>
      {d.repeat_building && (
        <Alert kind="info" title="Repeat figures are still building">
          Patients seen before go-live look new, so Returning and Repeat Rate become reliable after about six months of data.
        </Alert>
      )}
      <KpiGrid kpis={d.kpis} badges={d.repeat_building ? { returning_patients: "Still building", repeat_rate: "Still building" } : undefined} />

      {d.empty ? (
        <EmptyState icon={Inbox} title={d.empty_message ?? "No visits in this period"}>Try another period or lab.</EmptyState>
      ) : (
        <>
          <ChartCard
            title="New vs Returning"
            description={`Patient mix per ${grainWord(d.grain)}.`}
            table={<DataTable columns={nvrCols} rows={nvr} rowKey={(p) => p.key} caption="New and returning patients by period" />}
          >
            <ColumnChart
              points={nvr}
              stacked
              integer
              bars={[{ series: NEW_P, values: nvr.map((p) => p.new) }, { series: RET_P, values: nvr.map((p) => p.returning) }]}
              format={(n) => formatCount(n)}
              summary={describeSeries("Patients (new plus returning)", nvr.map((p) => p.label), nvr.map((p) => p.new + p.returning), formatCount)}
            />
            <Legend items={[{ label: NEW_P.label, series: NEW_P }, { label: RET_P.label, series: RET_P }]} />
          </ChartCard>

          <ChartCard
            title="Age and Gender"
            description="Visits per age band, split by gender."
            table={<DataTable columns={ageCols} rows={d.age_gender} rowKey={(r) => r.band} caption="Visits by age band and gender" />}
          >
            <BarRows
              rows={ageRows}
              mode="stacked"
              summary={`Visits by age band: ${d.age_gender.map((r) => `${r.band} ${r.total}`).join(", ")}.`}
            />
            <Legend items={[MALE, FEMALE, OTHER, NOT_REC].map((s) => ({ label: s.label, series: s }))} />
          </ChartCard>

          <ChartCard
            title="Top Tests"
            description="Number of visits containing each test. Narrow by lab in the filter bar."
            table={<DataTable columns={testCols} rows={testTable} rowKey={(t) => t.test} caption="Top tests by visits" />}
          >
            {testRows.length === 0 ? (
              <p className="text-sm text-ink-muted">No tests recorded in this period.</p>
            ) : (
              <BarRows rows={testRows} mode="stacked" summary={`Top tests: ${testTable.map((t) => `${t.test} ${t.visits}`).join(", ")}.`} />
            )}
          </ChartCard>

          <Card>
            <CardHeader title="Top Referrers" description="Referring doctors are business sources. A blank doctor shows as Not recorded." />
            <CardBody>
              {refRows.length === 0 ? (
                <p className="text-sm text-ink-muted">No referrers in this period.</p>
              ) : (
                <DataTable columns={refCols} rows={refRows} rowKey={(r) => r.referrer} caption="Top referrers" />
              )}
            </CardBody>
          </Card>
        </>
      )}
    </>
  );
}

export function PatientsView() {
  const filters = useInsightsFilters();
  const options = useInsightsFilterOptions();
  const query = useInsightsTab<PatientsOut>("patients", filters);
  return (
    <InsightsFrame tab="patients" endpoint="patients" title="Patients" question="Who are we serving, and for what?" filters={filters} options={options.data} query={query}>
      {(d) => <Body d={d} options={options.data} />}
    </InsightsFrame>
  );
}