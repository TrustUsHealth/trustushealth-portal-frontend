import { SpectrumBillView } from "@/modules/bill_generator";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SpectrumBillView id={id} />;
}