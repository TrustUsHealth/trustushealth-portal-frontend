"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "./button";
import { Dialog, DialogBody, DialogContent, DialogFooter } from "./dialog";

export function ConfirmDialog({
  open, onOpenChange, title, description, confirmLabel, onConfirm, loading, destructive,
}: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string; description: React.ReactNode;
  confirmLabel: string; onConfirm: () => void; loading?: boolean; destructive?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={title}>
        <DialogBody>
          <div className="flex gap-3 text-sm">
            {destructive && <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger" aria-hidden />}
            <div className="text-ink">{description}</div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant={destructive ? "danger" : "primary"} loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
