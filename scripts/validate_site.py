#!/usr/bin/env python3
"""Lightweight validation for the static MuseAI/Lumen site."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit
import json
import sys

ROOT = Path(__file__).resolve().parents[1]
REQUIRED = [
    'index.html', 'museai.html', '404.html', 'support-success.html',
    'assets/css/main.css', 'assets/js/app.js', 'assets/images/favicon.png',
    'favicon.ico', 'social-image.png',
    'assets/promo/comic-01-creative-chaos.webp',
    'assets/promo/comic-02-ask-before-launch.webp',
    'assets/promo/comic-03-tiny-idea-guard.webp',
]

class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ids = set()
        self.links = []
        self.assets = []
        self.has_favicon_png = False
        self.has_favicon_ico = False
        self.payment_gate = False
        self.age_form = False
        self.kofi_widget = False
        self.paypal_container = False
        self.stripe_container = False
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if attrs.get('id'):
            self.ids.add(attrs['id'])
        if tag == 'a' and attrs.get('href'):
            self.links.append(attrs['href'])
        if tag in {'img','script','iframe','source'} and attrs.get('src'):
            self.assets.append(attrs['src'])
        if tag == 'link' and attrs.get('href'):
            rel = attrs.get('rel','').lower()
            if rel in {'stylesheet','icon','shortcut icon','apple-touch-icon'}:
                self.assets.append(attrs['href'])
                if 'icon' in rel and attrs['href'].endswith('.png'):
                    self.has_favicon_png = True
                if 'icon' in rel and attrs['href'].endswith('.ico'):
                    self.has_favicon_ico = True
        if attrs.get('id') == 'museai-payment-options' and 'hidden' in attrs:
            self.payment_gate = True
        if attrs.get('id') == 'museai-age-form':
            self.age_form = True
        if attrs.get('id') == 'paypal-button-container-P-4FD24238VX4902214NK2XP2Y':
            self.paypal_container = True
        if attrs.get('id') == 'stripe-button-container':
            self.stripe_container = True
        if 'data-kofi-card' in attrs or 'museai-kofi-button' in attrs:
            self.kofi_widget = True

def fail(message):
    print('FAIL:', message, file=sys.stderr)
    sys.exit(1)

missing = [item for item in REQUIRED if not (ROOT/item).is_file()]
if missing:
    fail('Missing required files: ' + ', '.join(missing))
pages = sorted(ROOT.glob('*.html'))
if not pages:
    fail('No root HTML pages found')
problems = []
for page_path in pages:
    html = page_path.read_text(encoding='utf-8')
    parsed = Page()
    try:
        parsed.feed(html)
        parsed.close()
    except Exception as exc:
        problems.append(f'{page_path.name}: HTML parse failed: {exc}')
    if not parsed.has_favicon_png or not parsed.has_favicon_ico:
        problems.append(f'{page_path.name}: missing PNG or ICO favicon reference')
    for email in ('careers@fedpromptly.com', 'support@fedpromptly.com', 'business@fedpromptly.com', 'contact@fedpromptly.com'):
        if f'mailto:{email}' not in html:
            problems.append(f'{page_path.name}: missing contact link {email}')
    if parsed.kofi_widget or 'storage.ko-fi.com/cdn/widget/Widget_2.js' in html:
        problems.append(f'{page_path.name}: Ko-fi widget markup/script remains')
    if parsed.paypal_container or parsed.stripe_container:
        if not parsed.payment_gate or not parsed.age_form or 'museai-support-panel' not in html:
            problems.append(f'{page_path.name}: payment controls are not behind the age gate')
    for link in parsed.links:
        parts = urlsplit(link)
        if parts.scheme or parts.netloc:
            continue
        target_name = parts.path
        if not target_name:
            if parts.fragment and parts.fragment not in parsed.ids:
                problems.append(f'{page_path.name}: missing fragment #{parts.fragment}')
            continue
        target = (page_path.parent / target_name).resolve()
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
        target = (page_path.parent / parts.path).resolve()
        if not target.is_file():
            problems.append(f'{page_path.name}: missing local asset {src}')

js = (ROOT/'assets/js/app.js').read_text(encoding='utf-8')
if 'storage.ko-fi.com/cdn/widget/Widget_2.js' in js or 'kofiwidget2' in js:
    problems.append('assets/js/app.js: Ko-fi widget loader remains')
if 'support-success.html?provider=paypal' not in js:
    problems.append('assets/js/app.js: PayPal approval does not route to HTML success page')
manifest = json.loads((ROOT/'assets/gallery-images/manifest.json').read_text(encoding='utf-8'))
entries = manifest if isinstance(manifest, list) else manifest.get('images', manifest.get('items', []))
if len(entries) != 96:
    problems.append(f'Gallery manifest expected 96 entries; found {len(entries)}')
for entry in entries:
    filename = (entry.get('src') or entry.get('filename') or entry.get('file')) if isinstance(entry, dict) else entry
    if not isinstance(filename, str):
        problems.append(f'Gallery manifest has an invalid image entry: {entry!r}')
        continue
    candidate = Path(filename.lstrip('./'))
    target = ROOT/candidate if candidate.parts and candidate.parts[0] == 'assets' else ROOT/'assets/gallery-images'/candidate.name
    if not target.is_file():
        problems.append(f'Gallery manifest references missing asset {filename}')
if len(list((ROOT/'assets/gallery-images').glob('*.webp'))) != 96:
    problems.append('Original gallery WebP asset count changed from 96')
if problems:
    for problem in problems:
        print('FAIL:', problem, file=sys.stderr)
    sys.exit(1)
print(f'PASS: validated {len(pages)} HTML pages, local links/assets, age-gated payment panels, favicon coverage, and all 96 original gallery images.')
