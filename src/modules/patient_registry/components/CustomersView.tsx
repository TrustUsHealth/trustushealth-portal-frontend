"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, ChevronRight, Mail, Phone, Search, UserRound } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { buttonStyles } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState, PageHeader, Pagination, Skeleton } from "@/components/ui/misc";
import { EntryMini } from "@/components/entry-mini";
import { usePartners } from "@/core/shell/tiles";
import { formatAge, formatDate } from "@/lib/format";
import { useCustomer, useCustomers } from "../api";
import { RegistryNav } from "./RegistryNav";

export function CustomersView() {
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  useEffect(() => {
    const t = setTimeout(() => { setQ(text.trim()); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [text]);
  const { data, isLoading, error } = useCustomers(q, page);

  return (
    <>
      <PageHeader title="Patients" description="One identity per person, with every visit linked underneath." />
      <RegistryNav />
      <Card className="mb-4 p-3 md:p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden />
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Search by patient name" aria-label="Search patients" className="pl-9" />
        </div>
      </Card>
      {error ? <Alert kind="error" title="Could not load patients">{(error as Error).message}</Alert>
        : isLoading ? <Card className="space-y-3 p-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14" />)}</Card>
        : !data?.items.length ? <Card><EmptyState icon={UserRound} title={q ? "No patient matches that name" : "No patients yet"}>Patients appear here automatically when you save an entry.</EmptyState></Card>
        : (
          <>
            <Card className="divide-y divide-line/70 overflow-hidden">
              {data.items.map((c) => (
                <Link key={c.id} href={`/patient_registry/customers/${c.id}`} className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-ivory">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-nav/10 font-display font-semibold text-slate-nav">{c.name[0]}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink-heading">{c.name}</p>
                    <p className="truncate text-xs text-ink-muted">{[formatAge(c.age, c.age_unit), c.gender, c.phone].filter((x) => x && x !== "—").join(" · ") || "No other details"}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-ink-muted" aria-hidden />
                </Link>
              ))}
            </Card>
            <Pagination page={data.page} pageSize={data.page_size} total={data.total} onPage={setPage} />
          </>
        )}
    </>
  );
}

export function CustomerDetailView({ id }: { id: string }) {
  const { data, isLoading, error } = useCustomer(id);
  const { data: partners } = usePartners("patient_registry");
  const labNames = Object.fromEntries((partners ?? []).map((p) => [p.key, p.name]));

  return (
    <>
      <div className="mb-4"><Link href="/patient_registry/customers" className={buttonStyles({ variant: "ghost", size: "sm" })}><ArrowLeft className="h-4 w-4" aria-hidden />All patients</Link></div>
      <RegistryNav />
      {error ? <Alert kind="error" title="Could not load this patient">{(error as Error).message}</Alert>
        : isLoading || !data ? <Skeleton className="h-64 rounded-card" />
        : (
          <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
            <Card className="self-start">
              <CardBody>
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-nav font-display text-2xl font-semibold text-white">{data.name[0]}</span>
                <h1 className="mt-3 text-xl font-semibold">{data.name}</h1>
                <p className="text-sm text-ink-muted">{[formatAge(data.age, data.age_unit), data.gender].filter((x) => x && x !== "—").join(" · ") || "Age and gender not recorded"}</p>
                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-ink-muted" aria-hidden /><dd>{data.phone ?? "No phone"}</dd></div>
                  <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-ink-muted" aria-hidden /><dd className="truncate">{data.email ?? "No email"}</dd></div>
                </dl>
                <p className="mt-4 text-xs text-ink-muted">First seen {formatDate(data.created_at)}</p>
              </CardBody>
            </Card>
            <Card>
              <CardHeader title={`Visits (${data.entries.length})`} description="Newest first. Only labs you can open are shown." />
              <CardBody className="space-y-2">
                {data.entries.length ? data.entries.map((e) => <EntryMini key={e.id} entry={e} labName={labNames[e.partner_key]} href={`/patient_registry/${e.id}`} />)
                  : <p className="text-sm text-ink-muted">No visits in the labs you can open.</p>}
              </CardBody>
            </Card>
          </div>
        )}
    </>
  );
}
