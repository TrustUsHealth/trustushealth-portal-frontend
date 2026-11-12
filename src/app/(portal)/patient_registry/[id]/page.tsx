import { EntryDetailView } from "@/modules/patient_registry";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EntryDetailView id={id} />;
}
