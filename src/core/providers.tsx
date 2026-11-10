"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { ApiError } from "@/core/api/client";
import { AuthProvider } from "@/core/auth/session";
import { ConfigProvider } from "@/core/config/provider";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 20_000,
            refetchOnWindowFocus: false,
            retry: (count, err) => !(err instanceof ApiError && err.status >= 400 && err.status < 500) && count < 2,
          },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <ConfigProvider>
        <AuthProvider>{children}</AuthProvider>
      </ConfigProvider>
      <Toaster position="top-center" richColors={false} toastOptions={{ classNames: { toast: "!rounded-ctl !border !border-line !bg-white !text-ink !shadow-pop !font-sans" } }} />
    </QueryClientProvider>
  );
}
