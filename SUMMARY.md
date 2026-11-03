# Project map

- `index.html` — Features gallery. Premium-only studies are shown only after the membership API confirms access.
- `premium-gate.html` and `assets/js/paywall.js` — MuseAI sign-in status, age confirmation, PayPal subscription checkout, Stripe card checkout, and non-unlocking support links.
- `corridor.html` — Premium gallery shell, served only after server-side entitlement validation.
- `functions/` — Cloudflare Pages Functions for OAuth, signed sessions, provider verification, route protection, and private Premium image delivery.
- `assets/gallery-images/` — original local gallery images and manifest; the ten Premium originals are retained in the source archive for upload to private R2, not included in public `dist/`.
- `scripts/build_pages.py` — stages public static files and excludes Premium originals.
- `scripts/upload_premium_assets.sh` — uploads Premium originals to a private R2 bucket.
- `PAYWALL_SETUP.md` — required OAuth, Cloudflare, PayPal, Stripe, R2, and verification setup.
- `assets/css/main.css`, `assets/js/app.js` — shared branding and local/visual interactions.
- `components/`, `data/`, and `.github/workflows/` — shared references, metadata, validation, and deployment automation.
