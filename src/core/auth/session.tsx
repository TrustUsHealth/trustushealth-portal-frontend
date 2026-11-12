"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api, applySession, refreshSession, subscribeSession } from "@/core/api/client";
import type { Role, TokenOut, UserOut } from "@/core/api/types";

type Status = "loading" | "authenticated" | "anonymous";

interface AuthCtx {
  status: Status;
  user: UserOut | null;
  isAdmin: boolean;
  hasRole: (...roles: Role[]) => boolean;
  login: (t: TokenOut) => void;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState<Status>("loading");
  const [user, setUser] = useState<UserOut | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Keep UI state in sync with the API client (login, silent refresh, forced sign-out).
  useEffect(() => {
    return subscribeSession((t) => {
      if (timer.current) clearTimeout(timer.current);
      if (!t) {
        setUser(null);
        setStatus("anonymous");
        qc.clear();
        return;
      }
      setUser(t.user);
      setStatus("authenticated");
      // Renew one minute before the 15-minute access token ends.
      timer.current = setTimeout(() => void refreshSession(), Math.max(15, t.expires_in - 60) * 1000);
    });
  }, [qc]);

  // First load: the httpOnly refresh cookie decides whether a session exists.
  useEffect(() => {
    void refreshSession().then((t) => {
      if (!t) setStatus("anonymous");
    });
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  // Coming back to a sleeping tab: renew immediately instead of waiting for a 401.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && status === "authenticated") void refreshSession();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [status]);

  const login = useCallback((t: TokenOut) => applySession(t), []);
  const logout = useCallback(async () => {
    try {
      await api<void>("/auth/logout", { method: "POST", anonymous: true });
    } finally {
      applySession(null);
    }
  }, []);

  const value = useMemo<AuthCtx>(
    () => ({
      status,
      user,
      isAdmin: user?.role === "admin",
      hasRole: (...roles) => !!user && roles.includes(user.role),
      login,
      logout,
    }),
    [status, user, login, logout],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used inside <AuthProvider>");
  return c;
}
