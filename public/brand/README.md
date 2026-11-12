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

Rules from the PRD: logos are used **only inside the portal screens**. Nothing the system generates
(bills, emails, Excel, exports) carries a logo, and no partner-lab logos are used anywhere.

If a file is missing the portal falls back to a text wordmark, so nothing breaks while you add assets.
Prefer SVG for the two logos (crisp on every screen); PNG icons should have a solid or padded background.
