"use client";

import * as D from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

export function DialogContent({
  title, description, children, className, side = "center", hideTitle,
}: {
  title: string; description?: string; children: React.ReactNode; className?: string;
  side?: "center" | "left"; hideTitle?: boolean;
}) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-ink-heading/45 backdrop-blur-[2px] animate-fade-in" />
      <D.Content
        className={cn(
          cn("fixed z-50 flex flex-col bg-white shadow-pop focus:outline-none", side === "center" && "max-h-[92dvh]"),
          side === "center"
            ? "inset-x-0 bottom-0 rounded-t-card border border-line animate-pop-in md:inset-auto md:left-1/2 md:top-1/2 md:w-[min(92vw,34rem)] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-card"
            : "inset-y-0 left-0 h-dvh w-[min(78vw,18rem)] animate-sheet-in",
          className,
        )}
      >
        <div className={cn("flex items-start justify-between gap-3", hideTitle ? "sr-only" : "border-b border-line/70 px-5 py-4")}>
          <div>
            <D.Title className="font-display text-lg font-semibold text-ink-heading">{title}</D.Title>
            {description ? <D.Description className="mt-0.5 text-sm text-ink-muted">{description}</D.Description> : <D.Description className="sr-only">{title}</D.Description>}
          </div>
          {!hideTitle && (
            <D.Close className="-mr-1 grid h-9 w-9 place-items-center rounded-ctl text-ink-muted hover:bg-slate-nav/10" aria-label="Close">
              <X className="h-4 w-4" />
            </D.Close>
          )}
        </div>
        {children}
      </D.Content>
    </D.Portal>
  );
}

export const DialogBody = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => <div className={cn("overflow-y-auto px-5 py-4", className)} {...p} />;
export const DialogFooter = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col-reverse gap-2 border-t border-line/70 px-5 py-3.5 sm:flex-row sm:justify-end", className)} {...p} />
);
