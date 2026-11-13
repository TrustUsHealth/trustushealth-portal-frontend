import { Suspense } from "react";

/** useSearchParams (the filters live in the URL) needs a Suspense boundary. */
export default function InsightsLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="skeleton h-64 rounded-card" aria-hidden />}>
      {children}
    </Suspense>
  );
}