"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Loader2, PencilLine, Search, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { buttonStyles } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { errorMessage } from "@/core/api/client";
import { useAppConfig } from "@/core/config/provider";
import { parseSpectrum } from "../api";
import type { ParsedOut } from "../types";
import { EntryPicker } from "./EntryPicker";
import { LabGate } from "./LabGate";
import { PdfUploadZone } from "./PdfUploadZone";
import { SpectrumEntryForm } from "./SpectrumEntryForm";

function Body({ labName }: { labName: string }) {
  const cfg = useAppConfig();
  const [tab, setTab] = useState("existing");
  const [stage, setStage] = useState<"source" | "form">("source");
  const [parsed, setParsed] = useState<ParsedOut | null>(null);
  const [fileName, setFileName] = useState<string | undefined>();
  const [parsing, setParsing] = useState<string | null>(null);

  async function onFile(file: File) {
    setParsing(file.name);
    try {
      const out = await parseSpectrum(file);
      setParsed(out);
      setFileName(file.name);
      setStage("form");
      toast.success("Report read. Check the details and add the amounts.");
    } catch (e) {
      toast.error("Could not read that report", {
        description: errorMessage(e),
        action: {
          label: "Type it in instead",
          onClick: () => { setParsed(null); setStage("form"); },
        },
      });
    } finally {
      setParsing(null);
    }
  }

  if (stage === "form") return <SpectrumEntryForm key={parsed ? fileName : "manual"} parsed={parsed} fileName={fileName} onBack={() => setStage("source")} />;

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList>
        <TabsTrigger value="existing"><Search className="h-4 w-4" aria-hidden />Existing entry</TabsTrigger>
        <TabsTrigger value="new"><UploadCloud className="h-4 w-4" aria-hidden />New from report or scratch</TabsTrigger>
      </TabsList>

      <TabsContent value="existing">
        <p className="mb-4 text-sm text-ink-muted">Pick a saved {labName} entry and only type the amounts.</p>
        <EntryPicker labKey="spectrum" labName={labName} />
      </TabsContent>

      <TabsContent value="new">
        {parsing ? (
          <Card><CardBody className="flex flex-col items-center py-14 text-center">
            <Loader2 className="size-10 animate-spin text-brand" aria-hidden />
            <h3 className="mt-4 text-xl font-semibold">Reading {parsing}</h3>
            <p className="mt-1 text-[15px] text-ink-muted">Nothing is stored. The report is read in memory.</p>
          </CardBody></Card>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-base font-semibold"><UploadCloud className="size-5 text-ink-muted" aria-hidden />Upload the {labName} report</h3>
              <PdfUploadZone allowed={cfg.upload_allowed} onFile={onFile} title="Upload the lab report" hint="The patient details are read from it so you only add the amounts." />
            </div>
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-base font-semibold"><PencilLine className="size-5 text-ink-muted" aria-hidden />No report?</h3>
              <button onClick={() => { setParsed(null); setStage("form"); }} className="flex min-h-72 w-full flex-col items-center justify-center rounded-card border border-line bg-white p-7 text-center shadow-card transition-all hover:-translate-y-0.5 hover:border-slate-nav/50">
                <span className="grid size-16 place-items-center rounded-2xl bg-brand-soft text-brand"><PencilLine className="size-8" aria-hidden /></span>
                <h3 className="mt-5 text-xl font-semibold">Start from scratch</h3>
                <p className="mt-1 max-w-xs text-[15px] text-ink-muted">Type the patient, the tests and the amounts. A saved entry with a bill number is created first.</p>
              </button>
            </div>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}

export function SpectrumStartView() {
  return (
    <>
      <PageHeader
        title="Spectrum bill"
        description="Pick a saved entry, read a report, or start from scratch. Bills are made on the spot and never stored."
        back={<Link href="/bill_generator" className={buttonStyles({ variant: "ghost", size: "sm" })}><ArrowLeft className="h-4 w-4" aria-hidden />All labs</Link>}
      />
      <LabGate labKey="spectrum" mode="generate">{(lab) => <Body labName={lab.name} />}</LabGate>
    </>
  );
}