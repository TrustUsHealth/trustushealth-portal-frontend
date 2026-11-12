"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Logo } from "@/components/logo";
import { useAuth } from "./session";

export function FullScreenLoader({ label = "Opening the portal" }: { label?: string }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-ivory" role="status">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-pulse"><Logo variant="mark" className="h-14" /></div>
        <p className="text-sm text-ink-muted">{label}…</p>
      </div>
    </div>
  );
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();
  const path = usePathname();

  useEffect(() => {
    if (status === "anonymous") {
      const next = path && path !== "/dashboard" ? `?next=${encodeURIComponent(path + window.location.search)}` : "";
      router.replace(`/login${next}`);
    }
  }, [status, router, path]);

  if (status !== "authenticated") return <FullScreenLoader label={status === "anonymous" ? "Taking you to sign in" : undefined} />;
  return <>{children}</>;
}

/** Roles gate for whole screens (the server still enforces every request). */
export function RoleGate({ roles, children }: { roles: string[]; children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role)) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h1 className="text-xl font-semibold">This area is for {roles.join(" / ")} accounts</h1>
        <p className="mt-2 text-sm text-ink-muted">Ask an admin if you need access.</p>
      </div>
    );
  }
  return <>{children}</>;
}
