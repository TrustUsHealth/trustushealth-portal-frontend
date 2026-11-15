import type { Metadata } from "next";
import { BillHomeView } from "@/modules/bill_generator";

export const metadata: Metadata = { title: "Bill Generator" };
export default function Page() {
  return <BillHomeView />;
}