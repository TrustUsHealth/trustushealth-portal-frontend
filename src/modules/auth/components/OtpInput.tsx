"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/** Six single-digit boxes with paste, backspace and arrow-key support. Calls onComplete when all are filled. */
export function OtpInput({
  value, onChange, onComplete, disabled, invalid, length = 6,
}: { value: string; onChange: (v: string) => void; onComplete?: (v: string) => void; disabled?: boolean; invalid?: boolean; length?: number }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? "");

  useEffect(() => {
    refs.current[Math.min(value.length, length - 1)]?.focus();
  }, [value.length, length]);

  function set(next: string) {
    const clean = next.replace(/\D/g, "").slice(0, length);
    onChange(clean);
    if (clean.length === length) onComplete?.(clean);
  }

  return (
    <div className="flex justify-between gap-2" role="group" aria-label="6-digit login code">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          value={d}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          disabled={disabled}
          aria-label={`Digit ${i + 1}`}
          aria-invalid={invalid || undefined}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "");
            if (!v) return;
            set(value.slice(0, i) + v + value.slice(i + 1));
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace") {
              e.preventDefault();
              set(value.slice(0, d ? i : Math.max(0, i - 1)));
            } else if (e.key === "ArrowLeft") refs.current[Math.max(0, i - 1)]?.focus();
            else if (e.key === "ArrowRight") refs.current[Math.min(length - 1, i + 1)]?.focus();
          }}
          onPaste={(e) => {
            e.preventDefault();
            set(e.clipboardData.getData("text"));
          }}
          onFocus={(e) => e.target.select()}
          className={cn(
            "h-14 w-full min-w-0 rounded-ctl border bg-white text-center font-display text-2xl font-semibold text-ink-heading transition-colors focus:border-slate-nav",
            invalid ? "border-danger bg-danger-soft/50" : d ? "border-slate-nav/60" : "border-line",
          )}
        />
      ))}
    </div>
  );
}
