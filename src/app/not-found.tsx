import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-ivory p-6">
      <div className="max-w-sm text-center">
        <p className="font-display text-6xl font-semibold text-slate-nav">404</p>
        <h1 className="mt-2 text-xl font-semibold">That page does not exist</h1>
        <p className="mt-2 text-sm text-ink-muted">The link may be old, or the module may not be available yet.</p>
        <Link href="/dashboard" className="mt-5 inline-flex h-11 items-center rounded-ctl bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-dark">
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
