"use client";

import * as T from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

export const Tabs = T.Root;
export const TabsContent = ({ className, ...p }: T.TabsContentProps) => <T.Content className={cn("mt-4 focus-visible:ring-0", className)} {...p} />;
export const TabsList = ({ className, ...p }: T.TabsListProps) => (
  <T.List className={cn("scroll-x flex gap-1 rounded-ctl border border-line bg-white p-1", className)} {...p} />
);
export const TabsTrigger = ({ className, ...p }: T.TabsTriggerProps) => (
  <T.Trigger
    className={cn("inline-flex h-10 shrink-0 items-center gap-2 rounded-lg px-3.5 text-sm font-semibold text-ink-muted transition-colors hover:text-ink-heading data-[state=active]:bg-slate-nav data-[state=active]:text-white md:h-9", className)}
    {...p}
  />
);
