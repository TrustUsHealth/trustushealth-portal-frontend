import type { Metadata } from "next";
import { LabsView } from "@/modules/insights";

export const metadata: Metadata = { title: "Insights: Labs" };
export default function Page() {
  return <LabsView />;
}