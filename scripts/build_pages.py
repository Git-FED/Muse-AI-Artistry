#!/usr/bin/env python3
"""Stage public Cloudflare Pages files without bundling gallery or Premium artwork."""
from pathlib import Path
import json
import shutil

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / 'dist'
PLACEHOLDER = 'gallery-placeholder.webp'
PROTECTED = {
    f'fed-edu-simple-login-{i}.webp' for i in range(1, 6)
} | {
    f'fed-edu-variation-{i}.webp' for i in range(1, 6)
}
GALLERY = ROOT / 'assets/gallery-images'

placeholder_path = GALLERY / PLACEHOLDER
if not placeholder_path.is_file():
    raise SystemExit(f'Required gallery placeholder is missing: {placeholder_path}')
source_images = sorted(path.name for path in GALLERY.glob('*.webp'))
if source_images != [PLACEHOLDER]:
    raise SystemExit(f'Only {PLACEHOLDER} may be bundled in assets/gallery-images/; found {source_images}.')
if any((GALLERY / name).exists() for name in PROTECTED):
    raise SystemExit('Premium source images must not be bundled; supply replacements separately to private R2.')
manifest_path = GALLERY / 'manifest.json'
manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
entries = manifest if isinstance(manifest, list) else manifest.get('images', manifest.get('items', []))
if len(entries) != 1:
    raise SystemExit('Gallery manifest must contain exactly one placeholder entry.')
entry = entries[0]
source = (entry.get('src') or entry.get('filename') or entry.get('file')) if isinstance(entry, dict) else entry
if source not in {PLACEHOLDER, f'assets/gallery-images/{PLACEHOLDER}'}:
    raise SystemExit(f'Gallery manifest must point to {PLACEHOLDER}; found {source!r}.')

if DIST.exists():
    shutil.rmtree(DIST)
DIST.mkdir(parents=True)

for pattern in ('*.html', '*.css', '*.ico', '*.png', '*.txt'):
    for source_file in ROOT.glob(pattern):
        shutil.copy2(source_file, DIST / source_file.name)

for directory in ('assets', 'components', 'data'):
    source_dir = ROOT / directory
    if not source_dir.is_dir():
        continue
    for source_file in source_dir.rglob('*'):
        if not source_file.is_file():
            continue
        if source_file.name in PROTECTED:
            continue
        relative = source_file.relative_to(ROOT)
        target = DIST / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source_file, target)

routes = {
    'version': 1,
    'include': ['/corridor.html', '/auth/*', '/api/*', '/premium-assets/*'],
    'exclude': []
}
(DIST / '_routes.json').write_text(json.dumps(routes, indent=2) + '\n', encoding='utf-8')

published = sorted(path.name for path in (DIST / 'assets/gallery-images').glob('*.webp'))
if published != [PLACEHOLDER]:
    raise SystemExit(f'Expected only the gallery placeholder in public output; found {published}.')
if any((DIST / 'assets/gallery-images' / name).exists() for name in PROTECTED):
    raise SystemExit('A Premium image was copied into public static assets.')
print(f'Staged {DIST} with one public gallery placeholder; Premium content remains private and is supplied separately to R2.')
