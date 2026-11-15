"use client";

import { useRef, useState } from "react";
import { FileUp, UploadCloud } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useAppConfig } from "@/core/config/provider";
import { cn } from "@/lib/utils";

/** Drag-and-drop / picker with the same client-side checks as the registry upload (type and size from /config/app). */
export function PdfUploadZone({
  allowed, onFile, disabled, title, hint,
}: { allowed: string[]; onFile: (f: File) => void; disabled?: boolean; title: string; hint?: string }) {
  const cfg = useAppConfig();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const accept = allowed.map((e) => `.${e}`).join(",");
  const label = allowed.map((e) => e.toUpperCase()).join(" or ");

  function take(f?: File) {
    if (!f) return;
    const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
    if (!allowed.includes(ext)) return setErr(`Only ${label} files can be used here. This one is .${ext || "unknown"}.`);
    if (f.size > cfg.upload_max_mb * 1024 * 1024) return setErr(`This file is ${(f.size / 1048576).toFixed(1)} MB. The limit is ${cfg.upload_max_mb} MB.`);
    setErr(null);
    onFile(f);
  }

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); if (!disabled) take(e.dataTransfer.files[0]); }}
        className={cn("flex min-h-72 flex-col items-center justify-center rounded-card border-2 border-dashed bg-white p-8 text-center transition-colors", over ? "border-brand bg-brand-soft/30" : "border-line")}
      >
        <span className="grid size-16 place-items-center rounded-2xl bg-slate-nav text-white"><UploadCloud className="size-8" aria-hidden /></span>
        <h3 className="mt-5 text-xl font-semibold">{title}</h3>
        <p className="mt-1 max-w-sm text-[15px] text-ink-muted">{hint ?? `Drop a ${label} here, or pick one from your phone or computer.`} Up to {cfg.upload_max_mb} MB.</p>
        <Button variant="primary" size="lg" className="mt-5" disabled={disabled} onClick={() => input.current?.click()}><FileUp className="size-5" aria-hidden />Choose file</Button>
        <input ref={input} type="file" accept={accept} className="sr-only" tabIndex={-1} onChange={(e) => { take(e.target.files?.[0]); e.target.value = ""; }} />
      </div>
      {err && <Alert kind="error" title="That file cannot be used" className="mt-3">{err}</Alert>}
    </div>
  );
}