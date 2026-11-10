import { AuthGuard } from "@/core/auth/AuthGuard";
import { AppShell } from "@/core/shell/AppShell";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <AppShell>{children}</AppShell>
    </AuthGuard>
  );
}
