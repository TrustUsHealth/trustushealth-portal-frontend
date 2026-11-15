"use client";

import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/misc";
import { errorMessage } from "@/core/api/client";
import { useLabs } from "../api";
import type { BillMode, LabOut } from "../types";

/** The server decides which labs a user may open (`GET /labs`). Screens render only for an open lab of the right mode. */
export function LabGate({ labKey, mode, children }: { labKey: string; mode: BillMode; children: (lab: LabOut) => React.ReactNode }) {
  const { data, isLoading, error } = useLabs();
  if (isLoading) return <Spinner label="Loading laboratories" />;
  if (error) return <Alert kind="error" title="Could not open Bill Generator">{errorMessage(error)}</Alert>;
  const lab = data?.find((l) => l.key === labKey);
  if (!lab)
    return (
      <Alert kind="warning" title="This lab is not open to you">
        Ask an admin to grant access to this lab in Bill Generator.
      </Alert>
    );
  if (lab.mode !== mode)
    return (
      <Alert kind="warning" title="This kind of bill is not available for this lab">
        {lab.name} works in a different way. Go back to the lab list and open it from there.
      </Alert>
    );
  return <>{children(lab)}</>;
}