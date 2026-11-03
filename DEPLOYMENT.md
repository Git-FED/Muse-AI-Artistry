# Deployment

## Cloudflare Pages (required for Premium)

The supported production deployment uses Cloudflare Pages Functions. The workflow at `.github/workflows/deploy-cloudflare.yml` validates the project, runs `scripts/build_pages.py`, and deploys only `dist/` while the `functions/` directory and `wrangler.toml` remain at the repository root.

The project archive contains one public gallery placeholder and does not include the original gallery photos or Premium photo originals. The build stages the placeholder and excludes any protected Premium files. Keep the Premium R2 bucket private; upload owner-supplied replacement images using [`scripts/upload_premium_assets.sh`](scripts/upload_premium_assets.sh).

Before deployment, complete every item in [`PAYWALL_SETUP.md`](PAYWALL_SETUP.md): register the correct MuseAI OAuth callback for this website, bind `APP_KV` and `PREMIUM_MEDIA`, configure PayPal REST verification and Stripe webhooks, supply Premium replacements to private R2, and set all secrets. The default origin is `https://museai-gallery.pages.dev`; use `SITE_ORIGIN` to change it. No deployment is performed by this project update.

## GitHub Pages/static preview

The manual GitHub Pages workflow stages `dist/`, so it does not publish Premium image files. It does not run Cloudflare Pages Functions and therefore cannot sign users in, verify payments, or unlock Premium. Premium stays locked on static-only hosts. Use Cloudflare Pages for the production membership flow.

## Payment return page

PayPal approval is verified by `/api/billing/paypal-verify` before the user is sent to the Premium gallery. Stripe checkout does not unlock from its return URL; the Stripe webhook at `/api/billing/stripe-webhook` must verify the event signature, expected price, and active subscription. Configure the Buy Button's success redirect to the deployed `support-success.html` URL, then verify that page reports access only when `/api/session` confirms Premium.

## Validation

Run `python3 scripts/validate_site.py` and `python3 scripts/build_pages.py`. Confirm that the gallery manifest and `dist/assets/gallery-images/` contain only `gallery-placeholder.webp`, and that all ten Premium replacement images are supplied only to the private R2 bucket before launch.
