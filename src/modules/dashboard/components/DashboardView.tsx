"use client";

import Link from "next/link";
import { ClipboardPlus, FileSpreadsheet, FilePenLine, Inbox, LayoutGrid, Sigma, Sun } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { RolePill } from "@/components/ui/badge";
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

function Stat({ icon: Icon, label, value, href, tone }: { icon: typeof Sun; label: string; value?: number; href?: string; tone?: "warn" }) {
  const body = (
    <div className="flex items-center gap-3 rounded-card border border-line/80 bg-white p-4 shadow-card transition-colors hover:border-slate-nav/50">
      <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl", tone === "warn" && (value ?? 0) > 0 ? "bg-warn-soft text-warn" : "bg-slate-nav/10 text-slate-nav")}>
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <div>
        {value === undefined ? <Skeleton className="h-7 w-10" /> : <p className="font-display text-2xl font-semibold tabular-nums leading-none text-ink-heading">{value}</p>}
        <p className="mt-1 text-[13px] text-ink-muted">{label}</p>
      </div>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
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
            <Link href="/patient_registry/new" className={buttonStyles({ variant: "primary", size: "lg" })}><ClipboardPlus className="h-4 w-4" aria-hidden />New patient entry</Link>
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
        <section aria-label="Patient registry at a glance" className="mb-8 grid gap-3 sm:grid-cols-3">
          <Stat icon={FileSpreadsheet} label="Entries registered today" value={stats.data?.today} href="/patient_registry" />
          <Stat icon={FilePenLine} label="Drafts waiting for amounts" value={stats.data?.drafts} href="/patient_registry?status=draft" tone="warn" />
          <Stat icon={Sigma} label="Entries in total" value={stats.data?.total} href="/patient_registry" />
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
