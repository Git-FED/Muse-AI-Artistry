# Build and validation

The public galleries remain plain HTML, CSS, and JavaScript. To preview them locally, open `index.html` or serve the project with a static server; Premium stays locked in static previews.

Before deployment, run:

```sh
python3 scripts/validate_site.py
python3 scripts/build_pages.py
```

The staging script creates `dist/` for Cloudflare Pages and deliberately excludes the ten Premium WebP files from public static output. Cloudflare Pages Functions are in `functions/` and must be deployed alongside `dist/`; they validate MuseAI sessions, payment subscriptions, and private R2 image access. See [`PAYWALL_SETUP.md`](PAYWALL_SETUP.md).
