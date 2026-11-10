import type { Metadata } from "next";
import { CustomersView } from "@/modules/patient_registry";

export const metadata: Metadata = { title: "Patients" };
export default function Page() {
  return <CustomersView />;
}
