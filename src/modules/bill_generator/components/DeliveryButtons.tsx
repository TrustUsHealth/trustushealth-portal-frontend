"use client";

import { Download, Eye, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Delivery } from "../types";

/** Preview, download or email. Email goes only to the signed-in user (the backend never takes a recipient). */
export function DeliveryButtons({
  busy, disabled, onRun, email,
}: { busy: Delivery | null; disabled?: boolean; onRun: (d: Delivery) => void; email?: string }) {
  const other = (d: Delivery) => disabled || (busy !== null && busy !== d);
  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button onClick={() => onRun("preview")} loading={busy === "preview"} disabled={other("preview")}><Eye className="h-4 w-4" aria-hidden />Preview</Button>
        <Button variant="primary" onClick={() => onRun("download")} loading={busy === "download"} disabled={other("download")}><Download className="h-4 w-4" aria-hidden />Download PDF</Button>
        <Button onClick={() => onRun("email")} loading={busy === "email"} disabled={other("email")}><Mail className="h-4 w-4" aria-hidden />Email to me</Button>
      </div>
      {email && <p className="mt-2 text-xs text-ink-muted">Email sends the bill only to you ({email}).</p>}
    </div>
  );
}