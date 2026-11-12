"use client";

import { useEffect, useState } from "react";
import { Download, Expand, FileWarning, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { downloadFile, errorMessage, fetchBlob } from "@/core/api/client";
import { toast } from "sonner";

/**
 * Authenticated PDF preview. The file endpoint needs the bearer token, so we fetch a blob and show it from an
 * object URL (an <iframe src> could not send the header). Full-screen on mobile via the Expand button.
 */
export function PdfPreview({ path, title = "Report preview", className }: { path: string; title?: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [kind, setKind] = useState<"pdf" | "other" | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [full, setFull] = useState(false);

  useEffect(() => {
    let revoke: string | null = null;
    let live = true;
    setUrl(null);
    setErr(null);
    fetchBlob(path, undefined, "report")
      .then(({ blob, type }) => {
        if (!live) return;
        revoke = URL.createObjectURL(blob);
        setKind(type.includes("pdf") ? "pdf" : "other");
        setUrl(revoke);
      })
      .catch((e) => live && setErr(errorMessage(e)));
    return () => {
      live = false;
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [path]);

  const frame = (h: string) =>
    url && kind === "pdf" ? (
      <iframe src={`${url}#toolbar=0&navpanes=0`} title={title} className={`w-full rounded-ctl border border-line bg-white ${h}`} />
    ) : null;

  return (
    <div className={className}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        <div className="flex gap-1">
          {kind === "pdf" && (
            <Button size="sm" variant="ghost" onClick={() => setFull(true)} aria-label="Full screen"><Expand className="h-4 w-4" /><span className="hidden sm:inline">Full screen</span></Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            disabled={!url}
            onClick={() => downloadFile(path, { download: true }, "report").catch((e) => toast.error(errorMessage(e)))}
          >
            <Download className="h-4 w-4" /><span className="hidden sm:inline">Download</span>
          </Button>
        </div>
      </div>

      {err ? (
        <div className="grid h-72 place-items-center rounded-ctl border border-dashed border-line bg-white text-center text-sm text-ink-muted">
          <div><FileWarning className="mx-auto mb-2 h-6 w-6 text-warn" aria-hidden />{err}</div>
        </div>
      ) : !url ? (
        <div className="grid h-72 place-items-center rounded-ctl border border-line bg-white text-sm text-ink-muted"><Loader2 className="h-5 w-5 animate-spin" aria-label="Loading preview" /></div>
      ) : kind === "pdf" ? (
        frame("h-[28rem] lg:h-[calc(100dvh-14rem)]")
      ) : (
        <div className="grid h-40 place-items-center rounded-ctl border border-dashed border-line bg-white px-4 text-center text-sm text-ink-muted">
          Word documents cannot be previewed in the browser. Use Download to open it.
        </div>
      )}

      <Dialog open={full} onOpenChange={setFull}>
        <DialogContent title={title} className="!inset-0 !left-0 !top-0 !h-dvh !max-h-dvh !w-screen !translate-x-0 !translate-y-0 !rounded-none">
          <div className="min-h-0 flex-1 p-2">{frame("h-full")}</div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
