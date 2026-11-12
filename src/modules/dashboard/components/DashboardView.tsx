"use client";

import Link from "next/link";
import { ArrowRight, Inbox, LayoutGrid, Plus, Sun } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Pill, RolePill } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { EmptyState, Skeleton } from "@/components/ui/misc";
import { useAuth } from "@/core/auth/session";
import { useTiles } from "@/core/shell/tiles";
import { cn } from "@/lib/utils";
import { useAdminModules, usePendingRequests } from "@/modules/access/api";
import { useRegistryStats } from "../api";
import { TileCard } from "./TileCard";

function greeting() {
  const h = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }).format(new Date()));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export function DashboardView() {
  const { user, isAdmin } = useAuth();
  const { data: tiles, isLoading, error } = useTiles();
  const { data: adminMods } = useAdminModules(isAdmin);
  const { data: pending } = usePendingRequests(isAdmin);

  const registryOpen = !!tiles?.some((t) => t.key === "patient_registry" && t.state === "open");
  const stats = useRegistryStats(registryOpen);
  const first = user?.name?.split(" ")[0] ?? user?.email.split("@")[0];
  const today = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Kolkata" }).format(new Date());

  return (
    <>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4 md:mb-8">
        <div>
          <p className="flex items-center gap-2 text-sm text-ink-muted"><Sun className="h-4 w-4" aria-hidden />{today}{user && <RolePill role={user.role} />}</p>
          <h1 className="mt-1 text-3xl font-semibold md:text-4xl">{greeting()}, {first}</h1>
        </div>
        {registryOpen && (
          <div className="flex flex-wrap gap-2">
            <Link href="/patient_registry/new" className={cn(buttonStyles({ variant: "primary", size: "lg" }), "gap-2 px-4 text-base")}><Plus className="size-5" aria-hidden />New patient entry</Link>
          </div>
        )}
      </header>

      {isAdmin && (pending?.length ?? 0) > 0 && (
        <Alert kind="warning" title={`${pending!.length} access request${pending!.length > 1 ? "s" : ""} waiting`} className="mb-5"
          action={<Link href="/access" className={buttonStyles({ variant: "secondary", size: "sm" })}>Review</Link>}>
          Staff are waiting for you to open modules for them.
        </Alert>
      )}

      {registryOpen && (
        <section aria-label="Patient registry at a glance" className="mb-8 grid divide-y divide-line/70 overflow-hidden rounded-card border border-line/80 bg-white shadow-card sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <Link href="/patient_registry" className="group flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-ivory">
            <div>
              <p className="text-sm font-medium text-ink-muted">Entries registered today</p>
              <p className="mt-0.5 font-display text-3xl font-semibold tabular-nums leading-tight text-ink-heading">{stats.isLoading ? <Skeleton className="mt-1 h-8 w-12" /> : (stats.data?.today ?? "—")}</p>
              <p className="text-[13px] text-ink-muted">Registered today</p>
            </div>
            <ArrowRight className="size-5 shrink-0 text-ink-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
          <Link href="/patient_registry?status=draft" className="group flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-ivory">
            <div>
              <p className="text-sm font-medium text-ink-muted">Drafts waiting for amounts</p>
              <p className="mt-0.5 font-display text-3xl font-semibold tabular-nums leading-tight text-ink-heading">{stats.isLoading ? <Skeleton className="mt-1 h-8 w-12" /> : (stats.data?.drafts ?? "—")}</p>
              <p className="text-[13px] text-ink-muted">Entries to finish</p>
            </div>
            {(stats.data?.drafts ?? 0) > 0 ? <Pill className="border-warn/30 bg-warn-soft text-warn">Needs a look</Pill> : <ArrowRight className="size-5 shrink-0 text-ink-muted transition-transform group-hover:translate-x-0.5" aria-hidden />}
          </Link>
          <Link href="/patient_registry" className="group flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-ivory">
            <div>
              <p className="text-sm font-medium text-ink-muted">Entries in total</p>
              <p className="mt-0.5 font-display text-3xl font-semibold tabular-nums leading-tight text-ink-heading">{stats.isLoading ? <Skeleton className="mt-1 h-8 w-12" /> : (stats.data?.total ?? "—")}</p>
              <p className="text-[13px] text-ink-muted">All registered entries</p>
            </div>
            <ArrowRight className="size-5 shrink-0 text-ink-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
        </section>
      )}

      <section aria-label="Modules">
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold"><LayoutGrid className="h-4 w-4 text-ink-muted" aria-hidden />Your modules</h2>
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-48 rounded-card" />)}</div>
        ) : error ? (
          <Alert kind="error" title="Could not load your modules">{(error as Error).message}</Alert>
        ) : !tiles?.length ? (
          <EmptyState icon={Inbox} title="Nothing is open for you yet">An admin decides which modules staff can see. Ask them to make some visible.</EmptyState>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {tiles.map((t) => (
              <TileCard key={t.key} tile={t} admin={isAdmin} adminMeta={adminMods?.find((m) => m.key === t.key)} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
