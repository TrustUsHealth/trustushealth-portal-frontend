"use client";

import { useEffect, useRef } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiWithConflict, downloadFile } from "@/core/api/client";
import type {
  Customer, CustomerDetail, DuplicateDecision, EntryCreate, EntryDetail, EntryPatch, EntryQuery, EntrySummary,
  FieldDef, Entry, Paged, ParseOut, SaveOut, SendOut, SyncItemList, SyncRun, SyncRunIn, SyncRunStarted, Workbook,
} from "@/core/api/types";
import { useAuth } from "@/core/auth/session";
import { usePartners } from "@/core/shell/tiles";
import { SPECTRUM_KEY, runIsLive } from "./sync-utils";

const P = "/patient_registry";
export const prKeys = {
  all: ["pr"] as const,
  fields: ["pr", "fields"] as const,
  entries: (q: EntryQuery) => ["pr", "entries", q] as const,
  entry: (id: string) => ["pr", "entry", id] as const,
  customers: (q: string, page: number) => ["pr", "customers", q, page] as const,
  customer: (id: string) => ["pr", "customer", id] as const,
  workbooks: ["pr", "workbooks"] as const,
  syncAll: ["pr", "sync"] as const,
  syncRuns: (limit: number) => ["pr", "sync", "runs", limit] as const,
  syncRun: (id: string) => ["pr", "sync", "run", id] as const,
  syncItems: (status: string, limit: number) => ["pr", "sync", "items", status, limit] as const,
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

// Lab portal auto-sync (admin only; the server enforces it)
export type SyncItemFilter = "done" | "failed" | "needs_review" | "processing" | "all";

/** Recent runs of every kind (scheduled, catch-up, admin, cron, CLI). Polls fast while one is running. */
export const useSyncRuns = (enabled: boolean, limit = 10) =>
  useQuery({
    queryKey: prKeys.syncRuns(limit),
    queryFn: () => api<SyncRun[]>(`${P}/sync/spectrum/runs`, { query: { limit } }),
    enabled,
    retry: false,
    staleTime: 0,
    refetchInterval: (q) => (q.state.data?.some(runIsLive) ? 3_000 : 60_000),
  });

export const useSyncRun = (id: string | null) =>
  useQuery({
    queryKey: prKeys.syncRun(id ?? ""),
    queryFn: () => api<SyncRun>(`${P}/sync/spectrum/runs/${id}`),
    enabled: !!id,
    retry: false,
    staleTime: 0,
    refetchInterval: (q) => (q.state.status === "error" ? false : !q.state.data || q.state.data.status === "running" ? 2_000 : false),
  });

/** Ledger rows. `status` undefined = all. */
export const useSyncItems = (status: SyncItemFilter | undefined, enabled: boolean, limit = 50) =>
  useQuery({
    queryKey: prKeys.syncItems(!status || status === "all" ? "all" : status, limit),
    queryFn: () =>
      api<SyncItemList>(`${P}/sync/spectrum/items`, { query: { status: !status || status === "all" ? undefined : status, limit } }),
    enabled,
    retry: false,
    placeholderData: keepPreviousData,
  });

/** POST /sync/spectrum/run: 202 started, 409 another run is active, 422 bad range, 503 sync off / not configured. */
export function useStartSync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: SyncRunIn) => api<SyncRunStarted>(`${P}/sync/spectrum/run`, { method: "POST", json: body }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: prKeys.syncAll }),
  });
}

/** Admin + a lab with portal sync enabled for the registry. `ready` = the lab list has loaded. */
export function useSyncAvailable() {
  const { isAdmin } = useAuth();
  const { data: partners } = usePartners("patient_registry", isAdmin);
  return { isAdmin, lab: isAdmin ? partners?.find((p) => p.key === SPECTRUM_KEY) : undefined, ready: !isAdmin || partners !== undefined };
}

/** When a run ends, the entry list and the sync lists are stale: refresh them. */
export function useRefreshWhenRunEnds(liveId: string | null) {
  const qc = useQueryClient();
  const prev = useRef<string | null>(null);
  useEffect(() => {
    if (prev.current && !liveId) {
      void qc.invalidateQueries({ queryKey: ["pr", "entries"] });
      void qc.invalidateQueries({ queryKey: prKeys.syncAll });
    }
    prev.current = liveId;
  }, [liveId, qc]);
}

/** Everything the header chip and the Lab sync page need: runs, the live one, the last finished one and counts to review. */
export function useSyncOverview(enabled: boolean) {
  const runs = useSyncRuns(enabled, 10);
  const failed = useSyncItems("failed", enabled, 1);
  const review = useSyncItems("needs_review", enabled, 1);
  const live = runs.data?.find(runIsLive);
  const last = runs.data?.find((r) => !runIsLive(r));
  const failedTotal = failed.data?.total ?? 0;
  const reviewTotal = review.data?.total ?? 0;
  useRefreshWhenRunEnds(live?.id ?? null);
  return { runs, live, last, failedTotal, reviewTotal, attention: failedTotal + reviewTotal };
}