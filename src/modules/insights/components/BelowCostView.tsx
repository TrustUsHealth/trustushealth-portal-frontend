"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, Info } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { buttonStyles } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { cn } from "@/lib/utils";
import { useInsightsFilterOptions, useInsightsTab } from "../api";
import { useInsightsFilters } from "../filters";
import { fmtDay, formatCount, inr } from "../format";
import type { BelowCostItem, BelowCostOut } from "../types";
import { DataTable, type Column } from "./DataTable";
import { InsightsFrame } from "./InsightsFrame";

const cols: Column<BelowCostItem>[] = [
  { key: "bill", header: "Bill no", cell: (r) => r.bill_no ?? "Not set" },
  { key: "date", header: "Date", cell: (r) => fmtDay(r.date) },
  { key: "lab", header: "Lab", cell: (r) => r.lab_name },
  { key: "billed", header: "Billed", align: "right", cell: (r) => inr(r.billed, 2) },
  { key: "cost", header: "Lab Cost", align: "right", cell: (r) => inr(r.lab_cost, 2) },
  { key: "margin", header: "Margin", align: "right", cell: (r) => inr(r.margin, 2) },
];

export function BelowCostView() {
  const filters = useInsightsFilters();
  const options = useInsightsFilterOptions();
  const query = useInsightsTab<BelowCostOut>("below_cost", filters);
  return (
    <InsightsFrame
      tab="finance"
      endpoint="below_cost"
      title="Below-Cost Bills"
      question="Bills where the lab cost was higher than what the patient was billed."
      filters={filters}
      options={options.data}
      query={query}
    >
      {(d) => (
        <>
          <Link href={`/insights/finance${filters.search}`} className={cn(buttonStyles({ variant: "link", size: "sm" }), "gap-1.5")}>
            <ArrowLeft className="size-4" aria-hidden />
            Back to Finance
          </Link>
          {d.empty ? (
            <EmptyState icon={CheckCircle2} title={d.empty_message ?? "No below-cost bills in this period"}>
              Every bill in this period covered its lab cost.
            </EmptyState>
          ) : (
            <>
              {d.truncated && (
                <Alert kind="info" title="Showing the worst bills first">
                  <span className="inline-flex items-start gap-1.5"><Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                    Showing {formatCount(d.items.length)} of {formatCount(d.total)} below-cost bills, lowest margin first.</span>
                </Alert>
              )}
              <Card>
                <CardHeader title={`${formatCount(d.total)} below-cost ${d.total === 1 ? "bill" : "bills"}`} description="Bill number, date, lab and amounts only. No patient names." />
                <CardBody>
                  <DataTable columns={cols} rows={d.items} rowKey={(r, i) => `${r.bill_no ?? "none"}-${i}`} caption="Below-cost bills" />
                </CardBody>
              </Card>
            </>
          )}
        </>
      )}
    </InsightsFrame>
  );
}