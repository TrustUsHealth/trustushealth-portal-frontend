"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiWithConflict, requestBlob } from "@/core/api/client";
import { prKeys } from "@/modules/patient_registry/api";
import type {
  BillDataPatch, BillDecision, Delivery, EntryBill, LabInspect, LabOut, ManualEntryIn, ParsedOut, SaveOut, SentOut, SpectrumRenderIn,
} from "./types";

const B = "/bill_generator";
export const bgKeys = {
  labs: ["bg", "labs"] as const,
  entry: (id: string) => ["bg", "entry", id] as const,
};

/** Labs this user may open, with the bill mode ("generate" = our layout, "edit_pdf" = the lab's own PDF). */
export const useLabs = () => useQuery({ queryKey: bgKeys.labs, queryFn: () => api<LabOut[]>(`${B}/labs`), staleTime: 5 * 60_000, retry: false });

export const fetchEntryBill = (id: string) => api<EntryBill>(`${B}/entries/${id}/bill`);
export const useEntryBill = (id: string) => useQuery({ queryKey: bgKeys.entry(id), queryFn: () => fetchEntryBill(id) });

/** Bills change entries (amounts, client name, lab bill number), so registry screens must refetch. */
export function useRefreshRegistry() {
  const qc = useQueryClient();
  return () => void qc.invalidateQueries({ queryKey: prKeys.all });
}

export function useSaveBillData(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: BillDataPatch) => api<EntryBill>(`${B}/entries/${id}/bill-data`, { method: "PUT", json: body }),
    onSuccess: (entry) => {
      qc.setQueryData(bgKeys.entry(id), entry);
      void qc.invalidateQueries({ queryKey: prKeys.all });
    },
  });
}

/** POST /entries: 201 created, 200 merged/unchanged, 409 = a decision for staff (never silently overwritten). */
export function useCreateBillEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ManualEntryIn) => apiWithConflict<SaveOut, BillDecision>(`${B}/entries`, { method: "POST", json: body }),
    onSuccess: (r) => {
      if (r.ok) void qc.invalidateQueries({ queryKey: prKeys.all });
    },
  });
}

// ───────────────────────── Spectrum ─────────────────────────
export const parseSpectrum = (file: File) => {
  const form = new FormData();
  form.set("file", file);
  return api<ParsedOut>(`${B}/spectrum/parse`, { method: "POST", form });
};

/** preview / download: the answer is the PDF. */
export const renderSpectrumFile = (body: SpectrumRenderIn) =>
  requestBlob(`${B}/spectrum/render`, { method: "POST", json: body }, "bill.pdf");

/** email: the answer is `{ sent: true }`; the backend mails the signed-in user only. */
export const emailSpectrumBill = (body: Omit<SpectrumRenderIn, "delivery">) =>
  api<SentOut>(`${B}/spectrum/render`, { method: "POST", json: { ...body, delivery: "email" satisfies Delivery } });

// ───────────────────────── Metropolis ─────────────────────────
export const inspectMetropolis = (file: File) => {
  const form = new FormData();
  form.set("file", file);
  return api<LabInspect>(`${B}/metropolis/inspect`, { method: "POST", form });
};

export interface MetropolisRenderArgs {
  file: File;
  /** One amount per row of the lab bill, in the same order, e.g. ["450.00"]. */
  amounts: string[];
  delivery: Delivery;
  entryId?: string | null;
  forceNew?: boolean;
  labCost?: string | null;
}

function metropolisForm(a: MetropolisRenderArgs) {
  const form = new FormData();
  form.set("file", a.file);
  form.set("amounts", JSON.stringify(a.amounts));
  form.set("delivery", a.delivery);
  if (a.entryId) form.set("entry_id", a.entryId);
  if (a.forceNew) form.set("force_new", "true");
  if (a.labCost) form.set("lab_cost", a.labCost);
  return form;
}

export const renderMetropolisFile = (a: MetropolisRenderArgs) =>
  requestBlob(`${B}/metropolis/render`, { method: "POST", form: metropolisForm(a) }, "bill.pdf");

export const emailMetropolisBill = (a: Omit<MetropolisRenderArgs, "delivery">) =>
  api<SentOut>(`${B}/metropolis/render`, { method: "POST", form: metropolisForm({ ...a, delivery: "email" }) });