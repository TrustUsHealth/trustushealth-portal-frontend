"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, ClipboardList, Plus, Search, SlidersHorizontal, X } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { StatusPill } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import { EmptyState, PageHeader, Pagination, Skeleton } from "@/components/ui/misc";
import { BillTag } from "@/components/bill-tag";
import type { EntryQuery, EntrySummary } from "@/core/api/types";
import { useAuth } from "@/core/auth/session";
import { useAppConfig } from "@/core/config/provider";
import { usePartners } from "@/core/shell/tiles";
import { formatAge, formatDate, formatMoney, humanizeKey } from "@/lib/format";
import { useEntries } from "../api";
import { SPECTRUM_KEY } from "../sync-utils";
import { RegistryNav } from "./RegistryNav";
import { SpectrumSyncPanel } from "./SpectrumSyncPanel";

const FILTER_KEYS = ["partner_key", "status", "date_from", "date_to", "referred_by", "bill_no", "lab_pid"] as const;

export function EntriesView() {
  const router = useRouter();
  const sp = useSearchParams();
  const { isAdmin } = useAuth();
  const { currency } = useAppConfig();
  const { data: partners } = usePartners("patient_registry");
  const labName = (k: string) => partners?.find((p) => p.key === k)?.name ?? humanizeKey(k);

  const query: EntryQuery = useMemo(
    () => ({
      q: sp.get("q") ?? "",
      partner_key: sp.get("partner_key") ?? "",
      status: (sp.get("status") as EntryQuery["status"]) ?? "",
      date_from: sp.get("date_from") ?? "",
      date_to: sp.get("date_to") ?? "",
      referred_by: sp.get("referred_by") ?? "",
      bill_no: sp.get("bill_no") ?? "",
      lab_pid: sp.get("lab_pid") ?? "",
      page: Number(sp.get("page") ?? 1) || 1,
    }),
    [sp],
  );

  function setParams(patch: Record<string, string | number | undefined>, keepPage = false) {
    const p = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) (v === undefined || v === "" ? p.delete(k) : p.set(k, String(v)));
    if (!keepPage) p.delete("page");
    router.replace(`/patient_registry${p.toString() ? `?${p}` : ""}`, { scroll: false });
  }

  // Debounced free-text search (name, lab PID, bill no all go through `q`).
  const [text, setText] = useState(query.q ?? "");
  useEffect(() => setText(query.q ?? ""), [query.q]);
  useEffect(() => {
    if (text === (query.q ?? "")) return;
    const t = setTimeout(() => setParams({ q: text.trim() }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  const advancedActive = ["referred_by", "bill_no", "lab_pid", "date_from", "date_to"].some((k) => sp.get(k));
  const [more, setMore] = useState(advancedActive);
  const activeCount = FILTER_KEYS.filter((k) => sp.get(k)).length + (sp.get("q") ? 1 : 0);

  const { data, isLoading, isFetching, error } = useEntries(query);
  const statusOptions = [
    { value: "", label: "All" },
    { value: "draft", label: "Drafts" },
    { value: "complete", label: "Complete" },
  ];

  return (
    <>
      <PageHeader
        title="Patient Registry"
        description="Every patient entry, one per lab visit. Search by name, lab patient ID or bill number."
        actions={<Link href="/patient_registry/new" className={buttonStyles({ variant: "primary", size: "lg" })}><Plus className="size-5" aria-hidden />New entry</Link>}
      />
      <RegistryNav />

      {isAdmin && <SpectrumSyncPanel onShowDrafts={() => setParams({ partner_key: SPECTRUM_KEY, status: "draft" })} />}

      <Card className="mb-5 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-60 flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted" aria-hidden />
            <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Search name, patient ID or bill no." aria-label="Search entries" className="pl-11" />
          </div>
          <Select aria-label="Laboratory" className="w-full sm:w-52" value={query.partner_key} onChange={(e) => setParams({ partner_key: e.target.value })}>
            <option value="">All labs</option>
            {partners?.map((p) => <option key={p.key} value={p.key}>{p.name}</option>)}
          </Select>
          <div role="group" aria-label="Status" className="inline-flex rounded-ctl border border-line bg-ivory p-1">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setParams({ status: option.value })}
                aria-pressed={query.status === option.value}
                className={`h-9 rounded-md px-3.5 text-sm font-medium transition-colors ${query.status === option.value ? "bg-white text-ink-heading shadow-sm" : "text-ink-muted hover:text-ink-heading"}`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <Button variant="ghost" onClick={() => setMore((m) => !m)} aria-expanded={more}>
            <SlidersHorizontal className="h-4 w-4" aria-hidden />More filters
            <ChevronDown className={`h-4 w-4 transition-transform ${more ? "rotate-180" : ""}`} aria-hidden />
          </Button>
        </div>
        {more && (
          <div className="mt-4 grid gap-3 border-t border-line/70 pt-4 sm:grid-cols-2 lg:grid-cols-5">
            <Field label="From date" htmlFor="df"><Input id="df" type="date" value={query.date_from} onChange={(e) => setParams({ date_from: e.target.value })} /></Field>
            <Field label="To date" htmlFor="dt"><Input id="dt" type="date" value={query.date_to} onChange={(e) => setParams({ date_to: e.target.value })} /></Field>
            <Field label="Referred by" htmlFor="rb"><Input id="rb" defaultValue={query.referred_by} onBlur={(e) => setParams({ referred_by: e.target.value.trim() })} onKeyDown={(e) => e.key === "Enter" && setParams({ referred_by: (e.target as HTMLInputElement).value.trim() })} placeholder="Doctor name" /></Field>
            <Field label="Bill no." htmlFor="bn"><Input id="bn" inputMode="numeric" defaultValue={query.bill_no} onBlur={(e) => setParams({ bill_no: e.target.value.trim() })} onKeyDown={(e) => e.key === "Enter" && setParams({ bill_no: (e.target as HTMLInputElement).value.trim() })} placeholder="000123" /></Field>
            <Field label="Lab patient ID" htmlFor="pid"><Input id="pid" defaultValue={query.lab_pid} onBlur={(e) => setParams({ lab_pid: e.target.value.trim() })} onKeyDown={(e) => e.key === "Enter" && setParams({ lab_pid: (e.target as HTMLInputElement).value.trim() })} /></Field>
          </div>
        )}
        {activeCount > 0 && (
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-line/70 pt-3">
            <p className="text-sm text-ink-muted" aria-live="polite">{data ? `${data.total} ${data.total === 1 ? "entry" : "entries"} match` : "Searching…"}</p>
            <Button size="sm" variant="ghost" onClick={() => router.replace("/patient_registry")}><X className="h-4 w-4" aria-hidden />Clear all filters</Button>
          </div>
        )}
      </Card>

      {error ? (
        <Alert kind="error" title="Could not load entries">{(error as Error).message}</Alert>
      ) : isLoading ? (
        <Card className="space-y-3 p-4">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12" />)}</Card>
      ) : !data?.items.length ? (
        <Card>
          <EmptyState
            icon={ClipboardList}
            title={activeCount ? "No entries match these filters" : "No entries yet"}
            action={activeCount ? <Button onClick={() => router.replace("/patient_registry")}>Clear filters</Button> : <Link href="/patient_registry/new" className={buttonStyles({ variant: "primary" })}>Create the first entry</Link>}
          >
            {activeCount ? "Try a different spelling, a wider date range, or another lab." : "Pick a lab, upload its report or type the details, and the entry gets its bill number."}
          </EmptyState>
        </Card>
      ) : (
        <div className={isFetching ? "opacity-70 transition-opacity" : "transition-opacity"}>
          {/* desktop table */}
          <Card className="hidden overflow-hidden md:block">
            <div className="scroll-x">
              <table className="w-full min-w-[56rem] text-left text-sm">
                <thead className="border-b border-line bg-ivory text-xs font-semibold text-ink-muted">
                  <tr>{["Bill no.", "Patient", "Lab", "Registered", "Referred by", "Tests", "Billed", "Status"].map((h) => <th key={h} scope="col" className={`px-4 py-3 ${h === "Billed" ? "text-right" : ""}`}>{h}</th>)}<th className="w-8" /></tr>
                </thead>
                <tbody className="divide-y divide-line/70">
                  {data.items.map((e) => <Row key={e.id} e={e} lab={labName(e.partner_key)} currency={currency} onOpen={() => router.push(`/patient_registry/${e.id}`)} />)}
                </tbody>
              </table>
            </div>
          </Card>
          {/* mobile cards */}
          <ul className="space-y-3 md:hidden">
            {data.items.map((e) => (
              <li key={e.id}>
                <Link href={`/patient_registry/${e.id}`} className="block rounded-card border border-line/80 bg-white p-4 shadow-card active:bg-ivory">
                  <div className="flex items-center justify-between gap-3">
                    <BillTag billNo={e.bill_no} />
                    <StatusPill status={e.status} />
                  </div>
                  <p className="mt-2 truncate font-semibold text-ink-heading">{e.patient_name}</p>
                  <p className="text-sm text-ink-muted">{[formatAge(e.age, e.age_unit), e.gender, formatDate(e.registration_date)].filter((x) => x && x !== "—").join(" · ")}</p>
                  <div className="mt-2 flex items-end justify-between gap-3 text-sm">
                    <span className="min-w-0 flex-1 truncate text-ink-muted">{e.tests.join("; ") || "—"}</span>
                    <span className="font-semibold tabular-nums text-ink-heading">{formatMoney(e.net_amount, currency)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          <Pagination page={data.page} pageSize={data.page_size} total={data.total} onPage={(p) => setParams({ page: p }, true)} />
        </div>
      )}
    </>
  );
}

function Row({ e, lab, currency, onOpen }: { e: EntrySummary; lab: string; currency: string; onOpen: () => void }) {
  const tests = e.tests.length ? (
    <span title={e.tests.join("; ")}>
      <span className="line-clamp-1">{e.tests[0]}</span>
      {e.tests.length > 1 && <span className="text-[13px] text-ink-muted"> +{e.tests.length - 1} more</span>}
    </span>
  ) : <span className="text-ink-muted">—</span>;
  return (
    <tr onClick={onOpen} className="cursor-pointer transition-colors hover:bg-ivory">
      <td className="px-4 py-3"><BillTag billNo={e.bill_no} /></td>
      <td className="px-4 py-3">
        <Link href={`/patient_registry/${e.id}`} onClick={(ev) => ev.stopPropagation()} className="font-semibold text-ink-heading hover:underline">{e.patient_name}</Link>
        <p className="text-xs text-ink-muted">{[formatAge(e.age, e.age_unit), e.gender].filter((x) => x && x !== "—").join(" · ")}</p>
      </td>
      <td className="px-4 py-3">{lab}</td>
      <td className="whitespace-nowrap px-4 py-3">{formatDate(e.registration_date)}</td>
      <td className="max-w-40 truncate px-4 py-3">{e.referred_by ?? "—"}</td>
      <td className="max-w-56 px-4 py-3">{tests}</td>
      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">{formatMoney(e.net_amount, currency)}</td>
      <td className="px-4 py-3"><StatusPill status={e.status} /></td>
      <td className="pr-3 text-ink-muted"><ChevronRight className="h-4 w-4" aria-hidden /></td>
    </tr>
  );
}