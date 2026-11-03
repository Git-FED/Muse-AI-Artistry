# Install / run locally

Download or clone the repository, then open `index.html` in a browser or serve the directory with a static web server. A local server is recommended because browser restrictions can differ for local files. Keep the `assets/gallery-images/` folder beside the HTML files; it contains the single bundled gallery placeholder used until Cloudflare-hosted replacements are connected. The favicon and UI styling assets remain bundled.

Premium remains locked in static previews. The Premium photo originals are not included; to show Premium artwork in production, provide the ten replacement WebP files and upload them to the private R2 bucket as described in [`PAYWALL_SETUP.md`](PAYWALL_SETUP.md). Do not publish until the support providers' amounts, account ownership, and terms are confirmed.
