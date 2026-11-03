# Deployment

## Cloudflare Pages (required for Premium)

The supported production deployment uses Cloudflare Pages Functions. The workflow at `.github/workflows/deploy-cloudflare.yml` validates the project, runs `scripts/build_pages.py`, and deploys only `dist/` while the `functions/` directory and `wrangler.toml` remain at the repository root.

Do not upload the repository root directly. It contains the ten Premium source images required for R2 upload; the build script intentionally omits them from public static assets and removes their manifest entries. Keep the R2 bucket private.

Before deployment, complete every item in [`PAYWALL_SETUP.md`](PAYWALL_SETUP.md): register the correct MuseAI OAuth callback for this website, bind `APP_KV` and `PREMIUM_MEDIA`, configure PayPal REST verification and Stripe webhooks, and set all secrets. The default origin is `https://museai-gallery.pages.dev`; use `SITE_ORIGIN` to change it. No deployment is performed by this project update.

## GitHub Pages/static preview

The manual GitHub Pages workflow stages `dist/`, so it does not publish the Premium image files. It does not run Cloudflare Pages Functions and therefore cannot sign users in, verify payments, or unlock Premium. Premium stays locked on static-only hosts. Use Cloudflare Pages for the production membership flow.

## Payment return page

PayPal approval is verified by `/api/billing/paypal-verify` before the user is sent to the Premium gallery. Stripe checkout does not unlock from its return URL; the Stripe webhook at `/api/billing/stripe-webhook` must verify the event signature, expected price, and active subscription. Configure the Buy Button's success redirect to the deployed `support-success.html` URL, then verify that page reports access only when `/api/session` confirms Premium.

## Validation

Run `python3 scripts/validate_site.py` and `python3 scripts/build_pages.py`. Review the output to confirm that all ten Premium originals are absent from `dist/assets/gallery-images/` before deploying.
