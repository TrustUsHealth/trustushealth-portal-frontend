"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * List-of-text input for tests. Enter or ";" adds a chip; commas are NOT separators because test names such as
 * "Creatinine, Serum" contain them. Pasting several lines adds one chip per line.
 */
export function TagInput({
  id, value, onChange, placeholder, invalid, disabled,
}: { id?: string; value: string[]; onChange: (v: string[]) => void; placeholder?: string; invalid?: boolean; disabled?: boolean }) {
  const [draft, setDraft] = useState("");

  const add = (raw: string) => {
    const parts = raw.split(/[;\n]/).map((s) => s.replace(/\s+/g, " ").trim()).filter(Boolean);
    if (!parts.length) return;
    const next = [...value];
    for (const p of parts) if (!next.some((x) => x.toLowerCase() === p.toLowerCase())) next.push(p);
    onChange(next);
    setDraft("");
  };

  return (
    <div className={cn("flex min-h-11 flex-wrap items-center gap-1.5 rounded-ctl border bg-white p-1.5 focus-within:border-slate-nav", invalid ? "border-danger bg-danger-soft/40" : "border-line hover:border-slate-nav/40")}>
      {value.map((t, i) => (
        <span key={t + i} className="inline-flex items-center gap-1 rounded-lg bg-slate-nav/10 py-1 pl-2.5 pr-1 text-[13px] font-medium text-ink-heading">
          {t}
          <button type="button" disabled={disabled} aria-label={`Remove ${t}`} onClick={() => onChange(value.filter((_, j) => j !== i))} className="grid h-6 w-6 place-items-center rounded-md text-ink-muted hover:bg-slate-nav/15">
            <X className="h-3.5 w-3.5" />
          </button>
        </span>
      ))}
      <input
        id={id}
        value={draft}
        disabled={disabled}
        placeholder={value.length ? "Add another test" : placeholder}
        onChange={(e) => (e.target.value.includes(";") ? add(e.target.value) : setDraft(e.target.value))}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); add(draft); }
          else if (e.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1));
        }}
        onBlur={() => add(draft)}
        onPaste={(e) => {
          const t = e.clipboardData.getData("text");
          if (/\n|;/.test(t)) { e.preventDefault(); add(t); }
        }}
        className="h-8 min-w-40 flex-1 bg-transparent px-1.5 text-sm outline-none placeholder:text-ink-muted/60"
      />
    </div>
  );
}
