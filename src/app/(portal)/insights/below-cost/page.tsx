import type { Metadata } from "next";
import { BelowCostView } from "@/modules/insights";

export const metadata: Metadata = { title: "Insights: Below-Cost Bills" };
export default function Page() {
  return <BelowCostView />;
}