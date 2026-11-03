# Project map

- `index.html` — Features gallery. Premium-only studies are shown only after the membership API confirms access.
- `premium-gate.html` and `assets/js/paywall.js` — MuseAI sign-in status, age confirmation, PayPal subscription checkout, Stripe card checkout, and non-unlocking support links.
- `corridor.html` — Premium gallery shell, served only after server-side entitlement validation; missing private objects gracefully fall back to the public placeholder.
- `functions/` — Cloudflare Pages Functions for OAuth, signed sessions, provider verification, route protection, and private Premium image delivery.
- `assets/gallery-images/` — one public `gallery-placeholder.webp` and a manifest containing that placeholder only.
- `assets/images/favicon.png` and `favicon.ico` — preserved site favicons; the original gallery/photo collection and promo/social preview artwork are not bundled.
- `scripts/build_pages.py` — stages public static files and rejects additional bundled gallery WebP images.
- `scripts/upload_premium_assets.sh` — uploads owner-supplied Premium replacements from `premium-upload/` or `PREMIUM_IMAGE_SOURCE_DIR` to a private R2 bucket.
- `PAYWALL_SETUP.md` — required OAuth, Cloudflare, PayPal, Stripe, R2, replacement image, and verification setup.
- `assets/css/main.css`, `assets/js/app.js` — shared branding and local/visual interactions.
- `components/`, `data/`, and `.github/workflows/` — shared references, metadata, validation, and deployment automation.
