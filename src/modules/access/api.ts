"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/core/api/client";
import type { GrantOut, MatrixOut, ModuleAdminOut, Role, UserAdminOut } from "@/core/api/types";

const KEY = ["access"] as const;

export const useUsers = () => useQuery({ queryKey: [...KEY, "users"], queryFn: () => api<UserAdminOut[]>("/access/users") });
export const useAdminModules = (enabled = true) =>
  useQuery({ queryKey: [...KEY, "modules"], queryFn: () => api<ModuleAdminOut[]>("/access/modules"), enabled });
export const usePendingRequests = (enabled = true) =>
  useQuery({ queryKey: [...KEY, "requests"], queryFn: () => api<GrantOut[]>("/access/requests"), enabled, refetchInterval: 60_000 });
export const useMatrix = () => useQuery({ queryKey: [...KEY, "matrix"], queryFn: () => api<MatrixOut>("/access/matrix") });

/** Anything that changes access also changes what dashboards and lab selectors show. */
function useInvalidate() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: KEY });
    void qc.invalidateQueries({ queryKey: ["me", "modules"] });
    void qc.invalidateQueries({ queryKey: ["config", "partners"] });
  };
}

export function useInvite() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: (b: { email: string; name?: string | null; role: Exclude<Role, "customer"> }) =>
      api<UserAdminOut>("/access/users", { method: "POST", json: b }),
    onSuccess: inv,
  });
}
export function usePatchUser() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: ({ id, ...b }: { id: string; name?: string | null; role?: Exclude<Role, "customer">; active?: boolean }) =>
      api<UserAdminOut>(`/access/users/${id}`, { method: "PATCH", json: b }),
    onSuccess: inv,
  });
}
export function useSetVisibility() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: ({ key, visible }: { key: string; visible: boolean }) =>
      api<void>(`/access/modules/${key}/visibility`, { method: "PUT", json: { visible_to_staff: visible } }),
    onSuccess: inv,
  });
}
export function useApprove() {
  const inv = useInvalidate();
  return useMutation({ mutationFn: (id: string) => api<GrantOut>(`/access/requests/${id}/approve`, { method: "POST" }), onSuccess: inv });
}
export function useDeny() {
  const inv = useInvalidate();
  return useMutation({ mutationFn: (id: string) => api<GrantOut>(`/access/requests/${id}/deny`, { method: "POST" }), onSuccess: inv });
}
export function usePreGrant() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: (b: { user_id: string; module: string; submodule?: string | null }) =>
      api<GrantOut>("/access/grants", { method: "POST", json: { submodule: null, ...b } }),
    onSuccess: inv,
  });
}
export function useRevoke() {
  const inv = useInvalidate();
  return useMutation({ mutationFn: (id: string) => api<GrantOut>(`/access/grants/${id}`, { method: "DELETE" }), onSuccess: inv });
}
/** Staff action from a locked dashboard tile (or a locked submodule). */
export function useRequestAccess() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: (b: { module: string; submodule?: string | null }) =>
      api<GrantOut>("/access/requests", { method: "POST", json: { submodule: null, ...b } }),
    onSuccess: inv,
  });
}
