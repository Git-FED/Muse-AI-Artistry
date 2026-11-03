# MuseAI — creative systems archive

<video src="https://github.com/user-attachments/assets/d029f65c-ad8b-4ec0-9fee-c6f8f49f99fa" controls muted width="100%"></video>
A visual archive of creative AI concepts, imagined interfaces, and ideas in motion. This is a static site built from HTML, CSS, and JavaScript, with nine interactive galleries and local image assets.

## Start here

- **Features:** [`index.html`](index.html) is the default gallery.
- **MuseAI promo:** [`museai.html`](museai.html) is preserved as a separate promotional page.
- **Gallery tabs:** Features, Exclusives, Feed, Explore, Avatars, Projects, Premium, Profile, and Portfolio.

## Run locally

Open `index.html` or serve the repository with a static HTTP server. Keep `assets/gallery-images/` alongside the pages. No build step or npm dependencies are required.

## Deploy

Cloudflare Pages is the primary GitHub-triggered deployment target via `.github/workflows/deploy-cloudflare.yml`. Create a Cloudflare Pages project named `museai-gallery` and add the required GitHub Actions secrets; a manual GitHub Pages fallback remains available. See [`DEPLOYMENT.md`](DEPLOYMENT.md).

## Support widgets and age check

PayPal, Stripe, and Buy Me a Coffee options appear only after a visitor enters a date of birth showing they are 18 or older. The Ko-fi site widget has been removed; GitHub funding metadata is separate. The DOB is checked in the browser and is not saved or sent by this site; only a yes/no session flag is retained. **This lightweight client-side check is not identity verification and does not establish legal compliance.** Confirm actual payment terms with the provider accounts before launch. No prices are advertised in this repository.

## Social preview and favicon

`social-image.png` is the requested 1280×640 GitHub preview artwork. To show it on GitHub, open repository Settings → General → Social preview and upload this image. All pages reference both `assets/images/favicon.png` and the root `favicon.ico`.

## Contact

`careers@fedpromptly.com` · `support@fedpromptly.com` · `business@fedpromptly.com` · `contact@fedpromptly.com`

## Project documents

See `SUMMARY.md`, `BUILD.md`, `INSTALL.md`, `usage.md`, `FAQ.md`, `SUPPORT.md`, `ROADMAP.md`, and `SECURITY.md`.
