import { CheckCircle2, CircleDashed, Clock, Lock, ShieldCheck, UserRound, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EntryStatus, Role } from "@/core/api/types";

export function Pill({ className, children }: { className?: string; children: React.ReactNode }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold", className)}>{children}</span>;
}

export function StatusPill({ status }: { status: EntryStatus }) {
  return status === "complete" ? (
    <Pill className="border-ok/25 bg-ok-soft text-ok"><CheckCircle2 className="h-3 w-3" aria-hidden />Complete</Pill>
  ) : (
    <Pill className="border-warn/30 bg-warn-soft text-warn"><CircleDashed className="h-3 w-3" aria-hidden />Draft</Pill>
  );
}

const roleIcon = { admin: ShieldCheck, staff: UserRound, engineer: Wrench, customer: UserRound } as const;
export function RolePill({ role }: { role: Role }) {
  const Icon = roleIcon[role];
  return (
    <Pill className="border-slate-nav/20 bg-slate-nav/10 text-slate-nav">
      <Icon className="h-3 w-3" aria-hidden />
      {role[0].toUpperCase() + role.slice(1)}
    </Pill>
  );
}

export function ActivePill({ active }: { active: boolean }) {
  return active ? (
    <Pill className="border-ok/25 bg-ok-soft text-ok"><CheckCircle2 className="h-3 w-3" aria-hidden />Active</Pill>
  ) : (
    <Pill className="border-line bg-ivory text-ink-muted"><Lock className="h-3 w-3" aria-hidden />Deactivated</Pill>
  );
}

export function PendingPill() {
  return <Pill className="border-warn/30 bg-warn-soft text-warn"><Clock className="h-3 w-3" aria-hidden />Request pending</Pill>;
}
