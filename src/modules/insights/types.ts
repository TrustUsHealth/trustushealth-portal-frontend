export type Grain = "day" | "week" | "month";
export type Direction = "up" | "down" | "flat" | "new";
export type KpiKind = "money" | "count" | "percent";
export type InsightsTab = "overview" | "finance" | "labs" | "patients";
export type InsightsEndpoint = InsightsTab | "below_cost";
export type ComparePick = "previous" | "last_year" | "none";
export type PeriodKey = "this_month" | "last_month" | "last_3_months" | "this_fy" | "last_fy" | "custom";

export const PERIOD_KEYS: readonly PeriodKey[] = ["this_month", "last_month", "last_3_months", "this_fy", "last_fy", "custom"];
export const COMPARE_KEYS: readonly ComparePick[] = ["previous", "last_year", "none"];

export const PERIOD_LABELS: Record<PeriodKey, string> = {
  this_month: "This Month",
  last_month: "Last Month",
  last_3_months: "Last 3 Months",
  this_fy: "This FY",
  last_fy: "Last FY",
  custom: "Custom",
};
export const COMPARE_LABELS: Record<ComparePick, string> = {
  previous: "Previous period",
  last_year: "Same period last year",
  none: "Off",
};
export const DEFAULT_SECTIONS = ["overview", "finance", "labs", "patients"] as const;
export const SECTION_LABELS: Record<string, string> = {
  overview: "Summary (Overview)",
  finance: "Finance",
  labs: "Labs",
  patients: "Patients",
};

/** Money travels as two-decimal strings and is formatted only at the edge. */
export type Money = string;

export interface RangeOut { start: string; end: string; label: string }
export interface FiltersEcho { period: string; labs: string[]; compare: string }
export interface Envelope {
  range: RangeOut;
  compare_range: RangeOut | null;
  grain: Grain;
  generated_at: string;
  data_notes: string[];
  empty: boolean;
  empty_message: string | null;
  filters: FiltersEcho;
}

export interface Kpi {
  key: string;
  label: string;
  kind: KpiKind;
  value: string | number | null;
  compare_value: string | number | null;
  /** Percent change; percentage points when kind is "percent". */
  delta_pct: number | null;
  /** null when Compare is off. */
  direction: Direction | null;
  detail: string | null;
  sparkline: number[];
}

// overview
export interface TrendPoint {
  key: string;
  label: string;
  visits: number;
  billed_visits: number;
  billed_revenue: Money;
  margin: Money;
  lab_cost: Money;
  revenue_no_cost: Money;
  gross_billed: Money;
  discounts: Money;
  discount_rate_pct: number | null;
  patients: number;
  new: number;
  returning: number;
  compare_billed_revenue?: Money | null;
}
export interface RevenueByLab { lab: string; name: string; color: string; billed_revenue: Money; share_pct: number; visits: number }
export interface AttentionChip { key: string; label: string; count: number; link: string }
export interface OverviewOut extends Envelope {
  kpis: Kpi[];
  highlights: string[];
  trend: TrendPoint[];
  revenue_by_lab: RevenueByLab[];
  attention: AttentionChip[];
}

// finance
export interface MoneySplit { key: string; label: string; lab_cost: Money; margin: Money; revenue_no_cost: Money; billed_revenue: Money }
export interface MarginByLab { lab: string; name: string; color: string; margin_pct: number; below_threshold: boolean }
export interface DiscountPoint { key: string; label: string; discounts: Money; discount_rate_pct: number | null }
export interface LabFinanceRow {
  lab: string; name: string; color: string; billed_visits: number; billed_revenue: Money; lab_cost: Money;
  margin: Money; margin_pct: number | null; discount_rate_pct: number | null;
}
export interface LabFinanceTotals {
  billed_visits: number; billed_revenue: Money; lab_cost: Money; margin: Money;
  margin_pct: number | null; discount_rate_pct: number | null;
}
export interface LabTable { rows: LabFinanceRow[]; totals: LabFinanceTotals }
export interface FinanceStats { avg_bill_value: Money | null; awaiting_billing: number; below_cost_bills: number }
export interface FinanceOut extends Envelope {
  kpis: Kpi[];
  money_split: MoneySplit[];
  margin_by_lab: MarginByLab[];
  low_margin_threshold_pct: number;
  discounts: DiscountPoint[];
  lab_table: LabTable;
  stats: FinanceStats;
}
export interface BelowCostItem { bill_no: string | null; date: string; lab: string; lab_name: string; billed: Money; lab_cost: Money; margin: Money }
export interface BelowCostOut extends Envelope { total: number; truncated: boolean; items: BelowCostItem[] }

// labs
export interface LabCard {
  lab: string; name: string; color: string; visits: number; billed_revenue: Money; margin_pct: number | null;
  median_turnaround_hours: number | null; median_turnaround_display: string;
}
export interface LabRef { lab: string; name: string; color: string }
export interface VisitsByLabPoint { key: string; label: string; counts: Record<string, number> }
export interface VisitsByLab { labs: LabRef[]; points: VisitsByLabPoint[] }
export interface TurnaroundRow {
  lab: string; name: string; color: string; median_hours: number | null; slowest_10_hours: number | null;
  median_display: string; slowest_10_display: string; sample: number;
}
export interface MonthRef { key: string; label: string }
export interface CostStatementRow { lab: string; name: string; cells: Record<string, Money>; total: Money }
export interface CostStatement { months: MonthRef[]; rows: CostStatementRow[]; totals: Record<string, Money>; grand_total: Money }
export interface LabsOut extends Envelope {
  lab_cards: LabCard[];
  visits_by_lab: VisitsByLab;
  turnaround: TurnaroundRow[];
  lab_cost_statement: CostStatement;
}

// patients
export interface NewReturningPoint { key: string; label: string; new: number; returning: number }
export interface AgeGenderRow { band: string; male: number; female: number; other: number; not_recorded: number; total: number }
export interface TestRow { test: string; visits: number }
export interface TopTests { rows: TestRow[]; others: number }
export interface ReferrerRow { referrer: string; visits: number; billed_revenue: Money; share_pct: number }
export interface TopReferrers { rows: ReferrerRow[]; others: ReferrerRow | null }
export interface PatientsOut extends Envelope {
  kpis: Kpi[];
  repeat_building: boolean;
  new_vs_returning: NewReturningPoint[];
  age_gender: AgeGenderRow[];
  top_tests: TopTests;
  top_referrers: TopReferrers;
}

// filters
export interface PresetOut { key: string; label: string; start: string; end: string; compare_start: string; compare_end: string }
export interface OptionOut { key: string; label: string }
export interface LabFilter { key: string; name: string; color: string }
export interface ThresholdsOut { low_margin_pct: number; high_discount_pct: number }
export interface PaletteOut { others: string; compare_line: string }
export interface FiltersOut {
  presets: PresetOut[];
  default_period: string;
  default_compare: string;
  compare_options: OptionOut[];
  labs: LabFilter[];
  earliest_data_date: string | null;
  today: string;
  thresholds: ThresholdsOut;
  palette: PaletteOut;
  report_sections: string[];
}