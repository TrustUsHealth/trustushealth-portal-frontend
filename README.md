# TrustUs Health Portal: Frontend

Next.js 15 (App Router) + TypeScript + Tailwind + TanStack Query + React Hook Form + Zod.
Built against `trustushealth-portal-backend` (build 0 foundation + build 1 `patient_registry`).

## Run it

```bash
cp .env.example .env.local          # BACKEND_URL=http://localhost:8000
npm install
npm run dev                          # http://localhost:3000
```
Start the backend first (`docker compose up --build` in the backend repo). OTP emails appear in Mailpit at
http://localhost:8025; the bootstrap admin is `admin@example.com`.

The browser only talks to this origin: `next.config.ts` proxies `/api/v1/*` to `BACKEND_URL`, so the httpOnly
refresh cookie works without CORS.

`GET /healthz` reports frontend availability with a non-cached `200` response and does not depend on the backend.
Use it with an uptime monitor to check the deployed frontend. Production runs on Cloudflare Workers, which do not
scale to zero and do not need keep-alive pings.

## Brand assets: put them here

`public/brand/` (see `public/brand/README.md`): `logo-full.svg`, `logo-mark.svg`, `favicon.ico`, `icon-192.png`, `icon-512.png`.
Keep these file names. Placeholders for the two SVGs are included; the portal falls back to a text wordmark if a file is missing.
Used on: login page, sidebar, mobile header, loading screen, favicon, app icons. Never on bills, emails or exports.

## What is wired to the backend today

| Area | Endpoints used | Screens |
|---|---|---|
| Auth | `/auth/otp/request`, `/auth/otp/verify`, `/auth/refresh`, `/auth/logout` | OTP login (resend cooldown, paste, auto-submit), silent token renewal, single-flight refresh |
| Shell | `/me/modules`, `/config/app`, `/config/partners` | Server-driven sidebar + dashboard tiles, brand config, lab selector |
| Access Portal | `/access/users` (GET/POST/PATCH), `/access/modules`, `/access/modules/{k}/visibility`, `/access/requests` (+approve/deny), `/access/grants` (POST/DELETE), `/access/matrix` | Requests, interactive matrix (grant / approve / revoke), visibility toggles, people |
| Dashboard | `POST /access/requests` + registry counts | Locked / pending / open tiles, Request Access, admin visibility switch |
| Patient Registry | `/patient_registry/fields`, `/entries` (list, parse, create, get, patch, delete), `/reports/{id}/file`, `/customers`, `/excel_register` (list, download, send) | Lab-first new entry (upload or manual), side-by-side report preview with amber "Please verify", duplicate resolver (possible match / per-field conflict / different patient), optimistic-lock edits, patient history, Excel register |

Not exposed by UI on purpose: `POST /patient_registry/jobs/excel_monthly` (cron-only, needs `X-Job-Secret`).

Modules without a backend yet (`bill_generator`, `reports`, `delivery`, `logs`, `analytics`) have a catch-all placeholder route.
When a backend module ships, its tile appears automatically; build its screens under `src/modules/<key>/` and add a static route.

## Structure

```
src/app/            thin routes ((portal) group is behind AuthGuard + AppShell)
src/modules/<key>/  api.ts · components/ · index.ts   (auth, access, dashboard, patient_registry)
src/modules/registry.ts   one line per module (copy + build status)
src/core/           api client, auth session, config provider, shell
src/components/     ui primitives + shared pieces: lab-selector, entry-form, duplicate-dialog, pdf-preview
```

The entry form is driven by `GET /patient_registry/fields` (from `fields.yaml`): labels, required flags, defaults and
admin-only fields come from the server; an extra editable field added in YAML appears under "More details".

## Decisions worth knowing

- Access token lives in memory only; refresh happens via cookie on load, 60 s before expiry, on tab focus and on 401.
- Types in `src/core/api/types.ts` are hand-written for now. Run `npm run gen:api` (backend running) to generate `schema.d.ts`, then migrate.
- Upload accepts exactly what the backend accepts (PDF/DOCX from `/config/app`). Mobile file pickers offer camera/scan apps; direct photo upload needs OCR on the backend first.
- Test names are separated by Enter or `;`, never commas (e.g. "Creatinine, Serum").
- Recharts is in the PRD stack but not installed yet; add it with the analytics build.

## Not done yet

Not run, linted or type-checked: no terminal checks were performed, so expect a few small type fixes on first `npm run typecheck`.
CI is a minimal lint/type/build workflow; GHCR push and `wrangler deploy` steps come with Foundation hosting.
