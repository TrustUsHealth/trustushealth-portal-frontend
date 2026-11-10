"use client";

import Link from "next/link";
import { ArrowUpRight, FlaskConical, Layers, Lock, Hourglass } from "lucide-react";
import { toast } from "sonner";
import { PendingPill, Pill } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { errorMessage } from "@/core/api/client";
import type { ModuleAdminOut, TileOut } from "@/core/api/types";
import { moduleIcon } from "@/core/shell/icons";
import { cn } from "@/lib/utils";
import { MODULE_REGISTRY } from "@/modules/registry";
import { useRequestAccess, useSetVisibility } from "@/modules/access/api";

export function TileCard({ tile, admin, adminMeta }: { tile: TileOut; admin: boolean; adminMeta?: ModuleAdminOut }) {
  const Icon = moduleIcon(tile.icon);
  const meta = MODULE_REGISTRY[tile.key];
  const request = useRequestAccess();
  const setVis = useSetVisibility();
  const open = tile.state === "open";
  const planned = meta?.status === "planned";

  return (
    <article
      className={cn(
        "group relative flex min-h-48 flex-col rounded-card border p-4 shadow-card transition-all md:p-5",
        open ? "border-line/80 bg-white hover:-translate-y-0.5 hover:border-slate-nav/50" : "border-dashed border-line bg-white/60",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className={cn("grid h-12 w-12 place-items-center rounded-2xl", open ? "bg-slate-nav text-white" : "bg-line/50 text-ink-muted")}>
          <Icon className="h-6 w-6" aria-hidden />
        </span>
        {open ? (
          planned ? <Pill className="border-line bg-ivory text-ink-muted"><Hourglass className="h-3 w-3" aria-hidden />Build {meta?.build}</Pill>
                  : <ArrowUpRight className="h-5 w-5 text-ink-muted transition-colors group-hover:text-brand" aria-hidden />
        ) : tile.state === "pending" ? (
          <PendingPill />
        ) : (
          <Pill className="border-line bg-ivory text-ink-muted"><Lock className="h-3 w-3" aria-hidden />Locked</Pill>
        )}
      </div>

      <h3 className="mt-4 text-lg font-semibold">
        {open ? (
          <Link href={tile.route} className="after:absolute after:inset-0 after:rounded-card focus-visible:after:ring-2 focus-visible:after:ring-slate-nav">{tile.name}</Link>
        ) : (
          tile.name
        )}
      </h3>
      <p className="mt-1 text-sm leading-relaxed text-ink-muted">{meta?.description ?? ""}</p>

      {open && tile.submodules.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tile.submodules.slice(0, 5).map((s) => (
            <Pill key={s.key} className="border-line bg-ivory text-ink-muted">
              {s.kind === "lab" ? <FlaskConical className="h-3 w-3" aria-hidden /> : <Layers className="h-3 w-3" aria-hidden />}
              {s.name}
            </Pill>
          ))}
        </div>
      )}

      <div className="mt-auto flex items-center justify-between gap-3 pt-4">
        {tile.state === "locked" && (
          <Button
            variant="primary"
            size="sm"
            loading={request.isPending}
            onClick={() =>
              request.mutate({ module: tile.key }, {
                onSuccess: () => toast.success(`Access to ${tile.name} requested. An admin will review it.`),
                onError: (e) => toast.error(errorMessage(e)),
              })
            }
          >
            Request access
          </Button>
        )}
        {admin && adminMeta?.staff_eligible && (
          <label className="relative z-10 ml-auto flex items-center gap-2 text-xs font-semibold text-ink">
            Visible to staff
            <Switch
              label={`Visible to staff: ${tile.name}`}
              checked={adminMeta.visible_to_staff}
              disabled={setVis.isPending}
              onCheckedChange={(v) =>
                setVis.mutate({ key: tile.key, visible: v }, {
                  onSuccess: () => toast.success(`${tile.name} is now ${v ? "visible to" : "hidden from"} staff`),
                  onError: (e) => toast.error(errorMessage(e)),
                })
              }
            />
          </label>
        )}
      </div>
    </article>
  );
}
