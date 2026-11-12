import type { Metadata } from "next";
import { ExcelRegisterView } from "@/modules/patient_registry";

export const metadata: Metadata = { title: "Excel register" };
export default function Page() {
  return <ExcelRegisterView />;
}
