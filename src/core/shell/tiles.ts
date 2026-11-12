"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/core/api/client";
import type { PartnerOut, TileOut } from "@/core/api/types";
import { useAuth } from "@/core/auth/session";

/** The server decides who sees what (PRD 4.4). The frontend never hard-codes access. */
export function useTiles() {
  const { status, user } = useAuth();
  return useQuery({
    queryKey: ["me", "modules", user?.id],
    queryFn: () => api<TileOut[]>("/me/modules"),
    enabled: status === "authenticated",
    staleTime: 15_000,
  });
}

export function useTile(key: string) {
  const q = useTiles();
  return { ...q, tile: q.data?.find((t) => t.key === key) };
}

/** Lab selector source: labs enabled for this module that the user may open. */
export function usePartners(module: string, enabled = true) {
  return useQuery({
    queryKey: ["config", "partners", module],
    queryFn: () => api<PartnerOut[]>("/config/partners", { query: { module } }),
    enabled,
    staleTime: 5 * 60_000,
  });
}
