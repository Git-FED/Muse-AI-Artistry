# Premium paywall setup

The Premium tab is designed for Cloudflare Pages Functions. The gallery route, membership API, and image proxy fail closed: without a valid MuseAI session and a server-verified active subscription, Premium HTML and its ten protected images are not served. The browser never grants access based on a checkout redirect alone.

## Before deployment

1. **Register MuseAI sign-in for this site.** The default production origin is `https://museai-gallery.pages.dev`, but `SITE_ORIGIN` is configurable. Register the exact callback `https://museai-gallery.pages.dev/auth/callback` (or the matching custom-domain URL) with the MuseAI OAuth/OIDC provider. Do not assume a client previously registered for `https://hub.fedos.workers.dev/` is valid here. The provider must support authorization-code flow with PKCE and a user-info endpoint returning a stable `sub` identifier.
2. **Create a Cloudflare KV namespace** and bind it to the Pages project as `APP_KV`. It stores short-lived OAuth state, sessions, checkout intents, and entitlement records. Create a random `SESSION_SECRET` of at least 32 bytes.
3. **Create a private R2 bucket** named `museai-premium-media`, bind it as `PREMIUM_MEDIA`, and keep public bucket access disabled. Run `scripts/upload_premium_assets.sh` after authenticating Wrangler to upload the ten Premium images from the source archive. The standard Pages build omits those files from public static assets.
4. **Configure PayPal REST verification.** Set `PAYPAL_REST_CLIENT_ID`, `PAYPAL_REST_CLIENT_SECRET`, and `PAYPAL_API_BASE` to the matching live or sandbox values (`https://api-m.paypal.com` or `https://api-m.sandbox.paypal.com`). The supplied PayPal JavaScript client ID and plan ID are included as public defaults; they can be overridden with `PAYPAL_JS_CLIENT_ID` and `PAYPAL_PLAN_ID`. Ensure the JS client ID and REST credentials belong to the same PayPal environment. The server grants access only when PayPal returns an `ACTIVE` subscription on the configured plan and its `custom_id` matches a one-time intent bound to the signed-in user.
5. **Configure Stripe card verification.** Set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `STRIPE_EXPECTED_PRICE_ID`. The provided Buy Button ID and publishable key are public defaults and can be overridden with `STRIPE_BUY_BUTTON_ID` and `STRIPE_PUBLISHABLE_KEY`. The Buy Button must create a subscription for the expected price and preserve the page's `client-reference-id`. Create a Stripe webhook to `https://museai-gallery.pages.dev/api/billing/stripe-webhook` (or the configured origin) for `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, and `invoice.payment_failed`. The handler validates Stripe signatures, checks the expected price, and re-queries Stripe for subscription state before granting or revoking access.
6. Set `SITE_ORIGIN`, `MUSE_OAUTH_AUTHORIZE_URL`, `MUSE_OAUTH_TOKEN_URL`, `MUSE_OAUTH_USERINFO_URL`, `MUSE_OAUTH_CLIENT_ID`, `MUSE_OAUTH_CLIENT_SECRET`, `MUSE_OAUTH_REDIRECT_URI`, `SESSION_SECRET`, and the payment secrets as Pages environment variables/secrets. Set `MUSE_OAUTH_REDIRECT_URI` to exactly `${SITE_ORIGIN}/auth/callback`. Use separate production and preview credentials; the default Secure cookie assumes HTTPS.
7. Bind `APP_KV` in Cloudflare Pages settings for both Production and any Preview environment you test. The R2 binding is described in `wrangler.toml`; confirm it is attached to the same Pages project. Add all secret variables separately in Cloudflare Pages settings; do not commit secret values.

No amount, billing interval, cancellation policy, or product terms are invented here. Confirm the PayPal plan and Stripe Buy Button/price configuration in their provider dashboards before offering checkout.

## Build and verify

Run:

```sh
python3 scripts/validate_site.py
python3 scripts/build_pages.py
```

Deploy only the staged `dist/` output to Cloudflare Pages with the `functions/` directory and `wrangler.toml` present at the project root. The GitHub Actions Cloudflare workflow does this. GitHub Pages and plain static hosting do not run these Functions; they intentionally cannot unlock or serve Premium, and the Premium UI stays locked there.

After deployment, verify all of the following before launch:

- A signed-out request for `/corridor.html` redirects to `/premium-gate.html`.
- `/premium-assets/fed-edu-simple-login-1.webp` returns 403 while signed out or unpaid, and returns the image only for an active member.
- Signing in issues an HttpOnly, Secure, SameSite=Lax cookie and returns to the configured site.
- A PayPal approval without a matching server-created `custom_id` does not grant access.
- A Stripe success redirect without a valid signed webhook and active matching subscription does not grant access.
- Canceled/inactive subscriptions lose access after the server's provider recheck/webhook update.
- The ten protected files are absent from `dist/assets/gallery-images/`, and the R2 bucket remains private.

## Important source-repository note

The downloadable source archive retains the ten original WebP files so they can be uploaded to R2. The build excludes them from the public Pages output, but a **public source repository** would still expose files committed under `assets/gallery-images/`. Keep the source repository private or move those originals out of its public history before publishing. The manifest in `dist/` removes their entries, including their source URLs.

GitHub Sponsors, Buy Me a Coffee, and NOWPayments are support-only links. They do not create or verify a Premium entitlement.

Provider references: [PayPal subscription creation fields](https://developer.paypal.com/api/subscriptions/v1/subscriptions-create) and [PayPal JavaScript SDK subscription integration](https://developer.paypal.com/sdk/js/v5/reference) document subscription creation and `custom_id`; [Stripe's Buy Button guide](https://docs.stripe.com/payment-links/buy-button) documents `client-reference-id` and its delivery in `checkout.session.completed`.
