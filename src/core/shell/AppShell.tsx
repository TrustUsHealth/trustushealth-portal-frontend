"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { LayoutDashboard, LogOut, Menu, Lock } from "lucide-react";
import { Logo } from "@/components/logo";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useAuth } from "@/core/auth/session";
import { moduleIcon } from "@/core/shell/icons";
import { useTiles } from "@/core/shell/tiles";
import { cn, initials } from "@/lib/utils";

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname();
  const { data: tiles } = useTiles();
  const items = [
    { href: "/dashboard", name: "Dashboard", icon: LayoutDashboard, locked: false, lockLabel: "" },
    ...(tiles ?? []).map((t) => ({ href: t.route, name: t.name, icon: moduleIcon(t.icon), locked: t.state !== "open", lockLabel: t.state === "pending" ? "Pending" : "Locked" })),
  ];
  return (
    <nav aria-label="Main" className="scroll-thin min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-2">
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
              "group relative flex h-11 items-center gap-3 rounded-ctl px-3 text-[15px] font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white",
              active && "bg-white/10 text-white before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-full before:bg-brand",
              i.locked && "text-white/50",
            )}
            title={i.locked ? (i.lockLabel === "Pending" ? "Access request pending" : "Request access from the dashboard") : undefined}
          >
            <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
            <span className="flex-1 truncate">{i.name}</span>
            {i.locked && <span className="flex items-center gap-1 text-xs text-white/60"><Lock className="h-3.5 w-3.5" aria-hidden />{i.lockLabel}</span>}
          </Link>
        );
      })}
    </nav>
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
    <div className="flex h-full flex-col text-white">
      <div className="flex items-center px-5 pb-5 pt-6">
        <Logo variant="full" className="h-full w-full object-contain" />
      </div>
      <NavLinks onNavigate={onNavigate} />
      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-3 rounded-ctl px-2 py-2">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand text-sm font-bold text-white" aria-hidden>{initials(user?.name, user?.email)}</span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[15px] font-semibold">{user?.name || user?.email}</p>
            <p className="truncate text-[13px] text-white/60">{user?.role ? `${user.role[0].toUpperCase()}${user.role.slice(1)}` : ""}</p>
          </div>
          <button onClick={signOut} aria-label="Sign out" title="Sign out" className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-white/75 hover:bg-white/10 hover:text-white">
            <LogOut className="h-5 w-5" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[17rem_1fr]">
      <aside className="sticky top-0 hidden h-dvh bg-slate-nav lg:block">{sidebar()}</aside>

      <div className="flex min-w-0 flex-col">
        <main id="main" className="paper flex-1 px-4 py-5 md:px-8 md:py-8">
          <div className="mx-auto w-full max-w-6xl">
            <div className="relative mb-3 flex h-11 items-center lg:hidden">
              <button className="grid h-11 w-11 place-items-center rounded-ctl text-ink-heading hover:bg-slate-nav/10" onClick={() => setDrawer(true)} aria-label="Open menu">
                <Menu className="h-5 w-5" aria-hidden />
              </button>
              <Logo variant="full" className="absolute left-1/2 h-9 -translate-x-1/2" />
            </div>
            {children}
          </div>
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
