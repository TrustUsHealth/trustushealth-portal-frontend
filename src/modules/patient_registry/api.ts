"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiWithConflict, downloadFile } from "@/core/api/client";
import type {
  Customer, CustomerDetail, DuplicateDecision, EntryCreate, EntryDetail, EntryPatch, EntryQuery, EntrySummary,
  FieldDef, Entry, Paged, ParseOut, SaveOut, SendOut, Workbook,
} from "@/core/api/types";

const P = "/patient_registry";
export const prKeys = {
  all: ["pr"] as const,
  fields: ["pr", "fields"] as const,
  entries: (q: EntryQuery) => ["pr", "entries", q] as const,
  entry: (id: string) => ["pr", "entry", id] as const,
  customers: (q: string, page: number) => ["pr", "customers", q, page] as const,
  customer: (id: string) => ["pr", "customer", id] as const,
  workbooks: ["pr", "workbooks"] as const,
};

/** The form is driven by fields.yaml through this endpoint, so a YAML edit changes the form. */
export const useFields = () => useQuery({ queryKey: prKeys.fields, queryFn: () => api<FieldDef[]>(`${P}/fields`), staleTime: 10 * 60_000 });

export const useEntries = (q: EntryQuery) =>
  useQuery({
    queryKey: prKeys.entries(q),
    queryFn: () => api<Paged<EntrySummary>>(`${P}/entries`, { query: { page_size: 25, ...q } }),
    placeholderData: keepPreviousData,
  });

export const useEntry = (id: string) => useQuery({ queryKey: prKeys.entry(id), queryFn: () => api<EntryDetail>(`${P}/entries/${id}`) });

export const parseReport = (partner_key: string, file: File) => {
  const form = new FormData();
  form.set("partner_key", partner_key);
  form.set("file", file);
  return api<ParseOut>(`${P}/entries/parse`, { method: "POST", form });
};

/** POST /entries: 201 created, 200 merged/unchanged, 409 = a decision for staff (never silently overwritten). */
export const createEntry = (body: EntryCreate) => apiWithConflict<SaveOut, DuplicateDecision>(`${P}/entries`, { method: "POST", json: body });

export function usePatchEntry(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: EntryPatch) => api<Entry>(`${P}/entries/${id}`, { method: "PATCH", json: body }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: prKeys.all }),
  });
}

export function useDeleteEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<void>(`${P}/entries/${id}`, { method: "DELETE" }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: prKeys.all }),
  });
}

export const useCustomers = (q: string, page: number) =>
  useQuery({
    queryKey: prKeys.customers(q, page),
    queryFn: () => api<Paged<Customer>>(`${P}/customers`, { query: { q, page, page_size: 25 } }),
    placeholderData: keepPreviousData,
  });
export const useCustomer = (id: string) => useQuery({ queryKey: prKeys.customer(id), queryFn: () => api<CustomerDetail>(`${P}/customers/${id}`) });

// Excel register
export const useWorkbooks = (enabled: boolean) =>
  useQuery({ queryKey: prKeys.workbooks, queryFn: () => api<Workbook[]>(`${P}/excel_register`), enabled, retry: false });
export const downloadWorkbook = (year: number) => downloadFile(`${P}/excel_register/download`, { year }, `TrustUs_Patient_Registry_${year}.xlsx`);
export function useSendWorkbook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (year: number) => api<SendOut>(`${P}/excel_register/send`, { method: "POST", query: { year } }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: prKeys.workbooks }),
  });
}

export const reportFilePath = (reportId: string) => `${P}/reports/${reportId}/file`;
