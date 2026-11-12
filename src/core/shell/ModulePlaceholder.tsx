"use client";

import Link from "next/link";
import { ArrowLeft, Hourglass } from "lucide-react";
import { buttonStyles } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { MODULE_REGISTRY } from "@/modules/registry";
import { moduleIcon } from "@/core/shell/icons";
import { useTile } from "@/core/shell/tiles";

export function ModulePlaceholder({ moduleKey }: { moduleKey: string }) {
  const meta = MODULE_REGISTRY[moduleKey];
  const { tile } = useTile(moduleKey);
  const Icon = moduleIcon(tile?.icon);
  return (
    <>
      <PageHeader
        title={tile?.name ?? moduleKey.replace(/_/g, " ")}
        description={meta.description}
        back={<Link href="/dashboard" className={buttonStyles({ variant: "ghost", size: "sm" })}><ArrowLeft className="h-4 w-4" aria-hidden />Dashboard</Link>}
      />
      <Card>
        <CardBody className="flex flex-col items-start gap-5 md:flex-row md:items-center md:p-8">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-slate-nav text-white"><Icon className="h-8 w-8" aria-hidden /></span>
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-warn"><Hourglass className="h-4 w-4" aria-hidden />Arrives in build {meta.build}</p>
            <p className="mt-1 text-sm text-ink-muted">The backend for this module is not ready yet. This screen will light up as soon as its API ships, with no change to how you sign in or get access.</p>
            {meta.planned && (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink">{meta.planned.map((p) => <li key={p}>{p}</li>)}</ul>
            )}
          </div>
        </CardBody>
      </Card>
    </>
  );
}
