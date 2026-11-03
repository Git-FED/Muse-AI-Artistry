# Build and validation

The public galleries remain plain HTML, CSS, and JavaScript. To preview them locally, open `index.html` or serve the project with a static server; Premium stays locked in static previews. Gallery cards share the single bundled `assets/gallery-images/gallery-placeholder.webp` until the owner connects hosted replacements. The favicon files, styling, navigation, and local interactions remain in place.

Before deployment, run:

```sh
python3 scripts/validate_site.py
python3 scripts/build_pages.py
```

The staging script creates `dist/` for Cloudflare Pages and includes only the placeholder, not the removed gallery/photo collection or any Premium images. Cloudflare Pages Functions are in `functions/` and must be deployed alongside `dist/`; they validate MuseAI sessions, payment subscriptions, and private R2 image access. Owner-supplied Premium replacements belong in `premium-upload/` (or the folder set in `PREMIUM_IMAGE_SOURCE_DIR`) and must be uploaded separately to private R2 with `scripts/upload_premium_assets.sh`. See [`PAYWALL_SETUP.md`](PAYWALL_SETUP.md).
