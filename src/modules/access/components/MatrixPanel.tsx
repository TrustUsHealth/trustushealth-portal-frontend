"use client";

import { useMemo, useState } from "react";
import { Check, Clock, Plus } from "lucide-react";
import { toast } from "sonner";
import { RolePill } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Spinner } from "@/components/ui/misc";
import { errorMessage } from "@/core/api/client";
import type { GrantOut, MatrixColumn, UserAdminOut } from "@/core/api/types";
import { cn } from "@/lib/utils";
import { useApprove, useMatrix, usePreGrant, useRevoke } from "../api";

/** Staff-by-module matrix (PRD 7). Click a cell: grant, approve a pending request, or revoke. */
export function MatrixPanel() {
  const { data, isLoading, error } = useMatrix();
  const preGrant = usePreGrant();
  const approve = useApprove();
  const revoke = useRevoke();
  const [revoking, setRevoking] = useState<{ grant: GrantOut; user: UserAdminOut; col: MatrixColumn } | null>(null);

  const groups = useMemo(() => {
    const g: { module: string; name: string; span: number }[] = [];
    for (const c of data?.columns ?? []) {
      const last = g[g.length - 1];
      if (last && last.module === c.module) last.span++;
      else g.push({ module: c.module, name: c.module_name, span: 1 });
    }
    return g;
  }, [data]);

  if (isLoading) return <Card><Spinner /></Card>;
  if (error || !data) return <Card><p className="p-5 text-sm text-danger">{errorMessage(error)}</p></Card>;

  const find = (grants: GrantOut[], c: MatrixColumn) => grants.find((g) => g.module === c.module && (g.submodule ?? null) === (c.submodule ?? null));
  const busy = preGrant.isPending || approve.isPending || revoke.isPending;
  const fail = (e: unknown) => toast.error(errorMessage(e));

  function click(u: UserAdminOut, c: MatrixColumn, g?: GrantOut) {
    if (!g) preGrant.mutate({ user_id: u.id, module: c.module, submodule: c.submodule }, { onSuccess: () => toast.success(`${c.label} granted to ${u.name || u.email}`), onError: fail });
    else if (g.status === "requested") approve.mutate(g.id, { onSuccess: () => toast.success("Request approved"), onError: fail });
    else setRevoking({ grant: g, user: u, col: c });
  }

  const staffRows = data.rows.filter((r) => r.user.role !== "customer");

  return (
    <Card>
      <CardHeader title="Access matrix" description="Who can open what. Granting a module opens all its labs unless you grant labs one by one." />
      <div className="scroll-x">
        <table className="w-full min-w-max border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th rowSpan={2} className="sticky left-0 z-10 min-w-48 border-b border-r border-line bg-white px-4 py-3 text-left font-semibold">Person</th>
              {groups.map((g) => (
                <th key={g.module} colSpan={g.span} className="border-b border-l border-line bg-ivory px-3 py-2 text-left text-[13px] font-semibold text-ink-heading">{g.name}</th>
              ))}
            </tr>
            <tr>
              {data.columns.map((c) => (
                <th key={`${c.module}:${c.submodule}`} className="border-b border-l border-line bg-white px-3 py-2 text-center text-xs font-semibold text-ink-muted">
                  {c.submodule ? c.label : "Whole module"}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {staffRows.map((r) => (
              <tr key={r.user.id} className="group">
                <th scope="row" className="sticky left-0 z-10 border-b border-r border-line bg-white px-4 py-3 text-left font-normal">
                  <p className="max-w-56 truncate font-semibold text-ink-heading">{r.user.name || r.user.email}</p>
                  <div className="mt-1"><RolePill role={r.user.role} /></div>
                </th>
                {r.user.role === "admin" ? (
                  <td colSpan={data.columns.length} className="border-b border-l border-line px-4 py-3 text-ink-muted">Admins can open everything.</td>
                ) : (
                  data.columns.map((c) => {
                    const g = find(r.grants, c);
                    return (
                      <td key={`${c.module}:${c.submodule}`} className="border-b border-l border-line p-1.5 text-center">
                        <button
                          disabled={busy}
                          onClick={() => click(r.user, c, g)}
                          aria-label={`${r.user.email}, ${c.module_name} ${c.submodule ? c.label : ""}: ${g ? g.status : "no access"}`}
                          className={cn(
                            "mx-auto inline-flex h-10 min-w-24 items-center justify-center gap-1.5 rounded-lg border px-2 text-xs font-semibold transition-colors disabled:opacity-50",
                            !g && "border-dashed border-line text-ink-muted hover:border-slate-nav hover:text-slate-nav",
                            g?.status === "granted" && "border-ok/30 bg-ok-soft text-ok hover:bg-ok/10",
                            g?.status === "requested" && "border-warn/40 bg-warn-soft text-warn hover:bg-warn/10",
                          )}
                        >
                          {!g && <><Plus className="h-3.5 w-3.5" aria-hidden />Grant</>}
                          {g?.status === "granted" && <><Check className="h-3.5 w-3.5" aria-hidden />Granted</>}
                          {g?.status === "requested" && <><Clock className="h-3.5 w-3.5" aria-hidden />Approve</>}
                        </button>
                      </td>
                    );
                  })
                )}
              </tr>
            ))}
            {!staffRows.length && (
              <tr><td className="px-4 py-8 text-center text-ink-muted" colSpan={data.columns.length + 1}>Invite people first, then grant them modules here.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <ConfirmDialog
        open={!!revoking}
        onOpenChange={(o) => !o && setRevoking(null)}
        destructive
        title="Revoke access?"
        confirmLabel="Revoke access"
        loading={revoke.isPending}
        description={revoking && <>{revoking.user.name || revoking.user.email} will lose access to <b>{revoking.col.module_name}{revoking.col.submodule ? ` › ${revoking.col.label}` : ""}</b> immediately.</>}
        onConfirm={() => revoking && revoke.mutate(revoking.grant.id, { onSuccess: () => { toast.success("Access revoked"); setRevoking(null); }, onError: fail })}
      />
    </Card>
  );
}
