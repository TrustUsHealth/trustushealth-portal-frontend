"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileSpreadsheet, Users, ClipboardList, RefreshCw } from "lucide-react";
import { useAuth } from "@/core/auth/session";
import { useTile } from "@/core/shell/tiles";
import { cn } from "@/lib/utils";

/** Submodule tabs. Excel Register only shows when the server lists it for this user; Lab sync is for admins. */
export function RegistryNav() {
  const path = usePathname();
  const { isAdmin } = useAuth();
  const { tile } = useTile("patient_registry");
  const items = [
    { href: "/patient_registry", label: "Entries", icon: ClipboardList, show: true, exact: false },
    { href: "/patient_registry/customers", label: "Patients", icon: Users, show: true, exact: false },
    { href: "/patient_registry/excel_register", label: "Excel register", icon: FileSpreadsheet, show: !!tile?.submodules.some((s) => s.key === "excel_register") || tile === undefined, exact: false },
    { href: "/patient_registry/lab_sync", label: "Lab sync", icon: RefreshCw, show: isAdmin, exact: false },
  ].filter((i) => i.show);
  const other = ["customers", "excel_register", "lab_sync"];
  const active = (h: string) => (h === "/patient_registry" ? path === h || path.startsWith("/patient_registry/new") || /^\/patient_registry\/[^/]+$/.test(path) && !other.some((s) => path.endsWith(s)) : path.startsWith(h));
  return (
    <nav aria-label="Patient registry sections" className="scroll-x mb-5 flex gap-1 border-b border-line">
      {items.map((i) => {
        const on = active(i.href);
        return (
          <Link key={i.href} href={i.href} aria-current={on ? "page" : undefined}
            className={cn("-mb-px inline-flex h-11 shrink-0 items-center gap-2 border-b-2 px-3.5 text-sm font-semibold transition-colors", on ? "border-brand text-ink-heading" : "border-transparent text-ink-muted hover:text-ink-heading")}>
            <i.icon className="h-4 w-4" aria-hidden />{i.label}
          </Link>
        );
      })}
    </nav>
  );
}