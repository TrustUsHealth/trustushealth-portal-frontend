import type { Metadata } from "next";
import { LabSyncView } from "@/modules/patient_registry";

export const metadata: Metadata = { title: "Lab sync" };
export default function Page() {
  return <LabSyncView />;
}