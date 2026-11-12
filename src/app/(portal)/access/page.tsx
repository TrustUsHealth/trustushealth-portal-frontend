import type { Metadata } from "next";
import { AccessPortal } from "@/modules/access";

export const metadata: Metadata = { title: "Access Portal" };
export default function Page() {
  return <AccessPortal />;
}
