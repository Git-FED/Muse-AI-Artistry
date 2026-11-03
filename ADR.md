# Architecture decisions

## Public galleries and server-protected Premium

The public gallery pages remain plain HTML, CSS, and JavaScript, preserving their separate interactions. Premium access is not a static-site feature: Cloudflare Pages Functions validate MuseAI sign-in, verify PayPal or Stripe subscriptions, and serve Premium artwork from a private R2 bucket. GitHub Pages and other static hosts can preview public galleries but must leave Premium locked.

## Lumen remains Home

`index.html` stays the root entry point and keeps the Lumen Features gallery. MuseAI promotion remains in `museai.html`, linked from the site pages.

## Shared visual layer

MuseAI-wide styles and client-side behavior are shared through `assets/css/main.css` and `assets/js/app.js`; each existing page retains its own gallery styles and scripts. The separate `assets/css/paywall.css` and `assets/js/paywall.js` power the verified membership gate.

## Age prompt and support links

The existing client-side date-of-birth prompt is a UI check only, not identity verification or legal compliance. It may reveal optional GitHub Sponsors, Buy Me a Coffee, and NOWPayments support links. Those contributions do not grant Premium; only server-verified PayPal or Stripe subscriptions can do so.
