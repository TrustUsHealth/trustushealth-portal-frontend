import { redirect } from "next/navigation";

/** The dashboard tile opens /insights; send it to the Overview tab and keep any saved filters. */
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === "string") qs.set(k, v);
  }
  const s = qs.toString();
  redirect(`/insights/overview${s ? `?${s}` : ""}`);
}