import type { Metadata } from "next";
import { MetropolisView } from "@/modules/bill_generator";

export const metadata: Metadata = { title: "Metropolis bill" };
export default function Page() {
  return <MetropolisView />;
}