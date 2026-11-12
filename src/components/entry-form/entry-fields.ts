import { z } from "zod";
import type { AgeUnit, Entry, EntryCreate, EntryInput, FieldDef, ParsedFields } from "@/core/api/types";
import { toLocalInput } from "@/lib/format";

/** Fields the form never renders as inputs: set by the system or by the lab chosen in step 1. */
export const HIDDEN = new Set(["bill_no", "partner_key", "net_amount", "margin", "age_unit"]);

/** Display order and grouping. Any editable field in fields.yaml that is not listed lands in "More details". */
export const GROUPS: { id: string; title: string; keys: string[] }[] = [
  { id: "patient", title: "Patient", keys: ["patient_name", "age", "gender", "phone", "email"] },
  { id: "visit", title: "Visit", keys: ["registration_date", "lab_pid", "referred_by", "collection_time", "reporting_time"] },
  { id: "tests", title: "Tests", keys: ["tests"] },
  { id: "billing", title: "Billing", keys: ["gross_amount", "discount_amount", "lab_cost"] },
];

export type FormValues = Record<string, string | string[]>;

export const UNIT_LABEL: Record<AgeUnit, string> = { Y: "Years", M: "Months", D: "Days" };

export const editableFields = (fields: FieldDef[]) => fields.filter((f) => !f.computed && !f.auto && !HIDDEN.has(f.key) || f.key === "age");

const MONEY_RE = /^\d{1,8}(\.\d{1,2})?$/;
const clean = (s: unknown) => String(s ?? "").replace(/,/g, "").trim();

export function buildSchema(fields: FieldDef[]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const f of fields) {
    if (HIDDEN.has(f.key) && f.key !== "age_unit") continue;
    if (f.computed || f.auto) continue;
    let s: z.ZodTypeAny;
    switch (f.type) {
      case "text_list":
        s = f.required ? z.array(z.string()).min(1, "Add at least one test") : z.array(z.string());
        break;
      case "number":
        s = z.string().refine((v) => !v.trim() || (/^\d{1,3}$/.test(v.trim()) && +v <= 130), "Enter a whole number from 0 to 130");
        break;
      case "money":
        s = z.string().refine((v) => !clean(v) || MONEY_RE.test(clean(v)), "Enter an amount like 450 or 450.50");
        break;
      case "date":
        s = z.string().refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), "Pick a date");
        break;
      default:
        s = f.key === "email" ? z.string().refine((v) => !v.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()), "Enter a valid email") : z.string();
    }
    if (f.required && f.type !== "text_list") s = (s as z.ZodString).refine((v: string) => v.trim().length > 0, `${f.label} is required`);
    shape[f.key] = s;
  }
  shape.age_unit = z.string();
  return z.object(shape).passthrough().superRefine((v, ctx) => {
    const g = Number(clean(v.gross_amount)), d = Number(clean(v.discount_amount));
    if (clean(v.gross_amount) && clean(v.discount_amount) && d > g)
      ctx.addIssue({ code: "custom", path: ["discount_amount"], message: "Discount cannot be more than the gross amount" });
  });
}

const str = (v: unknown) => (v === null || v === undefined ? "" : String(v));

/** Entry (or parsed report) -> form strings. */
export function toFormValues(fields: FieldDef[], src?: Partial<Entry> | ParsedFields | null): FormValues {
  const out: FormValues = {};
  for (const f of editableFields(fields)) {
    const raw = (src as Record<string, unknown> | null | undefined)?.[f.key];
    if (f.type === "text_list") out[f.key] = Array.isArray(raw) ? (raw as string[]) : [];
    else if (f.type === "datetime") out[f.key] = toLocalInput(raw as string | null);
    else if (raw === undefined && f.default !== undefined && f.default !== null) out[f.key] = String(f.default); // YAML defaults (e.g. discount 0)
    else out[f.key] = str(raw);
  }
  const unit = (src as Record<string, unknown> | null | undefined)?.age_unit;
  out.age_unit = str(unit) || "Y";
  return out;
}

function convert(f: FieldDef | undefined, key: string, v: string | string[], values: FormValues): unknown {
  if (key === "tests") return (v as string[]).map((t) => t.trim()).filter(Boolean);
  const s = String(v).trim();
  if (!s) return null;
  if (key === "age_unit") return values.age ? s : null;
  switch (f?.type) {
    case "number": return Number(s);
    case "money": return Number(clean(s));
    case "datetime": return s.length === 16 ? `${s}:00` : s;
    default: return s;
  }
}

/** Create body: empty values are dropped (backend uses exclude_none). */
export function toCreatePayload(fields: FieldDef[], values: FormValues): Omit<EntryCreate, "partner_key"> {
  const by = new Map(fields.map((f) => [f.key, f]));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(values)) {
    const c = convert(by.get(k), k, v, values);
    if (c === null || (Array.isArray(c) && !c.length)) continue;
    out[k] = c;
  }
  return out as Omit<EntryCreate, "partner_key">;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Edit body: only fields that changed; cleared optional fields are sent as null (PATCH semantics). */
export function toPatchPayload(fields: FieldDef[], initial: FormValues, values: FormValues): EntryInput {
  const by = new Map(fields.map((f) => [f.key, f]));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(values)) {
    if (same(initial[k], v)) continue;
    const c = convert(by.get(k), k, v, values);
    out[k] = Array.isArray(c) && !c.length ? null : c;
  }
  return out as EntryInput;
}

/** Live "Billed amount" and "Margin" preview, mirroring the server's rules. */
export function computeAmounts(values: FormValues) {
  const n = (k: string) => (clean(values[k]) && !Number.isNaN(Number(clean(values[k]))) ? Number(clean(values[k])) : null);
  const gross = n("gross_amount");
  const disc = n("discount_amount") ?? 0;
  const net = gross === null ? null : Math.round((gross - disc) * 100) / 100;
  const cost = n("lab_cost");
  const margin = net !== null && cost !== null ? Math.round((net - cost) * 100) / 100 : null;
  return { net, margin };
}
