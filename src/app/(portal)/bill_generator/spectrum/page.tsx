import type { Metadata } from "next";
import { SpectrumStartView } from "@/modules/bill_generator";

export const metadata: Metadata = { title: "Spectrum bill" };
export default function Page() {
  return <SpectrumStartView />;
}