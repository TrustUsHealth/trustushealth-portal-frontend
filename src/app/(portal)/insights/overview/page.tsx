import type { Metadata } from "next";
import { OverviewView } from "@/modules/insights";

export const metadata: Metadata = { title: "Insights: Overview" };
export default function Page() {
  return <OverviewView />;
}