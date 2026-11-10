import { Suspense } from "react";
import type { Metadata } from "next";
import { EntriesView } from "@/modules/patient_registry";

export const metadata: Metadata = { title: "Patient Registry" };
export default function Page() {
  return (
    <Suspense>
      <EntriesView />
    </Suspense>
  );
}
