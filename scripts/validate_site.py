#!/usr/bin/env python3
"""Validate gallery integrity and the fail-closed Cloudflare Premium setup."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit
import json
import sys

ROOT = Path(__file__).resolve().parents[1]
PROTECTED = {
    f'fed-edu-simple-login-{i}.webp' for i in range(1, 6)
} | {
    f'fed-edu-variation-{i}.webp' for i in range(1, 6)
}
REQUIRED = [
    'index.html', 'museai.html', '404.html', 'support-success.html', 'premium-gate.html', 'corridor.html',
    'assets/css/main.css', 'assets/css/paywall.css', 'assets/js/app.js', 'assets/js/paywall.js',
    'assets/images/favicon.png', 'favicon.ico', 'social-image.png',
    'assets/promo/comic-01-creative-chaos.webp', 'assets/promo/comic-02-ask-before-launch.webp',
    'assets/promo/comic-03-tiny-idea-guard.webp', 'assets/gallery-images/manifest.json',
    'functions/corridor.html.js', 'functions/auth/login.js', 'functions/auth/callback.js',
    'functions/api/session.js', 'functions/api/entitlement.js',
    'functions/api/billing/paypal-intent.js', 'functions/api/billing/paypal-verify.js',
    'functions/api/billing/stripe-intent.js', 'functions/api/billing/stripe-webhook.js',
    'functions/premium-assets/[filename].js', 'functions/lib/core.js', 'functions/lib/entitlement.js',
    'functions/lib/providers.js', 'functions/lib/premium-files.js', 'scripts/build_pages.py',
    'scripts/upload_premium_assets.sh', 'PAYWALL_SETUP.md', 'wrangler.toml'
]
CONTACTS = ('careers@fedpromptly.com', 'support@fedpromptly.com', 'business@fedpromptly.com', 'contact@fedpromptly.com')

class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ids = set()
        self.links = []
        self.assets = []
        self.png_icon = False
        self.ico_icon = False
        self.has_auth = False
        self.has_age_form = False
        self.has_checkout = False
        self.kofi = False
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if attrs.get('id'):
            self.ids.add(attrs['id'])
        if tag == 'a' and attrs.get('href'):
            self.links.append(attrs['href'])
        if tag in {'img', 'script', 'iframe', 'source'} and attrs.get('src'):
            self.assets.append(attrs['src'])
        if tag == 'link' and attrs.get('href'):
            rel = attrs.get('rel', '').lower()
            if rel in {'stylesheet', 'icon', 'shortcut icon', 'apple-touch-icon'}:
                self.assets.append(attrs['href'])
                if 'icon' in rel and attrs['href'].endswith('.png'):
                    self.png_icon = True
                if 'icon' in rel and attrs['href'].endswith('.ico'):
                    self.ico_icon = True
        if attrs.get('id') == 'muse-signin': self.has_auth = True
        if attrs.get('id') == 'age-form': self.has_age_form = True
        if attrs.get('id') == 'checkout-options': self.has_checkout = True
        if 'data-kofi-card' in attrs or 'museai-kofi-button' in attrs: self.kofi = True


def fail(message):
    print('FAIL:', message, file=sys.stderr)
    sys.exit(1)

missing = [name for name in REQUIRED if not (ROOT / name).is_file()]
if missing:
    fail('Missing required files: ' + ', '.join(missing))
problems = []
pages = sorted(ROOT.glob('*.html'))
for page_path in pages:
    html = page_path.read_text(encoding='utf-8')
    parsed = Page()
    try:
        parsed.feed(html)
        parsed.close()
    except Exception as exc:
        problems.append(f'{page_path.name}: HTML parse failed: {exc}')
    if not parsed.png_icon or not parsed.ico_icon:
        problems.append(f'{page_path.name}: missing PNG or ICO favicon reference')
    for email in CONTACTS:
        if f'mailto:{email}' not in html:
            problems.append(f'{page_path.name}: missing contact link mailto:{email}')
    if parsed.kofi or 'storage.ko-fi.com/cdn/widget/Widget_2.js' in html:
        problems.append(f'{page_path.name}: Ko-fi widget markup/script remains')
    if 'id="museai-payment-options"' in html:
        for support_url in ('https://github.com/sponsors/Git-FED', 'https://www.buymeacoffee.com/fedpromptly', 'https://nowpayments.io/payment/?iid=5997958570'):
            if support_url not in html:
                problems.append(f'{page_path.name}: missing existing support link {support_url}')
    if page_path.name != 'premium-gate.html' and ('paypal-button-container-P-4FD24238VX4902214NK2XP2Y' in html or 'stripe-button-container' in html):
        problems.append(f'{page_path.name}: legacy client-only payment control remains outside Premium gate')
    if page_path.name == 'premium-gate.html':
        for required_id in ('muse-signin', 'age-form', 'checkout-options', 'paypal-button-container', 'premium-stripe-button-container'):
            if required_id not in parsed.ids:
                problems.append(f'premium-gate.html: missing required member checkout element #{required_id}')
        if 'do not unlock the gallery' not in html.lower():
            problems.append('premium-gate.html: support-only donations are not clearly separated from membership')
    for link in parsed.links:
        parts = urlsplit(link)
        if parts.scheme or parts.netloc:
            continue
        if parts.path.startswith(('/auth/', '/api/', '/premium-assets/')):
            continue
        target_name = parts.path.lstrip('/')
        if not target_name:
            if parts.fragment and parts.fragment not in parsed.ids:
                problems.append(f'{page_path.name}: missing fragment #{parts.fragment}')
            continue
        target = (ROOT / target_name).resolve()
        if not target.is_file():
            problems.append(f'{page_path.name}: broken local link {link}')
        elif parts.fragment and target.suffix.lower() == '.html':
            target_parser = Page()
            target_parser.feed(target.read_text(encoding='utf-8'))
            if parts.fragment not in target_parser.ids:
                problems.append(f'{page_path.name}: missing target {link}')
    for src in parsed.assets:
        parts = urlsplit(src)
        if parts.scheme or parts.netloc or not parts.path:
            continue
        target = (ROOT / parts.path.lstrip('/')).resolve()
        if not target.is_file():
            problems.append(f'{page_path.name}: missing local asset {src}')

for filename in PROTECTED:
    if not (ROOT / 'assets/gallery-images' / filename).is_file():
        problems.append(f'Source Premium image is missing: {filename}')
    if f'/premium-assets/{filename}' not in (ROOT / 'corridor.html').read_text(encoding='utf-8'):
        problems.append(f'corridor.html does not use private media route for {filename}')
index = (ROOT / 'index.html').read_text(encoding='utf-8')
if index.count('"premium": true') != len(PROTECTED):
    problems.append('index.html must mark all ten private Premium images for entitlement-aware loading')
if 'fetch(\'/api/entitlement\'' not in index:
    problems.append('index.html does not check server entitlement before showing private Premium studies')

app_js = (ROOT / 'assets/js/app.js').read_text(encoding='utf-8')
if 'paypal.com/sdk' in app_js or 'js.stripe.com' in app_js:
    problems.append('assets/js/app.js still loads unverified membership payment buttons')
if 'storage.ko-fi.com/cdn/widget/Widget_2.js' in app_js or 'kofiwidget2' in app_js:
    problems.append('assets/js/app.js: Ko-fi loader remains')
webhook = (ROOT / 'functions/api/billing/stripe-webhook.js').read_text(encoding='utf-8')
if 'stripe-signature' not in webhook or 'STRIPE_EXPECTED_PRICE_ID' not in webhook or 'verifySignature' not in webhook:
    problems.append('Stripe webhook is missing signature or expected-price verification')
paypal_verify = (ROOT / 'functions/api/billing/paypal-verify.js').read_text(encoding='utf-8')
if 'subscription.custom_id !== customId' not in paypal_verify or "subscription.status !== 'ACTIVE'" not in paypal_verify:
    problems.append('PayPal verification is missing one-time intent or active-subscription checks')

manifest = json.loads((ROOT / 'assets/gallery-images/manifest.json').read_text(encoding='utf-8'))
entries = manifest if isinstance(manifest, list) else manifest.get('images', manifest.get('items', []))
if len(entries) != 96:
    problems.append(f'Source gallery manifest expected 96 entries; found {len(entries)}')
for entry in entries:
    filename = (entry.get('src') or entry.get('filename') or entry.get('file')) if isinstance(entry, dict) else entry
    if not isinstance(filename, str):
        problems.append(f'Gallery manifest has an invalid image entry: {entry!r}')
        continue
    candidate = Path(filename.lstrip('./'))
    target = ROOT / candidate if candidate.parts and candidate.parts[0] == 'assets' else ROOT / 'assets/gallery-images' / candidate.name
    if not target.is_file():
        problems.append(f'Gallery manifest references missing source asset {filename}')
if len(list((ROOT / 'assets/gallery-images').glob('*.webp'))) != 96:
    problems.append('Original source gallery WebP count changed from 96')

if (ROOT / 'dist').is_dir():
    public_files = list((ROOT / 'dist/assets/gallery-images').glob('*.webp'))
    if len(public_files) != 86:
        problems.append(f'dist should contain 86 public gallery WebP files, found {len(public_files)}')
    leaked = [name for name in PROTECTED if (ROOT / 'dist/assets/gallery-images' / name).exists()]
    if leaked:
        problems.append('Premium source images leaked into public dist: ' + ', '.join(sorted(leaked)))

if problems:
    for problem in problems:
        print('FAIL:', problem, file=sys.stderr)
    sys.exit(1)
print(f'PASS: validated {len(pages)} HTML pages, local links/assets, fail-closed membership routes, payment verification, and all 96 source gallery images.')
