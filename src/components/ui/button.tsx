import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** TrustUs red is reserved for primary actions (PRD 13). Destructive uses a wine tone plus an icon. */
const button = cva(
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-ctl text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-brand text-white shadow-sm hover:bg-brand-dark active:bg-brand-dark",
        secondary: "border border-line bg-white text-ink-heading hover:border-slate-nav/50 hover:bg-ivory",
        slate: "bg-slate-nav text-white hover:bg-slate-nav-dark",
        ghost: "text-ink hover:bg-slate-nav/10",
        danger: "border border-danger/30 bg-danger-soft text-danger hover:bg-danger/10",
        link: "h-auto min-h-0 p-0 text-slate-nav underline-offset-4 hover:underline",
      },
      size: {
        md: "h-11 px-4 md:h-10",
        sm: "h-10 px-3 text-[13px] md:h-8",
        lg: "h-12 px-6 text-[15px]",
        icon: "h-11 w-11 md:h-9 md:w-9",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof button> {
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, loading, disabled, children, type = "button", ...props },
  ref,
) {
  return (
    <button ref={ref} type={type} disabled={disabled || loading} className={cn(button({ variant, size }), className)} {...props}>
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});

export { button as buttonStyles };
