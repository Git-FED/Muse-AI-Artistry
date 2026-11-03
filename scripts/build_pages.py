#!/usr/bin/env python3
"""Stage the public Cloudflare Pages files without publishing private Premium art."""
from pathlib import Path
import json
import shutil

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / 'dist'
PROTECTED = {
    f'fed-edu-simple-login-{i}.webp' for i in range(1, 6)
} | {
    f'fed-edu-variation-{i}.webp' for i in range(1, 6)
}

if not all((ROOT / 'assets/gallery-images' / name).is_file() for name in PROTECTED):
    raise SystemExit('A required Premium image is missing from assets/gallery-images/.')
if DIST.exists():
    shutil.rmtree(DIST)
DIST.mkdir(parents=True)

for pattern in ('*.html', '*.css', '*.ico', '*.png', '*.txt'):
    for source in ROOT.glob(pattern):
        shutil.copy2(source, DIST / source.name)

for directory in ('assets', 'components', 'data'):
    source_dir = ROOT / directory
    if not source_dir.is_dir():
        continue
    for source in source_dir.rglob('*'):
        if not source.is_file():
            continue
        if source.name in PROTECTED:
            continue
        relative = source.relative_to(ROOT)
        target = DIST / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        if source.as_posix().endswith('assets/gallery-images/manifest.json'):
            manifest = json.loads(source.read_text(encoding='utf-8'))
            entries = manifest if isinstance(manifest, list) else manifest.get('images', manifest.get('items', []))
            filtered = []
            for entry in entries:
                filename = (entry.get('filename') or entry.get('src') or entry.get('file')) if isinstance(entry, dict) else entry
                if isinstance(filename, str) and Path(filename).name in PROTECTED:
                    continue
                filtered.append(entry)
            if isinstance(manifest, list):
                manifest = filtered
            else:
                key = 'images' if 'images' in manifest else ('items' if 'items' in manifest else None)
                if key:
                    manifest[key] = filtered
            target.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        else:
            shutil.copy2(source, target)

routes = {
    'version': 1,
    'include': ['/corridor.html', '/auth/*', '/api/*', '/premium-assets/*'],
    'exclude': []
}
(DIST / '_routes.json').write_text(json.dumps(routes, indent=2) + '\n', encoding='utf-8')

published = [path.name for path in (DIST / 'assets/gallery-images').glob('*.webp')]
if len(published) != 86:
    raise SystemExit(f'Expected 86 public gallery WebP files after Premium split; found {len(published)}.')
if any((DIST / 'assets/gallery-images' / name).exists() for name in PROTECTED):
    raise SystemExit('A Premium image was copied into public static assets.')
print(f'Staged {DIST} with {len(published)} public gallery WebP files; 10 Premium originals remain private for the R2 bucket.')
