"use client";

import { FlaskConical, Layers } from "lucide-react";
import { toast } from "sonner";
import { Card, CardHeader } from "@/components/ui/card";
import { Pill } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/misc";
import { Switch } from "@/components/ui/switch";
import { errorMessage } from "@/core/api/client";
import { moduleIcon } from "@/core/shell/icons";
import { useAdminModules, useSetVisibility } from "../api";

export function ModulesPanel() {
  const { data, isLoading, error } = useAdminModules();
  const setVis = useSetVisibility();

  return (
    <Card>
      <CardHeader title="Module visibility" description="Off hides the tile from staff completely. On shows it locked until you grant access." />
      {isLoading ? (
        <Spinner />
      ) : error ? (
        <p className="p-5 text-sm text-danger">{errorMessage(error)}</p>
      ) : (
        <ul className="divide-y divide-line/70">
          {data?.map((m) => {
            const Icon = moduleIcon(m.icon);
            return (
              <li key={m.key} className="flex items-start gap-3 px-4 py-4 md:px-5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-nav/10 text-slate-nav"><Icon className="h-5 w-5" aria-hidden /></span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink-heading">{m.name}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {m.submodules.map((s) => (
                      <Pill key={s.key} className="border-line bg-ivory text-ink-muted">
                        {s.kind === "lab" ? <FlaskConical className="h-3 w-3" aria-hidden /> : <Layers className="h-3 w-3" aria-hidden />}
                        {s.name}
                      </Pill>
                    ))}
                  </div>
                </div>
                {m.staff_eligible ? (
                  <label className="flex shrink-0 items-center gap-2 text-sm font-semibold text-ink">
                    <span className="hidden sm:inline">{m.visible_to_staff ? "Visible to staff" : "Hidden from staff"}</span>
                    <Switch
                      label={`Visible to staff: ${m.name}`}
                      checked={m.visible_to_staff}
                      disabled={setVis.isPending}
                      onCheckedChange={(v) =>
                        setVis.mutate({ key: m.key, visible: v }, {
                          onSuccess: () => toast.success(`${m.name} is now ${v ? "visible to" : "hidden from"} staff`),
                          onError: (e) => toast.error(errorMessage(e)),
                        })
                      }
                    />
                  </label>
                ) : (
                  <Pill className="shrink-0 border-line bg-ivory text-ink-muted">Admin only</Pill>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
