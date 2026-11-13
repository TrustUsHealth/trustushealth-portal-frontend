"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Gauge, RefreshCw, Users, Wallet, FlaskConical, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/misc";
import { ApiError, errorMessage } from "@/core/api/client";
import { useAuth } from "@/core/auth/session";
import { cn } from "@/lib/utils";
import type { UseQueryResult } from "@tanstack/react-query";
import { useRefreshInsights } from "../api";
import type { InsightsFilters } from "../filters";
import { clockIST, grainWord } from "../format";
import type { Envelope, FiltersOut, InsightsEndpoint, InsightsTab } from "../types";
import { FilterBar } from "./FilterBar";
import { ReportSheet } from "./ReportSheet";

const TABS: { key: InsightsTab; label: string; href: string; icon: LucideIcon }[] = [
  { key: "overview", label: "Overview", href: "/insights/overview", icon: Gauge },
  { key: "finance", label: "Finance", href: "/insights/finance", icon: Wallet },
  { key: "labs", label: "Labs", href: "/insights/labs", icon: FlaskConical },
  { key: "patients", label: "Patients", href: "/insights/patients", icon: Users },
];

export function DefaultSkeleton() {
  return (
    <div className="space-y-5" aria-hidden>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-card" />)}
      </div>
      <Skeleton className="h-72 rounded-card" />
      <Skeleton className="h-60 rounded-card" />
    </div>
  );
}

function Problem({ error, onRetry, onReset }: { error: unknown; onRetry: () => void; onReset: () => void }) {
  const status = error instanceof ApiError ? error.status : 0;
  if (status === 403) {
    return (
      <Alert kind="error" title="Admin access only">
        Business Insights shows lab cost and margin, so only Admins can open it. Ask an Admin if you need a figure.
      </Alert>
    );
  }
  if (status === 429) {
    return (
      <Alert kind="warning" title="Too many requests" action={<Button size="sm" onClick={onRetry}>Try again</Button>}>
        {errorMessage(error)}
      </Alert>
    );
  }
  if (status === 422) {
    return (
      <Alert kind="warning" title="These filters cannot be used" action={<Button size="sm" onClick={onReset}>Reset filters</Button>}>
        {errorMessage(error)}
      </Alert>
    );
  }
  return (
    <Alert kind="error" title="Could not load this screen" action={<Button size="sm" onClick={onRetry}>Try again</Button>}>
      {errorMessage(error)}
    </Alert>
  );
}

/**
 * Shared chrome for every Insights screen: heading, tab row, filter bar, report button, Updated time and refresh,
 * data notes, and the loading / error / 403 / 429 states. Screens only supply the body.
 */
export function InsightsFrame<T extends Envelope>({
  tab, endpoint, title, question, filters, options, query, skeleton, children,
}: {
  tab: InsightsTab;
  endpoint: InsightsEndpoint;
  title: string;
  question: string;
  filters: InsightsFilters;
  options?: FiltersOut;
  query: UseQueryResult<T, Error>;
  skeleton?: ReactNode;
  children: (data: T) => ReactNode;
}) {
  const path = usePathname();
  const { isAdmin } = useAuth();
  const refresh = useRefreshInsights(endpoint, filters);
  const data = query.data;

  function onRefresh() {
    refresh.mutate(undefined, { onError: (e) => toast.error(errorMessage(e)) });
  }

  let body: ReactNode;
  if (!isAdmin) {
    body = <Problem error={new ApiError(403, "")} onRetry={() => undefined} onReset={() => undefined} />;
  } else if (!filters.ready) {
    body = <Alert kind="warning" title="Choose a date range">{filters.rangeError ?? "Choose both a start and an end date."}</Alert>;
  } else if (query.isError) {
    body = <Problem error={query.error} onRetry={() => void query.refetch()} onReset={filters.reset} />;
  } else if (!data) {
    body = skeleton ?? <DefaultSkeleton />;
  } else {
    body = (
      <div aria-busy={query.isFetching} className={cn("space-y-5 transition-opacity", query.isPlaceholderData && "opacity-60")}>
        {data.data_notes.length > 0 && (
          <Alert kind="info" title="Data notes">
            <ul className="list-disc space-y-0.5 pl-4">
              {data.data_notes.map((n) => <li key={n}>{n}</li>)}
            </ul>
          </Alert>
        )}
        {children(data)}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold md:text-4xl">Business Insights</h1>
          <p className="mt-1 text-sm text-ink-muted">Money, labs and patients at a glance. Admin only.</p>
        </div>
        <ReportSheet filters={filters} options={options} rangeLabel={data?.range.label} disabled={!isAdmin} />
      </header>

      <nav aria-label="Insights sections" className="scroll-x flex gap-1.5">
        {TABS.map((t) => {
          const active = t.key === tab;
          const Icon = t.icon;
          return (
            <Link
              key={t.key}
              href={`${t.href}${filters.search}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors md:h-10",
                active ? "border-slate-nav bg-slate-nav text-white" : "border-line bg-white text-ink-muted hover:text-ink-heading",
              )}
            >
              <Icon className="size-4" aria-hidden />
              {t.label}
            </Link>
          );
        })}
      </nav>

      <FilterBar filters={filters} options={options} />

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="text-sm text-ink-muted">{question}</p>
        </div>
        <div className="flex items-center gap-2 text-[13px] text-ink-muted" aria-live="polite">
          {query.isFetching && !refresh.isPending && <span>Updating</span>}
          {data && <span>Updated {clockIST(data.generated_at)}</span>}
          <Button variant="secondary" size="sm" onClick={onRefresh} loading={refresh.isPending} disabled={!isAdmin || !filters.ready} aria-label="Refresh numbers">
            {!refresh.isPending && <RefreshCw className="size-4" aria-hidden />}
            Refresh
          </Button>
        </div>
      </div>

      {data && filters.ready && (
        <p className="text-[13px] text-ink-muted">
          Showing <span className="font-semibold text-ink-heading">{data.range.label}</span>, by {grainWord(data.grain)}
          {data.compare_range ? <> · compared with <span className="font-semibold text-ink-heading">{data.compare_range.label}</span></> : " · comparison off"}
        </p>
      )}

      {body}
    </div>
  );
}