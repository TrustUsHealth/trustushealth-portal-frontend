import { api } from "@/core/api/client";
import type { OtpRequestedOut, TokenOut } from "@/core/api/types";

export const requestOtp = (email: string) =>
  api<OtpRequestedOut>("/auth/otp/request", { method: "POST", json: { email }, anonymous: true });

export const verifyOtp = (email: string, code: string) =>
  api<TokenOut>("/auth/otp/verify", { method: "POST", json: { email, code }, anonymous: true });
