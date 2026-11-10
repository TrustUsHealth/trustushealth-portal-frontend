import type { Metadata } from "next";
import { NewEntryView } from "@/modules/patient_registry";

export const metadata: Metadata = { title: "New entry" };
export default function Page() {
  return <NewEntryView />;
}
