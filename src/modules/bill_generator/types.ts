import type { AgeUnit, Gender, Resolution } from "@/core/api/types";

/**
 * Hand-written mirror of `app/modules/bill_generator/schemas.py`.
 * Money is a Decimal on the server and travels as a string; we accept numbers too and never use floats for sums.
 */
export type Decimal = string | number;
export type Delivery = "preview" | "download" | "email";
export type BillMode = "generate" | "edit_pdf";

export interface LabOut { key: string; name: string; mode: BillMode }

export interface EntryBill {
  id: string; bill_no: string | null; bill_no_original?: string | null; status: string; version: number;
  partner_key: string; partner_name: string; patient_name: string;
  age?: number | null; age_unit?: AgeUnit | null; gender?: Gender | null; lab_pid?: string | null; referred_by?: string | null;
  registration_date: string; tests: string[]; test_amounts: Decimal[];
  gross_amount?: Decimal | null; discount_amount?: Decimal | null; net_amount?: Decimal | null; lab_cost?: Decimal | null;
  /** Admin only; null for everyone else. */
  margin?: Decimal | null; client_name?: string | null; updated_at: string;
}

/** PUT /entries/{id}/bill-data (the backend forbids unknown keys). */
export interface BillDataPatch {
  tests?: string[] | null;
  test_amounts?: Decimal[] | null;
  client_name?: string | null;
  expected_version?: number | null;
}

/** POST /entries (Spectrum): new entry from the bill page. */
export interface ManualEntryIn {
  partner_key: string; patient_name: string; registration_date: string;
  age?: number | null; age_unit?: AgeUnit | null; gender?: Gender | null; lab_pid?: string | null;
  referred_by?: string | null; phone?: string | null; email?: string | null;
  tests?: string[] | null; test_amounts?: Decimal[] | null; discount_amount?: Decimal | null; lab_cost?: Decimal | null;
  client_name?: string | null;
  target_entry_id?: string | null; force_new?: boolean; resolutions?: Record<string, Resolution>;
}

export interface SaveOut { outcome: "created" | "merged" | "unchanged"; entry: EntryBill; filled_fields: string[] }
export interface SentOut { sent: boolean }

/** Decision lists in this module carry only these four fields (not the registry's EntrySummary). */
export interface BillSummary { id: string; bill_no: string | null; patient_name: string | null; registration_date: string | null }
export interface BillFieldConflict { field: string; label: string; existing: unknown; incoming: unknown }
export interface BillDecision {
  outcome: "possible_match" | "conflict"; message: string; match?: BillSummary | null;
  possible_matches: BillSummary[]; conflicts: BillFieldConflict[]; can_force_new: boolean;
}

export interface ParsedOut {
  partner_key: string; fields: Record<string, unknown>;
  duplicate_kind: "exact" | "possible" | null; duplicate_entry_ids: string[];
}

export interface SpectrumRenderIn {
  entry_id: string; include_client: boolean; delivery: Delivery;
  /** null/omitted = saved discount, 0 = no discount block, otherwise a bill-only override (never stored). */
  bill_discount_amount?: Decimal | null;
}

export interface LabRowOut { name: string; printed_amount: Decimal; amount: Decimal }
export interface MatchOut { kind: "exact" | "possible" | "none"; entries: BillSummary[] }
export interface LabInspect {
  lab_bill_no: string; lab_pid: string; bill_date: string; patient_name: string;
  age?: number | null; age_unit?: AgeUnit | null; gender?: Gender | null; referred_by?: string | null;
  rows: LabRowOut[]; printed_gross: Decimal; printed_discount: Decimal; printed_grand: Decimal;
  entry_id?: string | null; entry_gross?: Decimal | null; entry_discount?: Decimal | null; entry_lab_cost?: Decimal | null;
  match: MatchOut; bill_no_taken: boolean;
}