"use client";

import { AlertTriangle } from "lucide-react";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-ivory p-6">
      <div className="max-w-sm text-center">
        <AlertTriangle className="mx-auto h-10 w-10 text-warn" aria-hidden />
        <h1 className="mt-3 text-xl font-semibold">This screen hit a problem</h1>
        <p className="mt-2 text-sm text-ink-muted">Your data is safe. Reload the screen and try again.</p>
        <button onClick={reset} className="mt-5 h-11 rounded-ctl bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-dark">
          Reload screen
        </button>
      </div>
    </main>
  );
}
