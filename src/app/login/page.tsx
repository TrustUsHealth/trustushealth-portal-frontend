import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginView } from "@/modules/auth";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <Suspense>
      <LoginView />
    </Suspense>
  );
}
