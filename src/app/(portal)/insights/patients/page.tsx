import type { Metadata } from "next";
import { PatientsView } from "@/modules/insights";

export const metadata: Metadata = { title: "Insights: Patients" };
export default function Page() {
  return <PatientsView />;
}