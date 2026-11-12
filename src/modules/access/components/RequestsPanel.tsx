"use client";

import { Check, Inbox, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState, Spinner } from "@/components/ui/misc";
import { errorMessage } from "@/core/api/client";
import { relativeTime } from "@/lib/format";
import { useApprove, useDeny, usePendingRequests } from "../api";

export function RequestsPanel({ moduleNames }: { moduleNames: Record<string, string> }) {
  const { data, isLoading, error } = usePendingRequests();
  const approve = useApprove();
  const deny = useDeny();

  const act = (kind: "approve" | "deny", id: string, who: string) =>
    (kind === "approve" ? approve : deny).mutate(id, {
      onSuccess: () => toast.success(kind === "approve" ? `Access granted to ${who}` : `Request from ${who} denied`),
      onError: (e) => toast.error(errorMessage(e)),
    });

  return (
    <Card>
      <CardHeader title="Pending requests" description="Staff asked for access to these. Approve to open the tile for them." />
      {isLoading ? (
        <Spinner />
      ) : error ? (
        <p className="p-5 text-sm text-danger">Could not load requests: {errorMessage(error)}</p>
      ) : !data?.length ? (
        <EmptyState icon={Inbox} title="No requests waiting">When staff tap Request Access on a locked tile, it shows up here.</EmptyState>
      ) : (
        <ul className="divide-y divide-line/70">
          {data.map((g) => {
            const who = g.user_email ?? g.user_id;
            const mod = moduleNames[g.module] ?? g.module;
            return (
              <li key={g.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between md:px-5">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink-heading">{who}</p>
                  <p className="text-sm text-ink-muted">
                    wants <span className="font-semibold text-ink">{mod}{g.submodule ? ` › ${g.submodule.replace(/_/g, " ")}` : ""}</span> · {relativeTime(g.requested_at)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="danger" size="sm" disabled={approve.isPending || deny.isPending} onClick={() => act("deny", g.id, who)}><X className="h-4 w-4" aria-hidden />Deny</Button>
                  <Button variant="primary" size="sm" disabled={approve.isPending || deny.isPending} onClick={() => act("approve", g.id, who)}><Check className="h-4 w-4" aria-hidden />Approve</Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
