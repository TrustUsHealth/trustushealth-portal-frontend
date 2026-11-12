"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/core/api/client";
import type { EntrySummary, Paged } from "@/core/api/types";
import { todayISO } from "@/lib/format";

const count = (query: Record<string, string>) =>
  api<Paged<EntrySummary>>("/patient_registry/entries", { query: { page: 1, page_size: 1, ...query } }).then((r) => r.total);

/** Three cheap indexed counts (page_size=1) for the dashboard strip. */
export function useRegistryStats(enabled: boolean) {
  return useQuery({
    queryKey: ["dashboard", "registry-stats", todayISO()],
    enabled,
    staleTime: 30_000,
    queryFn: async () => {
      const today = todayISO();
      const [todayCount, drafts, total] = await Promise.all([
        count({ date_from: today, date_to: today }),
        count({ status: "draft" }),
        count({}),
      ]);
      return { today: todayCount, drafts, total };
    },
  });
}
