"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Receipt, Search } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState, Pagination, Skeleton } from "@/components/ui/misc";
import { EntryMini } from "@/components/entry-mini";
import { ApiError, errorMessage } from "@/core/api/client";
import { useEntries } from "@/modules/patient_registry/api";

/**
 * Find a saved entry of this lab and open its bill. The bill_generator API has no search endpoint, so this reads the
 * patient_registry list; staff without registry access get a hint and can still upload a report or start from scratch.
 */
export function EntryPicker({ labKey, labName }: { labKey: string; labName: string }) {
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  useEffect(() => {
    const t = setTimeout(() => { setQ(text.trim()); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [text]);
  const { data, isLoading, error } = useEntries({ q, partner_key: labKey, page });

  return (
    <div>
      <div className="relative mb-4 max-w-md">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted" aria-hidden />
        <Input type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder="Search name, patient ID or bill no." aria-label="Search entries" className="pl-11" />
      </div>
      {error ? (
        error instanceof ApiError && error.status === 403 ? (
          <Alert kind="info" title="Searching saved entries needs Patient Registry access">
            You can still upload a report or start a bill from scratch, or ask an admin to open the Patient Registry for you.
          </Alert>
        ) : (
          <Alert kind="error" title="Could not load entries">{errorMessage(error)}</Alert>
        )
      ) : isLoading ? (
        <Card className="space-y-3 p-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16" />)}</Card>
      ) : !data?.items.length ? (
        <Card>
          <EmptyState icon={Receipt} title={q ? "No entry matches that search" : `No ${labName} entries yet`}>
            {q ? "Try another spelling, or upload the report to start a new entry." : "Upload a report or start from scratch to create the first one."}
          </EmptyState>
        </Card>
      ) : (
        <>
          <ul className="space-y-2">
            {data.items.map((e) => (
              <li key={e.id}>
                <EntryMini
                  entry={e}
                  labName={labName}
                  action={<Link href={`/bill_generator/spectrum/${e.id}`} className={buttonStyles({ variant: "slate", size: "sm" })}><Receipt className="h-4 w-4" aria-hidden />Make bill</Link>}
                />
              </li>
            ))}
          </ul>
          <Pagination page={data.page} pageSize={data.page_size} total={data.total} onPage={setPage} />
        </>
      )}
    </div>
  );
}