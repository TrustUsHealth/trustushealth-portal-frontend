"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, ClipboardList, FileText, Mail, Receipt, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/logo";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { errorMessage } from "@/core/api/client";
import { FullScreenLoader } from "@/core/auth/AuthGuard";
import { useAuth } from "@/core/auth/session";
import { requestOtp, verifyOtp } from "../api";
import { OtpInput } from "./OtpInput";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const safeNext = (n: string | null) => (n && n.startsWith("/") && !n.startsWith("//") ? n : "/dashboard");

const POINTS = [
  { icon: ClipboardList, text: "One entry per patient visit, never typed twice" },
  { icon: FileText, text: "Lab reports read for you, every value editable" },
  { icon: Receipt, text: "Bills and the Excel register kept in step" },
];

export function LoginView() {
  const router = useRouter();
  const params = useSearchParams();
  const { status, login } = useAuth();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (status === "authenticated") router.replace(safeNext(params.get("next")));
  }, [status, router, params]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    const clean = email.trim().toLowerCase();
    if (!EMAIL_RE.test(clean)) return setError("Enter the email address your admin invited.");
    setBusy(true);
    setError(null);
    try {
      const r = await requestOtp(clean);
      setEmail(clean);
      setCooldown(r.resend_after_seconds);
      setCode("");
      setStep("code");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function verify(c: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const t = await verifyOtp(email, c);
      login(t);
      toast.success(`Welcome${t.user.name ? ", " + t.user.name.split(" ")[0] : ""}`);
    } catch (err) {
      setError(errorMessage(err));
      setCode("");
    } finally {
      setBusy(false);
    }
  }

  if (status === "loading" || status === "authenticated") return <FullScreenLoader />;

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-slate-nav p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand opacity-80 mix-blend-multiply" />
        <div aria-hidden className="absolute -bottom-32 -left-16 h-80 w-80 rounded-full border-[40px] border-white/5" />
        <div className="relative w-fit rounded-card bg-white px-5 py-3"><Logo variant="full" className="h-11" /></div>
        <div className="relative max-w-md">
          <h1 className="font-display text-[44px] font-semibold leading-[1.05] !text-white">
            From sample pickup to patient inbox, in one calm place.
          </h1>
          <ul className="mt-8 space-y-4 text-[15px] text-white/85">
            {POINTS.map(({ icon: I, text }) => (
              <li key={text} className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-white/10"><I className="h-[18px] w-[18px]" aria-hidden /></span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative flex items-center gap-2 text-xs text-white/65"><ShieldCheck className="h-4 w-4" aria-hidden /> Invite-only. Every access is attributed to a named user.</p>
      </aside>

      <main className="paper flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden"><Logo variant="full" className="h-11" /></div>

          {step === "email" ? (
            <form onSubmit={sendCode} noValidate className="animate-pop-in">
              <h2 className="text-2xl font-semibold">Sign in</h2>
              <p className="mt-1.5 text-sm text-ink-muted">We email you a 6-digit code. No password to remember.</p>
              <div className="mt-7 space-y-4">
                <Field label="Work email" htmlFor="email" error={error ?? undefined}>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden />
                    <Input id="email" type="email" autoComplete="email" inputMode="email" autoFocus placeholder="name@trustus.in" className="pl-9" value={email} invalid={!!error} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                </Field>
                <Button type="submit" variant="primary" size="lg" className="w-full" loading={busy}>Email me a code</Button>
              </div>
              <p className="mt-6 text-xs leading-relaxed text-ink-muted">Only invited emails can sign in. If you should have access and no code arrives, ask your admin.</p>
            </form>
          ) : (
            <div className="animate-pop-in">
              <button onClick={() => { setStep("email"); setError(null); }} className="-ml-1 mb-4 inline-flex h-9 items-center gap-1.5 rounded-ctl px-2 text-sm font-semibold text-slate-nav hover:bg-slate-nav/10">
                <ArrowLeft className="h-4 w-4" aria-hidden /> Change email
              </button>
              <h2 className="text-2xl font-semibold">Enter your code</h2>
              <p className="mt-1.5 text-sm text-ink-muted">If <span className="font-semibold text-ink-heading">{email}</span> is registered, a code is on its way. It expires in 5 minutes.</p>
              <div className="mt-6"><OtpInput value={code} onChange={setCode} onComplete={verify} disabled={busy} invalid={!!error} /></div>
              {error && <Alert kind="error" title="Code not accepted" className="mt-4">{error}</Alert>}
              <Button variant="primary" size="lg" className="mt-5 w-full" loading={busy} disabled={code.length < 6} onClick={() => verify(code)}>Sign in</Button>
              <div className="mt-4 text-center text-sm text-ink-muted">
                {cooldown > 0 ? (
                  <span aria-live="polite">You can ask for a new code in {cooldown}s</span>
                ) : (
                  <Button variant="link" onClick={() => sendCode()} disabled={busy}>Send a new code</Button>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
