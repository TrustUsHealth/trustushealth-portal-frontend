import * as React from "react";
import { cn } from "@/lib/utils";

const base =
  "w-full rounded-ctl border border-line bg-white px-3 text-sm text-ink-heading placeholder:text-ink-muted/60 transition-colors hover:border-slate-nav/40 focus:border-slate-nav disabled:cursor-not-allowed disabled:bg-ivory disabled:text-ink-muted";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  function Input({ className, invalid, ...p }, ref) {
    return <input ref={ref} aria-invalid={invalid || undefined} className={cn(base, "h-11 md:h-10", invalid && "border-danger bg-danger-soft/40", className)} {...p} />;
  },
);

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, ...p },
  ref,
) {
  return <textarea ref={ref} className={cn(base, "min-h-24 py-2", className)} {...p} />;
});

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }>(
  function Select({ className, invalid, children, ...p }, ref) {
    return (
      <select ref={ref} aria-invalid={invalid || undefined} className={cn(base, "h-11 appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22 fill=%22none%22 stroke=%22%23525656%22 stroke-width=%222%22 viewBox=%220 0 24 24%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[length:16px] bg-[right_0.65rem_center] bg-no-repeat pr-9 md:h-10", invalid && "border-danger", className)} {...p}>
        {children}
      </select>
    );
  },
);

export function Label({ className, ...p }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-1.5 block text-[13px] font-semibold text-ink-heading", className)} {...p} />;
}

/** Label + control + hint/error. Errors carry an icon-free text line AND a red-tint control (never colour alone). */
export function Field({
  label, htmlFor, hint, error, required, adornment, children, className,
}: {
  label: string; htmlFor?: string; hint?: string; error?: string; required?: boolean;
  adornment?: React.ReactNode; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <label htmlFor={htmlFor} className="flex items-center gap-1.5 text-[13px] font-semibold text-ink-heading">
          {label}
          {required && <span className="text-ink-muted" title="Required">*</span>}
          {adornment}
        </label>
      </div>
      {children}
      {error ? (
        <p role="alert" className="mt-1.5 text-xs font-medium text-danger">Fix this: {error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-ink-muted">{hint}</p>
      ) : null}
    </div>
  );
}
