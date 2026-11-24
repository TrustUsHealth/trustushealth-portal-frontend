/**
 * Hand-written mirror of the backend OpenAPI contract (build 0 + build 1).
 * Once the backend is reachable run `npm run gen:api` to produce `schema.d.ts`, then migrate these
 * aliases to `components["schemas"][...]` so CI can fail on drift (PRD section 3).
 */
export type Role = "admin" | "staff" | "engineer" | "customer";
export type AgeUnit = "Y" | "M" | "D";
export type Gender = "Male" | "Female" | "Other";
export type EntryStatus = "draft" | "complete";
export type Resolution = "existing" | "incoming" | "both";

// ── auth ──
export interface UserOut { id: string; email: string; name?: string | null; role: Role }
export interface TokenOut { access_token: string; token_type: string; expires_in: number; user: UserOut }
export interface OtpRequestedOut { message: string; resend_after_seconds: number }

// ── config / dashboard ──
export interface AppConfig {
  brand_name: string; logo_full: string; logo_mark: string; favicon: string;
  timezone: string; currency: string; upload_max_mb: number; upload_allowed: string[];
}
export interface PartnerOut { key: string; name: string }
export interface SubmoduleOut { key: string; name: string; kind: "submodule" | "lab" }
export type TileState = "open" | "locked" | "pending";
export interface TileOut {
  key: string; name: string; icon: string; route: string; state: TileState;
  submodules: SubmoduleOut[]; visible_to_staff?: boolean | null;
}

// ── access ──
export interface UserAdminOut {
  id: string; email: string; name: string | null; role: Role; active: boolean;
  created_at: string; last_login_at: string | null;
}
export interface GrantOut {
  id: string; user_id: string; user_email?: string | null; module: string; submodule: string | null;
  status: "requested" | "granted"; requested_at?: string | null; granted_at?: string | null;
}
export interface ModuleAdminOut {
  key: string; name: string; icon: string; route: string; visible_to_staff: boolean;
  staff_eligible: boolean; submodules: SubmoduleOut[];
}
export interface MatrixColumn { module: string; module_name: string; submodule: string | null; label: string }
export interface MatrixRow { user: UserAdminOut; grants: GrantOut[] }
export interface MatrixOut { columns: MatrixColumn[]; rows: MatrixRow[] }

// ── patient registry ──
export interface FieldDef {
  key: string; label: string; type: string; options?: string[] | null; required: boolean;
  default?: number | string | null; auto: boolean; computed: boolean; internal: boolean;
}
export interface EntrySummary {
  id: string; bill_no: string | null; status: EntryStatus; partner_key: string; patient_name: string;
  age?: number | null; age_unit?: AgeUnit | null; gender?: Gender | null; lab_pid?: string | null;
  referred_by?: string | null; registration_date: string; tests: string[]; net_amount?: number | null;
}
export interface Entry extends EntrySummary {
  version: number; partner_name: string; collection_time?: string | null; reporting_time?: string | null;
  phone?: string | null; email?: string | null; lab_cost?: number | null; gross_amount?: number | null;
  discount_amount?: number | null; margin?: number | null; customer_id?: string | null;
  created_at: string; updated_at: string;
}
export interface ReportRef { id: string; filename: string; content_type: string; size: number; status: string; created_at: string }
export interface EntryDetail extends Entry { reports: ReportRef[] }
export interface Paged<T> { items: T[]; total: number; page: number; page_size: number }

export interface EntryInput {
  patient_name?: string | null; registration_date?: string | null; age?: number | null; age_unit?: AgeUnit | null;
  gender?: Gender | null; lab_pid?: string | null; referred_by?: string | null; collection_time?: string | null;
  reporting_time?: string | null; tests?: string[] | null; phone?: string | null; email?: string | null;
  lab_cost?: number | null; gross_amount?: number | null; discount_amount?: number | null;
}
export interface EntryCreate extends EntryInput {
  partner_key: string; patient_name: string; registration_date: string;
  report_id?: string | null; target_entry_id?: string | null; force_new?: boolean;
  resolutions?: Record<string, Resolution>;
}
export interface EntryPatch extends EntryInput { expected_version?: number | null }

export interface SaveOut {
  outcome: "created" | "merged" | "unchanged"; entry: Entry; filled_fields: string[];
  report_link: "linked" | "already_linked" | "missing" | "none";
}
export interface FieldConflict { field: string; label: string; existing: unknown; incoming: unknown }
export interface DuplicateDecision {
  outcome: "possible_match" | "conflict"; message: string; match?: EntrySummary | null;
  possible_matches: EntrySummary[]; conflicts: FieldConflict[]; can_force_new: boolean;
}
export interface ParsedFields {
  patient_name?: string | null; age?: number | null; age_unit?: AgeUnit | null; gender?: Gender | null;
  lab_pid?: string | null; referred_by?: string | null; registration_date?: string | null;
  collection_time?: string | null; reporting_time?: string | null; tests: string[];
  phone?: string | null; email?: string | null;
}
export interface ParseOut {
  report_id: string; filename: string; partner_key: string; file_duplicate: boolean;
  existing_entry_id?: string | null; fields: ParsedFields; confidence: number;
  needs_verify: string[]; missing_fields: string[]; flags: string[]; warnings: string[];
  duplicate?: { kind: "exact" | "possible"; entries: EntrySummary[] } | null;
}
export interface Customer {
  id: string; name: string; age?: number | null; age_unit?: AgeUnit | null; gender?: Gender | null;
  phone?: string | null; email?: string | null; created_at: string;
}
export interface CustomerDetail extends Customer { entries: EntrySummary[] }
export interface Workbook {
  year: number; filename: string; version: number; size: number; last_sent_month?: string | null; updated_at?: string | null;
}
export interface SendOut { sent: number }

export interface EntryQuery {
  q?: string; partner_key?: string; status?: EntryStatus | ""; referred_by?: string; date_from?: string;
  date_to?: string; bill_no?: string; lab_pid?: string; page?: number; page_size?: number;
}

// ── lab portal auto-sync (admin) ──
/** Run status from the server: running | completed | completed_with_errors | partial | failed | interrupted. */
export type SyncRunStatus = string;
/** Visit (ledger row) status: done | failed | needs_review | processing. */
export type SyncItemStatus = string;
export interface SyncStats {
  windows: number; rows_seen: number; already_done: number; exhausted: number; skipped_existing_entry: number;
  would_process: number; attempted: number; created: number; merged: number; unchanged: number;
  existing_conflict: number; needs_review: number; failed: number;
}
/** Give a `month` (YYYY-MM) OR `date_from` + `date_to`. */
export interface SyncRunIn {
  month?: string; date_from?: string; date_to?: string; dry_run?: boolean; retry_failed?: boolean;
}
export interface SyncRunStarted { run_id: string; status: string; date_from: string; date_to: string; dry_run: boolean }
export interface SyncRun {
  id: string; trigger: string; status: SyncRunStatus; dry_run: boolean; date_from: string; date_to: string;
  started_at: string; finished_at?: string | null; message?: string | null; stats: SyncStats;
}
export interface SyncItem {
  source_key: string; sid_no: string; sid_date: string; status: SyncItemStatus; outcome?: string | null;
  attempts: number; entry_id?: string | null; report_ref?: string | null; last_error?: string | null;
  warnings: string[]; updated_at?: string | null;
}
export interface SyncItemList { items: SyncItem[]; total: number }