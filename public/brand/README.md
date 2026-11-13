# Brand assets: drop your files here

Replace the placeholder files with your real assets, **keeping the same file names**
(names are referenced by `config/app.yaml` in the backend and by `src/app/layout.tsx`).

| File | Used for | Where it appears |
|---|---|---|
| `logo-full.svg` | Full horizontal logo (mark + wordmark) | Login page, top of the desktop sidebar, mobile drawer |
| `logo-mark.svg` | Square mark only | Collapsed header on mobile, loading screen, empty states |
| `favicon.ico` | Browser tab icon | `<link rel="icon">` |
| `icon-192.png` | App icon (192 x 192) | Apple touch icon, PWA manifest |
| `icon-512.png` | App icon (512 x 512) | PWA manifest / install splash |

The full logo is also embedded in transactional backend emails. Keep the backend email image at
`trustushealth-portal-backend/app/core/assets/brand-logo.png` in sync when replacing `logo-full.svg`.
No partner-lab logos are used in portal screens or emails.

If a file is missing the portal falls back to a text wordmark, so nothing breaks while you add assets.
Prefer SVG for the two logos (crisp on every screen); PNG icons should have a solid or padded background.
