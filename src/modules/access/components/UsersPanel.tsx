"use client";

import { useState } from "react";
import { Pencil, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { ActivePill, RolePill } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Dialog, DialogBody, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/input";
import { Spinner } from "@/components/ui/misc";
import { Switch } from "@/components/ui/switch";
import { errorMessage } from "@/core/api/client";
import type { Role, UserAdminOut } from "@/core/api/types";
import { useAuth } from "@/core/auth/session";
import { formatDate, relativeTime } from "@/lib/format";
import { useInvite, usePatchUser, useUsers } from "../api";

type EditableRole = Exclude<Role, "customer">;
const ROLES: { v: EditableRole; label: string; hint: string }[] = [
  { v: "staff", label: "Staff", hint: "Only modules you make visible and grant" },
  { v: "admin", label: "Admin", hint: "Everything, including this portal" },
  { v: "engineer", label: "Engineer", hint: "Read-only logs and system health" },
];

function InviteDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const invite = useInvite();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<EditableRole>("staff");
  const [err, setErr] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    invite.mutate({ email: email.trim().toLowerCase(), name: name.trim() || null, role }, {
      onSuccess: (u) => {
        toast.success(`${u.email} invited as ${u.role}. They can now sign in with an email code.`);
        setEmail(""); setName(""); setRole("staff");
        onOpenChange(false);
      },
      onError: (e2) => setErr(errorMessage(e2)),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Invite a person" description="Only invited emails can sign in.">
        <form onSubmit={submit} className="flex min-h-0 flex-col">
          <DialogBody className="space-y-4">
            <Field label="Email" htmlFor="inv-email" required error={err ?? undefined}>
              <Input id="inv-email" type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} invalid={!!err} />
            </Field>
            <Field label="Name" htmlFor="inv-name" hint="Shown in logs and the access matrix.">
              <Input id="inv-name" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Role" htmlFor="inv-role" hint={ROLES.find((r) => r.v === role)?.hint}>
              <Select id="inv-role" value={role} onChange={(e) => setRole(e.target.value as EditableRole)}>
                {ROLES.map((r) => <option key={r.v} value={r.v}>{r.label}</option>)}
              </Select>
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" variant="primary" loading={invite.isPending}>Send invite</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditDialog({ user, onClose }: { user: UserAdminOut | null; onClose: () => void }) {
  const patch = usePatchUser();
  const [name, setName] = useState(user?.name ?? "");
  const [role, setRole] = useState<EditableRole>((user?.role as EditableRole) ?? "staff");
  const [active, setActive] = useState(user?.active ?? true);
  const [err, setErr] = useState<string | null>(null);

  return (
    <Dialog open={!!user} onOpenChange={(o) => !o && onClose()}>
      {user && (
        <DialogContent title="Edit person" description={user.email}>
          <DialogBody className="space-y-4">
            <Field label="Name" htmlFor="ed-name"><Input id="ed-name" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} /></Field>
            <Field label="Role" htmlFor="ed-role">
              <Select id="ed-role" value={role} onChange={(e) => setRole(e.target.value as EditableRole)}>
                {ROLES.map((r) => <option key={r.v} value={r.v}>{r.label}</option>)}
              </Select>
            </Field>
            <label className="flex items-center justify-between gap-3 rounded-ctl border border-line p-3">
              <span>
                <span className="block text-sm font-semibold text-ink-heading">Can sign in</span>
                <span className="text-xs text-ink-muted">Turn off to block this person without deleting them.</span>
              </span>
              <Switch label="Can sign in" checked={active} onCheckedChange={setActive} />
            </label>
            {err && <p role="alert" className="text-sm font-medium text-danger">Fix this: {err}</p>}
          </DialogBody>
          <DialogFooter>
            <Button onClick={onClose}>Cancel</Button>
            <Button
              variant="primary"
              loading={patch.isPending}
              onClick={() =>
                patch.mutate({ id: user.id, name: name.trim() || null, role, active }, {
                  onSuccess: () => { toast.success("Saved"); onClose(); },
                  onError: (e) => setErr(errorMessage(e)),
                })
              }
            >
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
}

export function UsersPanel() {
  const { data, isLoading, error } = useUsers();
  const { user: me } = useAuth();
  const [inviting, setInviting] = useState(false);
  const [editing, setEditing] = useState<UserAdminOut | null>(null);

  return (
    <Card>
      <CardHeader
        title="People"
        description="Everyone who can sign in. Invite by email, then grant modules in the matrix."
        action={<Button variant="primary" size="sm" onClick={() => setInviting(true)}><UserPlus className="h-4 w-4" aria-hidden />Invite</Button>}
      />
      {isLoading ? (
        <Spinner />
      ) : error ? (
        <p className="p-5 text-sm text-danger">{errorMessage(error)}</p>
      ) : (
        <ul className="divide-y divide-line/70">
          {data?.map((u) => (
            <li key={u.id} className="flex items-center gap-3 px-4 py-3.5 md:px-5">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-ink-heading">{u.name || u.email}{u.id === me?.id && <span className="ml-2 text-xs font-medium text-ink-muted">(you)</span>}</p>
                <p className="truncate text-sm text-ink-muted">{u.name ? u.email + " · " : ""}last sign-in {relativeTime(u.last_login_at)} · added {formatDate(u.created_at)}</p>
              </div>
              <div className="hidden items-center gap-2 sm:flex"><RolePill role={u.role} /><ActivePill active={u.active} /></div>
              <Button variant="ghost" size="icon" aria-label={`Edit ${u.email}`} onClick={() => setEditing(u)}><Pencil className="h-4 w-4" /></Button>
            </li>
          ))}
        </ul>
      )}
      <InviteDialog open={inviting} onOpenChange={setInviting} />
      <EditDialog key={editing?.id ?? "none"} user={editing} onClose={() => setEditing(null)} />
    </Card>
  );
}
