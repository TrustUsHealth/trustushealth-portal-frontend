"use client";

import { useState } from "react";
import { Download, Expand, FileSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * Shows the PDF the backend just rendered. The bill is never stored, so this works from an in-memory blob URL
 * owned by the parent (which revokes it).
 */
export function BillPreview({
  url, stale, loading, onDownload, className,
}: { url: string | null; stale?: boolean; loading?: boolean; onDownload?: () => void; className?: string }) {
  const [full, setFull] = useState(false);
  const frame = (h: string) =>
    url ? <iframe src={`${url}#toolbar=0&navpanes=0`} title="Bill preview" className={cn("w-full rounded-ctl border border-line bg-white", h)} /> : null;

  return (
    <div className={className}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Bill preview</h3>
        <div className="flex gap-1">
          {url && <Button size="sm" variant="ghost" onClick={() => setFull(true)} aria-label="Full screen"><Expand className="h-4 w-4" aria-hidden /><span className="hidden sm:inline">Full screen</span></Button>}
          {url && onDownload && <Button size="sm" variant="ghost" onClick={onDownload}><Download className="h-4 w-4" aria-hidden /><span className="hidden sm:inline">Download</span></Button>}
        </div>
      </div>
      {stale && url && (
        <p className="mb-2 rounded-ctl border border-warn/30 bg-warn-soft px-3 py-2 text-xs font-semibold text-warn">
          You changed something after this preview. Press Preview again to refresh it.
        </p>
      )}
      {url ? (
        frame("h-[28rem] lg:h-[calc(100dvh-14rem)]")
      ) : (
        <div className="grid h-72 place-items-center rounded-ctl border border-dashed border-line bg-white px-6 text-center text-sm text-ink-muted">
          <div>
            <FileSearch className="mx-auto mb-2 h-6 w-6" aria-hidden />
            {loading ? "Making the bill…" : "Press Preview to see the bill here. Nothing is stored: the PDF is made on the spot."}
          </div>
        </div>
      )}
      <Dialog open={full} onOpenChange={setFull}>
        <DialogContent title="Bill preview" className="!inset-0 !left-0 !top-0 !h-dvh !max-h-dvh !w-screen !translate-x-0 !translate-y-0 !rounded-none">
          <div className="min-h-0 flex-1 p-2">{frame("h-full")}</div>
        </DialogContent>
      </Dialog>
    </div>
  );
}