import type { Metadata } from "next";
import { FinanceView } from "@/modules/insights";

export const metadata: Metadata = { title: "Insights: Finance" };
export default function Page() {
  return <FinanceView />;
}