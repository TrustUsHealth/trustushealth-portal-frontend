import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const tone = {
  info: { icon: Info, label: "Note", box: "border-info/25 bg-info-soft text-info" },
  success: { icon: CheckCircle2, label: "Done", box: "border-ok/25 bg-ok-soft text-ok" },
  warning: { icon: AlertTriangle, label: "Check this", box: "border-warn/30 bg-warn-soft text-warn" },
  error: { icon: XCircle, label: "Problem", box: "border-danger/25 bg-danger-soft text-danger" },
} as const;

/** Icon + text label always shown: status is never conveyed by colour alone. */
export function Alert({
  kind = "info", title, children, className, action,
}: { kind?: keyof typeof tone; title?: string; children?: React.ReactNode; className?: string; action?: React.ReactNode }) {
  const t = tone[kind];
  const Icon = t.icon;
  return (
    <div role={kind === "error" ? "alert" : "status"} className={cn("flex gap-3 rounded-ctl border px-3.5 py-3 text-sm", t.box, className)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1 text-ink">
        <p className="font-semibold" style={{ color: "inherit" }}>{title ?? t.label}</p>
        {children && <div className="mt-0.5 text-[13px] leading-relaxed">{children}</div>}
      </div>
      {action}
    </div>
  );
}
