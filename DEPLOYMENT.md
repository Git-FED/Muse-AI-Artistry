# Deployment

## Recommended: GitHub Actions → Cloudflare Pages

This is a static site; no build step is required. The workflow at `.github/workflows/deploy-cloudflare.yml` validates the site and deploys the repository root to Cloudflare Pages on pushes to `main` (or when manually dispatched).

1. In Cloudflare, create a Pages project named `museai-gallery` using **Direct Upload**. The workflow expects this exact project name.
2. Create a Cloudflare account API token with **Account → Cloudflare Pages → Edit** permission.
3. In the GitHub repository, add Actions secrets named `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
4. Push to `main`, or run **Deploy Cloudflare Pages** from the Actions tab. The workflow uploads the repository root, including all HTML pages, assets, and the custom `404.html`.
5. In Cloudflare Pages, attach the custom domain if desired and verify the root page, `museai.html`, the payment age gate, and gallery assets.

The site is not deployed by this archive upgrade. Cloudflare credentials are intentionally not included in the repository.

## Optional: GitHub Pages fallback

`.github/workflows/deploy.yml` remains available as a **manual-only** fallback. Select GitHub Actions in repository Settings → Pages, then manually run the workflow when you want a GitHub Pages copy. It is not triggered automatically, to avoid two simultaneous production destinations.

## Payment return page

PayPal approval in the site routes to `support-success.html`. Stripe Buy Button post-payment redirects are configured in the Stripe dashboard for the Buy Button/payment link; if you want a matching HTML return, set its confirmation redirect to your deployed `support-success.html` URL. The age check is a client-side date-of-birth gate only, not identity verification or a substitute for applicable legal/provider requirements.

## Validation

Run `python3 scripts/validate_site.py` before deployment. The GitHub build workflow runs this same check on pushes and pull requests.
