import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const Skeleton = ({ className }: { className?: string }) => <div className={cn("skeleton h-4 w-full", className)} aria-hidden />;

export function Spinner({ label = "Loading", className }: { label?: string; className?: string }) {
  return (
    <div role="status" className={cn("flex items-center justify-center gap-2 py-10 text-sm text-ink-muted", className)}>
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> {label}…
    </div>
  );
}

export function EmptyState({
  icon: Icon, title, children, action, className,
}: { icon: React.ComponentType<{ className?: string }>; title: string; children?: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-12 text-center", className)}>
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-soft/60 text-brand"><Icon className="h-6 w-6" /></div>
      <h3 className="mt-4 text-base font-semibold">{title}</h3>
      {children && <p className="mt-1 max-w-sm text-sm text-ink-muted">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function PageHeader({ title, description, actions, back }: { title: string; description?: React.ReactNode; actions?: React.ReactNode; back?: React.ReactNode }) {
  return (
    <header className="mb-5 md:mb-7">
      {back && <div className="mb-2">{back}</div>}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold md:text-[28px]">{title}</h1>
          {description && <p className="mt-1 max-w-2xl text-sm text-ink-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

export function Pagination({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const btn = "h-10 rounded-ctl border border-line bg-white px-3 text-sm font-semibold hover:bg-ivory disabled:opacity-40";
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-3 px-1 pt-4 text-sm text-ink-muted">
      <span>{from}–{to} of {total}</span>
      <div className="flex items-center gap-2">
        <button className={btn} disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button>
        <span className="px-1 tabular-nums">{page} / {pages}</span>
        <button className={btn} disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</button>
      </div>
    </nav>
  );
}
