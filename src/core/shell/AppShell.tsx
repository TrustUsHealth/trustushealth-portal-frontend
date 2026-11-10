"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Hash, LayoutDashboard, LogOut, Menu, Lock, Search } from "lucide-react";
import { Logo } from "@/components/logo";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { RolePill } from "@/components/ui/badge";
import { useAuth } from "@/core/auth/session";
import { moduleIcon } from "@/core/shell/icons";
import { useTiles } from "@/core/shell/tiles";
import { cn, initials } from "@/lib/utils";

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname();
  const { data: tiles } = useTiles();
  const items = [
    { href: "/dashboard", name: "Dashboard", icon: LayoutDashboard, locked: false },
    ...(tiles ?? []).map((t) => ({ href: t.route, name: t.name, icon: moduleIcon(t.icon), locked: t.state !== "open" })),
  ];
  return (
    <nav aria-label="Main" className="flex flex-col gap-1">
      {items.map((i) => {
        const active = path === i.href || (i.href !== "/dashboard" && path.startsWith(i.href + "/"));
        const Icon = i.icon;
        return (
          <Link
            key={i.href}
            href={i.locked ? "/dashboard" : i.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex h-11 items-center gap-3 rounded-ctl px-3 text-sm font-semibold transition-colors",
              active ? "bg-white text-slate-nav shadow-sm" : "text-white/80 hover:bg-white/10 hover:text-white",
              i.locked && "opacity-60",
            )}
          >
            {active && <span className="absolute -left-3 top-2 h-7 w-1 rounded-full bg-brand" aria-hidden />}
            <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
            <span className="flex-1 truncate">{i.name}</span>
            {i.locked && <Lock className="h-3.5 w-3.5" aria-label="Locked" />}
          </Link>
        );
      })}
    </nav>
  );
}

function BillJump() {
  const router = useRouter();
  const { data: tiles } = useTiles();
  const [v, setV] = useState("");
  if (!tiles?.some((t) => t.key === "patient_registry" && t.state === "open")) return null;
  return (
    <form
      role="search"
      className="relative hidden md:block"
      onSubmit={(e) => {
        e.preventDefault();
        const digits = v.replace(/\D/g, "");
        if (!digits) return;
        router.push(`/patient_registry?bill_no=${digits.padStart(6, "0")}`);
        setV("");
      }}
    >
      <Hash className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden />
      <input
        value={v}
        onChange={(e) => setV(e.target.value)}
        inputMode="numeric"
        placeholder="Jump to bill no."
        aria-label="Jump to bill number"
        className="h-10 w-48 rounded-ctl border border-line bg-white pl-9 pr-3 text-sm placeholder:text-ink-muted/60 focus:w-60 focus:border-slate-nav transition-[width]"
      />
    </form>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [drawer, setDrawer] = useState(false);
  const drawerTouchStart = useRef<{ x: number; y: number } | null>(null);
  const drawerSwiped = useRef(false);

  async function signOut() {
    await logout();
    toast.success("Signed out");
    router.replace("/login");
  }

  const sidebar = (onNavigate?: () => void) => (
    <div className="flex h-full flex-col gap-6 px-4 py-5">
      <div className="flex justify-center rounded-ctl bg-white px-2 py-1">
        <Logo variant="full" className="h-30 w-full object-cover object-center" />
      </div>
      <div className="flex-1 overflow-y-auto pl-3"><NavLinks onNavigate={onNavigate} /></div>
      <div className="rounded-ctl bg-white/10 p-3 text-white">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-soft text-sm font-bold text-ink-heading">{initials(user?.name, user?.email)}</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{user?.name || user?.email}</p>
            <p className="truncate text-xs text-white/70">{user?.name ? user.email : ""}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          {user && <RolePill role={user.role} />}
          <button onClick={signOut} className="inline-flex h-9 items-center gap-1.5 rounded-ctl px-2.5 text-xs font-semibold text-white/85 hover:bg-white/10">
            <LogOut className="h-3.5 w-3.5" aria-hidden /> Sign out
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[17rem_1fr]">
      <aside className="sticky top-0 hidden h-dvh bg-slate-nav md:block">{sidebar()}</aside>

      <div className="flex min-w-0 flex-col">
        <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line/80 bg-ivory/90 px-4 backdrop-blur md:h-16 md:px-8">
          <button className="grid h-11 w-11 place-items-center rounded-ctl text-ink-heading hover:bg-slate-nav/10 md:hidden" onClick={() => setDrawer(true)} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
          <Logo variant="full" className="absolute left-1/2 h-9 -translate-x-1/2 md:hidden" />
          <div className="flex-1" />
          <BillJump />
          <button onClick={() => router.push("/patient_registry")} className="grid h-11 w-11 place-items-center rounded-ctl text-ink-muted hover:bg-slate-nav/10 md:hidden" aria-label="Search entries">
            <Search className="h-5 w-5" />
          </button>
        </div>
        <main id="main" className="paper flex-1 px-4 py-5 md:px-8 md:py-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>

      <Dialog open={drawer} onOpenChange={setDrawer}>
        <DialogContent title="Menu" side="left" hideTitle className="bg-slate-nav">
          <div
            className="h-full"
            onTouchStart={(event) => {
              const touch = event.touches[0];
              drawerTouchStart.current = { x: touch.clientX, y: touch.clientY };
            }}
            onTouchEnd={(event) => {
              const start = drawerTouchStart.current;
              drawerTouchStart.current = null;
              if (!start) return;
              const touch = event.changedTouches[0];
              const deltaX = touch.clientX - start.x;
              const deltaY = touch.clientY - start.y;
              if (deltaX < -80 && Math.abs(deltaX) > Math.abs(deltaY)) {
                drawerSwiped.current = true;
                setDrawer(false);
              }
            }}
            onClickCapture={(event) => {
              if (!drawerSwiped.current) return;
              event.preventDefault();
              event.stopPropagation();
              drawerSwiped.current = false;
            }}
          >
            {sidebar(() => setDrawer(false))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
