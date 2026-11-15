"use client";

import Link from "next/link";
import { ChevronRight, FileText, Lock, Receipt } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader, Skeleton } from "@/components/ui/misc";
import { errorMessage } from "@/core/api/client";
import { useLabs } from "../api";
import type { BillMode } from "../types";

/** The backend exposes lab-specific endpoints (`/spectrum/*`, `/metropolis/*`), so each supported lab has its own screen. */
const LAB_ROUTES: Record<string, string> = {
  spectrum: "/bill_generator/spectrum",
  metropolis: "/bill_generator/metropolis",
};

const MODE_COPY: Record<BillMode, { title: string; text: string; icon: typeof Receipt }> = {
  generate: { title: "Generated bill", text: "Make a plain PDF bill from a saved entry, an uploaded report, or from scratch.", icon: Receipt },
  edit_pdf: { title: "Edit the lab’s own bill", text: "Upload the lab’s bill PDF and enter your amounts. Only the amount cells change.", icon: FileText },
};

export function BillHomeView() {
  const { data, isLoading, error } = useLabs();

  return (
    <>
      <PageHeader title="Bill Generator" description="Choose the lab, then make, print or email the patient’s bill." />
      {error ? (
        <Alert kind="error" title="Could not open Bill Generator">{errorMessage(error)}</Alert>
      ) : isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">{[0, 1].map((i) => <Skeleton key={i} className="h-40 rounded-card" />)}</div>
      ) : !data?.length ? (
        <Alert kind="warning" title="No laboratory is open to you here">Ask an admin to grant access to a lab in this module.</Alert>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {data.map((lab) => {
            const copy = MODE_COPY[lab.mode];
            const Icon = copy.icon;
            const href = LAB_ROUTES[lab.key];
            const body = (
              <>
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-slate-nav/10 text-slate-nav"><Icon className="size-6" aria-hidden /></span>
                <span className="mt-4 block">
                  <span className="block font-display text-xl font-semibold text-ink-heading">{lab.name}</span>
                  <span className="mt-0.5 block text-[13px] font-semibold text-slate-nav">{copy.title}</span>
                  <span className="mt-2 block text-sm text-ink-muted">{href ? copy.text : "There is no bill screen for this lab yet."}</span>
                </span>
                {href ? <ChevronRight className="absolute right-4 top-4 h-5 w-5 text-ink-muted" aria-hidden /> : <Lock className="absolute right-4 top-4 h-4 w-4 text-ink-muted" aria-label="Not available" />}
              </>
            );
            const cls = "group relative flex min-h-40 flex-col rounded-card border bg-white p-5 text-left shadow-card transition-all";
            return href ? (
              <Link key={lab.key} href={href} className={`${cls} border-line hover:-translate-y-0.5 hover:border-slate-nav/50`}>{body}</Link>
            ) : (
              <div key={lab.key} className={`${cls} border-line opacity-60`}>{body}</div>
            );
          })}
        </div>
      )}

      <Card className="mt-6">
        <CardHeader title="Good to know" />
        <CardBody>
          <ul className="list-disc space-y-2 pl-5 text-sm text-ink">
            <li>Bills are made on the spot and never stored. Preview, download or email creates the PDF each time.</li>
            <li>Test amounts and the client name are saved on the patient entry, so next time you only change what differs.</li>
            <li>Email sends the bill only to your own address.</li>
            <li>For labs that print their own bill number, that number replaces the portal’s bill number on the entry.</li>
          </ul>
        </CardBody>
      </Card>
    </>
  );
}