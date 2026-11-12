"use client";

import { createContext, useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/core/api/client";
import type { AppConfig } from "@/core/api/types";

/** Defaults keep the login page usable even before the backend answers. */
export const DEFAULT_CONFIG: AppConfig = {
  brand_name: "TrustUs Health",
  logo_full: "/brand/logo-full.svg",
  logo_mark: "/brand/logo-mark.svg",
  favicon: "/brand/favicon.ico",
  timezone: "Asia/Kolkata",
  currency: "INR",
  upload_max_mb: 10,
  upload_allowed: ["pdf", "docx"],
};

const Ctx = createContext<AppConfig>(DEFAULT_CONFIG);

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const { data } = useQuery({
    queryKey: ["config", "app"],
    queryFn: () => api<AppConfig>("/config/app", { anonymous: true }),
    staleTime: 10 * 60_000,
    retry: 1,
  });
  return <Ctx.Provider value={data ?? DEFAULT_CONFIG}>{children}</Ctx.Provider>;
}

export const useAppConfig = () => useContext(Ctx);
