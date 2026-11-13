"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { fmtDay } from "./format";
import {
  COMPARE_KEYS, COMPARE_LABELS, PERIOD_KEYS, PERIOD_LABELS,
  type ComparePick, type FiltersOut, type PeriodKey,
} from "./types";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export interface InsightsFilterState {
  period: PeriodKey | null;
  from: string | null;
  to: string | null;
  labs: string[];
  compare: ComparePick | null;
}

export type ApiQuery = Record<string, string | undefined>;

export interface InsightsFilters {
  state: InsightsFilterState;
  /** Parameters sent to every /insights endpoint (period or from/to, labs, compare). */
  apiQuery: ApiQuery;
  /** False while a custom range is incomplete or inverted: nothing is fetched. */
  ready: boolean;
  rangeError: string | null;
  /** "?period=..." or "" so links between tabs keep the filters. */
  search: string;
  update: (patch: Partial<InsightsFilterState>) => void;
  reset: () => void;
}

export function buildSearch(s: InsightsFilterState, keep?: URLSearchParams): string {
  const p = new URLSearchParams(keep?.toString() ?? "");
  ["period", "from", "to", "labs", "compare"].forEach((k) => p.delete(k));
  if (s.period) p.set("period", s.period);
  if (s.period === "custom") {
    if (s.from) p.set("from", s.from);
    if (s.to) p.set("to", s.to);
  }
  if (s.labs.length) p.set("labs", s.labs.join(","));
  if (s.compare) p.set("compare", s.compare);
  const out = p.toString();
  return out ? `?${out}` : "";
}

/** Filters live in the URL so a view can be bookmarked (PRD 10.7). */
export function useInsightsFilters(): InsightsFilters {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const spKey = sp.toString();

  const state = useMemo<InsightsFilterState>(() => {
    const params = new URLSearchParams(spKey);
    const rawFrom = params.get("from");
    const rawTo = params.get("to");
    const from = rawFrom && ISO.test(rawFrom) ? rawFrom : null;
    const to = rawTo && ISO.test(rawTo) ? rawTo : null;
    const rawPeriod = params.get("period");
    let period: PeriodKey | null = PERIOD_KEYS.includes(rawPeriod as PeriodKey) ? (rawPeriod as PeriodKey) : null;
    if (from || to) period = "custom";
    const labs = Array.from(new Set((params.get("labs") ?? "").split(",").map((x) => x.trim()).filter(Boolean)));
    const rawCompare = params.get("compare");
    const compare = COMPARE_KEYS.includes(rawCompare as ComparePick) ? (rawCompare as ComparePick) : null;
    return { period, from, to, labs, compare };
  }, [spKey]);

  const rangeError =
    state.period !== "custom"
      ? null
      : !state.from || !state.to
        ? "Choose both a start and an end date."
        : state.from > state.to
          ? "The start date must be on or before the end date."
          : null;
  const ready = rangeError === null;

  const apiQuery = useMemo<ApiQuery>(() => {
    const q: ApiQuery = {};
    if (state.period === "custom") {
      if (state.from && state.to && state.from <= state.to) {
        q.from = state.from;
        q.to = state.to;
      }
    } else if (state.period) {
      q.period = state.period;
    }
    if (state.labs.length) q.labs = state.labs.join(",");
    if (state.compare) q.compare = state.compare;
    return q;
  }, [state]);

  const search = useMemo(() => buildSearch(state), [state]);

  const update = useCallback(
    (patch: Partial<InsightsFilterState>) => {
      const next = { ...state, ...patch };
      const qs = buildSearch(next, new URLSearchParams(spKey));
      router.replace(`${pathname}${qs}`, { scroll: false });
    },
    [state, spKey, router, pathname],
  );

  const reset = useCallback(() => {
    const qs = buildSearch({ period: null, from: null, to: null, labs: [], compare: null }, new URLSearchParams(spKey));
    router.replace(`${pathname}${qs}`, { scroll: false });
  }, [spKey, router, pathname]);

  return { state, apiQuery, ready, rangeError, search, update, reset };
}

/** Plain-words summary of the current filters, used by the mobile sheet and the report sheet. */
export function describeFilters(state: InsightsFilterState, options?: FiltersOut): { period: string; labs: string; compare: string } {
  const current = state.period ?? options?.default_period ?? "this_month";
  let period: string;
  if (current === "custom") {
    period = state.from && state.to ? `${fmtDay(state.from)} to ${fmtDay(state.to)}` : "Custom range";
  } else {
    const preset = options?.presets.find((p) => p.key === current);
    const label = preset?.label ?? PERIOD_LABELS[current as PeriodKey] ?? current;
    period = preset ? `${label} (${fmtDay(preset.start)} to ${fmtDay(preset.end)})` : label;
  }
  const labs = state.labs.length
    ? state.labs.map((k) => options?.labs.find((l) => l.key === k)?.name ?? k).join(", ")
    : "All labs";
  const cmpKey = state.compare ?? options?.default_compare ?? "previous";
  const compare = options?.compare_options.find((o) => o.key === cmpKey)?.label ?? COMPARE_LABELS[cmpKey as ComparePick] ?? cmpKey;
  return { period, labs, compare };
}