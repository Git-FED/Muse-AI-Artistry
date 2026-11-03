# MuseAI — creative systems archive

A visual archive of creative AI concepts, imagined interfaces, and ideas in motion. The site includes nine interactive galleries, local image assets, and a Premium collection protected by Cloudflare Pages Functions.

## Start here

- **Features:** [`index.html`](index.html) is the default gallery.
- **MuseAI promo:** [`museai.html`](museai.html) is a separate promotional page.
- **Gallery tabs:** Features, Exclusives, Feed, Explore, Avatars, Projects, Premium, Profile, and Portfolio.
- **Premium gate:** [`premium-gate.html`](premium-gate.html) handles MuseAI sign-in and verified subscription checkout. [`corridor.html`](corridor.html) and its protected artwork require an active server-verified membership.

## Run locally

Open `index.html` or serve the project with a static HTTP server to preview the public galleries and their local interactions. Static previews deliberately do not unlock Premium because they do not run the Cloudflare Functions or provider verification.

## Features gallery prototype controls

The Features page includes per-image likes, comments, sharing, local image uploads, and a local display-name profile. Likes, comments, and the display name are stored in browser storage; uploaded files stay in IndexedDB on the current browser when available. These controls are separate from MuseAI account sign-in.

## Premium access and payment

The Premium tab uses MuseAI OAuth sign-in, server-side session validation, PayPal subscription API checks, Stripe signed webhooks and subscription checks, and private R2 image delivery. No client-side flag or provider return URL can unlock the gallery. PayPal and Stripe are the membership checkout methods; GitHub Sponsors, Buy Me a Coffee, and NOWPayments are support-only and do not grant access. Ko-fi is not included.

The provider dashboards determine price, billing interval, taxes, cancellation terms, and product descriptions. This repository does not invent those terms. The server flow is intentionally unavailable until the required Cloudflare bindings, MuseAI OAuth registration, and PayPal/Stripe verification secrets are configured.

Read [`PAYWALL_SETUP.md`](PAYWALL_SETUP.md) before deployment. It includes the exact callback URL requirements, environment values, R2 upload, webhook setup, and verification checklist. In particular, the existing MuseAI sign-in client previously registered for `https://hub.fedos.workers.dev/` must not be assumed to be valid for `https://museai-gallery.pages.dev`.

## Deploy

Cloudflare Pages is the supported host for Premium functionality. The Cloudflare GitHub Actions workflow stages a public `dist/` directory and deploys it with the Functions. GitHub Pages/static hosting can preview the public galleries but cannot provide Premium access. Do not deploy the repository root directly: it contains the Premium source images for upload to the private R2 bucket.

## Contact

`careers@fedpromptly.com` · `support@fedpromptly.com` · `business@fedpromptly.com` · `contact@fedpromptly.com`

## Project documents

See [`PAYWALL_SETUP.md`](PAYWALL_SETUP.md), [`DEPLOYMENT.md`](DEPLOYMENT.md), [`SUMMARY.md`](SUMMARY.md), [`BUILD.md`](BUILD.md), [`INSTALL.md`](INSTALL.md), [`FAQ.md`](FAQ.md), [`SUPPORT.md`](SUPPORT.md), [`ROADMAP.md`](ROADMAP.md), and [`SECURITY.md`](SECURITY.md).
