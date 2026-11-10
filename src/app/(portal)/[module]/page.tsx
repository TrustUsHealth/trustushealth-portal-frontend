import { notFound } from "next/navigation";
import { ModulePlaceholder } from "@/core/shell/ModulePlaceholder";
import { MODULE_REGISTRY } from "@/modules/registry";

/** Catch-all for modules whose backend/screens are not built yet. Static routes (patient_registry, access, ...) win over this. */
export default async function Page({ params }: { params: Promise<{ module: string }> }) {
  const { module } = await params;
  const meta = MODULE_REGISTRY[module];
  if (!meta || meta.status === "live") notFound();
  return <ModulePlaceholder moduleKey={module} />;
}
