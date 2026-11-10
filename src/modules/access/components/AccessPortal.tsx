"use client";

import { Layers, ShieldCheck, Users, Inbox } from "lucide-react";
import { PageHeader } from "@/components/ui/misc";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RoleGate } from "@/core/auth/AuthGuard";
import { useAdminModules, usePendingRequests } from "../api";
import { MatrixPanel } from "./MatrixPanel";
import { ModulesPanel } from "./ModulesPanel";
import { RequestsPanel } from "./RequestsPanel";
import { UsersPanel } from "./UsersPanel";

export function AccessPortal() {
  return (
    <RoleGate roles={["admin"]}>
      <Inner />
    </RoleGate>
  );
}

function Inner() {
  const { data: pending } = usePendingRequests();
  const { data: mods } = useAdminModules();
  const names = Object.fromEntries((mods ?? []).map((m) => [m.key, m.name]));
  const count = pending?.length ?? 0;

  return (
    <>
      <PageHeader title="Access Portal" description="Invite people, choose which modules staff can see, and approve who can open them." />
      <Tabs defaultValue={count ? "requests" : "matrix"}>
        <TabsList>
          <TabsTrigger value="requests">
            <Inbox className="h-4 w-4" aria-hidden />Requests
            {count > 0 && <span className="rounded-full bg-brand px-1.5 text-[11px] leading-5 text-white">{count}<span className="sr-only"> pending</span></span>}
          </TabsTrigger>
          <TabsTrigger value="matrix"><ShieldCheck className="h-4 w-4" aria-hidden />Matrix</TabsTrigger>
          <TabsTrigger value="modules"><Layers className="h-4 w-4" aria-hidden />Visibility</TabsTrigger>
          <TabsTrigger value="users"><Users className="h-4 w-4" aria-hidden />People</TabsTrigger>
        </TabsList>
        <TabsContent value="requests"><RequestsPanel moduleNames={names} /></TabsContent>
        <TabsContent value="matrix"><MatrixPanel /></TabsContent>
        <TabsContent value="modules"><ModulesPanel /></TabsContent>
        <TabsContent value="users"><UsersPanel /></TabsContent>
      </Tabs>
    </>
  );
}
