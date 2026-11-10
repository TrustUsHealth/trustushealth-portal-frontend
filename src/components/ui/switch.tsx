"use client";

import * as S from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

export function Switch({ className, label, ...p }: S.SwitchProps & { label: string }) {
  return (
    <S.Root
      aria-label={label}
      className={cn("relative h-6 w-11 shrink-0 rounded-full border border-line bg-line/60 transition-colors data-[state=checked]:border-slate-nav data-[state=checked]:bg-slate-nav disabled:opacity-50", className)}
      {...p}
    >
      <S.Thumb className="block h-[18px] w-[18px] translate-x-[3px] rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-[22px]" />
    </S.Root>
  );
}
