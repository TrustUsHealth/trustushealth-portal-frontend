"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { api, ApiError, downloadFile } from "@/core/api/client";
import { useAuth } from "@/core/auth/session";
import type { InsightsFilters } from "./filters";
import type { FiltersOut, InsightsEndpoint } from "./types";

/** 403, 404, 422 and 429 will not get better on their own, so they are not retried. */
const retry = (count: number, err: unknown) =>
  !(err instanceof ApiError && [403, 404, 422, 429].includes(err.status)) && count < 1;

/** Presets with resolved dates, labs with colours, thresholds, palette, compare options, report sections. Fetched once. */
export function useInsightsFilterOptions(): UseQueryResult<FiltersOut, Error> {
  const { isAdmin } = useAuth();
  return useQuery<FiltersOut, Error>({
    queryKey: ["insights", "filters"],
    queryFn: ({ signal }) => api<FiltersOut>("/insights/filters", { signal }),
    enabled: isAdmin,
    staleTime: 60 * 60_000,
    refetchOnWindowFocus: false,
    retry,
  });
}

/** Only the open tab is fetched. The server caches for 5 minutes, so the client does the same. */
export function useInsightsTab<T>(endpoint: InsightsEndpoint, filters: InsightsFilters): UseQueryResult<T, Error> {
  const { isAdmin } = useAuth();
  return useQuery<T, Error>({
    queryKey: ["insights", endpoint, filters.apiQuery],
    queryFn: ({ signal }) => api<T>(`/insights/${endpoint}`, { query: filters.apiQuery, signal }),
    enabled: isAdmin && filters.ready,
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
    retry,
  });
}

/** Refresh button: asks the server to skip its cache (refresh=true), then marks other tabs stale. */
export function useRefreshInsights(endpoint: InsightsEndpoint, filters: InsightsFilters) {
  const qc = useQueryClient();
  const mine = JSON.stringify(filters.apiQuery);
  return useMutation({
    mutationFn: () => api<unknown>(`/insights/${endpoint}`, { query: { ...filters.apiQuery, refresh: true } }),
    onSuccess: (data) => {
      qc.setQueryData(["insights", endpoint, filters.apiQuery], data);
      qc.invalidateQueries({
        queryKey: ["insights"],
        predicate: (q) => q.queryKey[1] !== "filters" && !(q.queryKey[1] === endpoint && JSON.stringify(q.queryKey[2]) === mine),
      });
    },
  });
}

/** GET /insights/report.pdf with the same filters plus sections, saved as a file. */
export function useDownloadReport() {
  return useMutation({
    mutationFn: ({ filters, sections }: { filters: InsightsFilters; sections: string[] }) =>
      downloadFile("/insights/report.pdf", { ...filters.apiQuery, sections: sections.join(",") }, "TrustUs_Business_Report.pdf"),
  });
}

/** POST /insights/report.email sends the same filtered PDF to the signed-in admin. */
export function useEmailReport() {
  return useMutation({
    mutationFn: ({ filters, sections }: { filters: InsightsFilters; sections: string[] }) =>
      api<{ status: "sent" }>("/insights/report.email", {
        method: "POST",
        query: { ...filters.apiQuery, sections: sections.join(",") },
      }),
  });
}