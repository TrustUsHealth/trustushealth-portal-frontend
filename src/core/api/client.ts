import type { TokenOut } from "./types";

/** Same-origin proxy (next.config rewrites) -> backend. Never call the backend host directly. */
export const API_BASE = "/api/v1";

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

// ───────────────────────── session token (memory only: never localStorage) ─────────────────────────
let accessToken: string | null = null;
type SessionListener = (t: TokenOut | null) => void;
const listeners = new Set<SessionListener>();

export const getAccessToken = () => accessToken;
export function subscribeSession(fn: SessionListener) {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}
/** Called after login or refresh; AuthProvider listens and updates the UI. */
export function applySession(t: TokenOut | null) {
  accessToken = t?.access_token ?? null;
  listeners.forEach((l) => l(t));
}

let refreshing: Promise<TokenOut | null> | null = null;
/**
 * Single-flight refresh. The refresh token rotates and reuse revokes the session, so two simultaneous calls
 * (React StrictMode, parallel 401s) MUST share one request.
 */
export function refreshSession(): Promise<TokenOut | null> {
  if (!refreshing) {
    refreshing = (async () => {
      try {
        const r = await fetch(`${API_BASE}/auth/refresh`, { method: "POST", credentials: "same-origin" });
        if (!r.ok) {
          applySession(null);
          return null;
        }
        const t = (await r.json()) as TokenOut;
        applySession(t);
        return t;
      } catch {
        return null;
      } finally {
        setTimeout(() => (refreshing = null), 0);
      }
    })();
  }
  return refreshing;
}

// ───────────────────────── errors ─────────────────────────
type Json = Record<string, unknown>;

export function messageFromBody(body: unknown, status: number): string {
  if (body && typeof body === "object") {
    const b = body as Json;
    const d = b.detail;
    if (typeof d === "string") return d;
    if (Array.isArray(d)) {
      return d
        .map((x) => {
          const item = x as { loc?: unknown[]; msg?: string };
          const where = (item.loc ?? []).filter((p) => p !== "body" && p !== "query").join(".");
          return `${where ? where + ": " : ""}${item.msg ?? "invalid value"}`;
        })
        .join(" · ");
    }
    if (d && typeof d === "object" && typeof (d as Json).message === "string") return (d as Json).message as string;
    if (typeof b.message === "string") return b.message; // 409 duplicate decision body
  }
  if (status === 429) return "Too many requests. Wait a moment, then try again.";
  if (status === 403) return "You do not have access to this.";
  if (status === 404) return "We could not find that.";
  if (status >= 500) return "The server had a problem. Try again in a moment.";
  return "Something went wrong. Try again.";
}

export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return "Something went wrong. Try again.";
}

// ───────────────────────── request ─────────────────────────
type Query = Record<string, string | number | boolean | null | undefined>;
export interface RequestOpts {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  query?: Query;
  json?: unknown;
  form?: FormData;
  signal?: AbortSignal;
  /** Skip the bearer header and 401 recovery (login endpoints). */
  anonymous?: boolean;
}

export function qs(query?: Query) {
  if (!query) return "";
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== null && v !== "") p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : "";
}

async function send(path: string, o: RequestOpts, token: string | null): Promise<Response> {
  const headers: Record<string, string> = {};
  if (token && !o.anonymous) headers.Authorization = `Bearer ${token}`;
  let body: BodyInit | undefined;
  if (o.form) body = o.form;
  else if (o.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(o.json);
  }
  try {
    return await fetch(`${API_BASE}${path}${qs(o.query)}`, {
      method: o.method ?? "GET",
      headers,
      body,
      signal: o.signal,
      credentials: "same-origin",
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new ApiError(0, "Cannot reach the server. Check your connection and try again.");
  }
}

async function raw(path: string, o: RequestOpts = {}): Promise<Response> {
  let res = await send(path, o, accessToken);
  if (res.status === 401 && !o.anonymous) {
    const t = await refreshSession();
    if (t) res = await send(path, o, t.access_token);
  }
  return res;
}

async function toError(res: Response): Promise<ApiError> {
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* non-JSON error body */
  }
  return new ApiError(res.status, messageFromBody(body, res.status), body);
}

export async function api<T>(path: string, o: RequestOpts = {}): Promise<T> {
  const res = await raw(path, o);
  if (!res.ok) throw await toError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** For endpoints whose 409 carries a structured body (duplicate decisions). */
export async function apiWithConflict<T, C>(path: string, o: RequestOpts): Promise<{ ok: true; data: T; status: number } | { ok: false; conflict: C }> {
  const res = await raw(path, o);
  if (res.status === 409) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      /* ignore */
    }
    // Duplicate decisions are { outcome, ... }; version conflicts are { detail }.
    if (body && typeof body === "object" && "outcome" in (body as Json)) return { ok: false, conflict: body as C };
    throw new ApiError(409, messageFromBody(body, 409), body);
  }
  if (!res.ok) throw await toError(res);
  return { ok: true, data: (await res.json()) as T, status: res.status };
}

// ───────────────────────── files (authenticated blobs) ─────────────────────────
function filenameFrom(res: Response, fallback: string) {
  const cd = res.headers.get("Content-Disposition") ?? "";
  const star = /filename\*=UTF-8''([^;]+)/i.exec(cd);
  if (star) return decodeURIComponent(star[1]);
  const plain = /filename="?([^";]+)"?/i.exec(cd);
  return plain ? plain[1] : fallback;
}

export async function fetchBlob(path: string, query?: Query, fallbackName = "file") {
  const res = await raw(path, { query });
  if (!res.ok) throw await toError(res);
  return { blob: await res.blob(), filename: filenameFrom(res, fallbackName), type: res.headers.get("Content-Type") ?? "" };
}

export async function downloadFile(path: string, query?: Query, fallbackName = "download") {
  const { blob, filename } = await fetchBlob(path, query, fallbackName);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return filename;
}
