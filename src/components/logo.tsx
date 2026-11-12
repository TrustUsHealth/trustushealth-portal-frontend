"use client";

import { useState } from "react";
import { useAppConfig } from "@/core/config/provider";
import { cn } from "@/lib/utils";

/** Reads paths from /config/app (app.yaml) and falls back to a text wordmark if the asset is missing. */
export function Logo({ variant = "full", className, onDark }: { variant?: "full" | "mark"; className?: string; onDark?: boolean }) {
  const cfg = useAppConfig();
  const [failed, setFailed] = useState<string | null>(null);
  const src = variant === "full" ? cfg.logo_full : cfg.logo_mark;
  if (failed === src) {
    return (
      <span className={cn("inline-flex items-center gap-2 font-display font-bold", onDark ? "text-white" : "text-ink-heading", className)}>
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-white">+</span>
        {variant === "full" && cfg.brand_name}
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={cfg.brand_name} className={cn("h-9 w-auto", className)} onError={() => setFailed(src)} />;
}
