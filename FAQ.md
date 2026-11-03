# FAQ

### Which page is the home page?

`index.html` remains Lumen Home. MuseAI promotion is a separate page at `museai.html`.

### Does this site need a build step?

Public galleries can be previewed as static HTML/CSS/JavaScript. Production Premium access requires Cloudflare Pages Functions, a KV namespace, private R2 storage, MuseAI OAuth configuration, and PayPal/Stripe verification. `python3 scripts/build_pages.py` stages public output while excluding Premium originals. See [`PAYWALL_SETUP.md`](PAYWALL_SETUP.md) before deployment.

### Why is Premium hidden?

Visitors sign in with MuseAI and confirm they are 18+ before seeing subscription options. The date check is local to the browser and is not identity verification or a legal compliance guarantee. The server grants access only after the payment provider confirms an active subscription tied to that signed-in account.

### Do support links unlock Premium?

No. GitHub Sponsors, Buy Me a Coffee, and NOWPayments are optional support-only links. Premium membership is handled through the configured PayPal subscription and Stripe card checkout.

### What does support cost?

This repository does not state a price or billing interval. PayPal and Stripe show the configured terms before checkout; verify those settings in the provider dashboards before launch.
