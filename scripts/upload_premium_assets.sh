#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUCKET="${PREMIUM_MEDIA_BUCKET:-museai-premium-media}"
SOURCE_DIR="${PREMIUM_IMAGE_SOURCE_DIR:-${ROOT}/premium-upload}"
FILES=(
  fed-edu-simple-login-1.webp fed-edu-simple-login-2.webp fed-edu-simple-login-3.webp
  fed-edu-simple-login-4.webp fed-edu-simple-login-5.webp
  fed-edu-variation-1.webp fed-edu-variation-2.webp fed-edu-variation-3.webp
  fed-edu-variation-4.webp fed-edu-variation-5.webp
)

missing=()
for file in "${FILES[@]}"; do
  [[ -f "${SOURCE_DIR}/${file}" ]] || missing+=("${SOURCE_DIR}/${file}")
done
if ((${#missing[@]})); then
  printf 'Missing Premium replacement file(s):\n' >&2
  printf '  %s\n' "${missing[@]}" >&2
  printf '\nPlace all ten owner-supplied WebP files in %s or set PREMIUM_IMAGE_SOURCE_DIR.\n' "$SOURCE_DIR" >&2
  exit 1
fi

for file in "${FILES[@]}"; do
  npx wrangler r2 object put "${BUCKET}/${file}" --file "${SOURCE_DIR}/${file}" --remote
done

echo "Uploaded ${#FILES[@]} owner-supplied Premium replacements into private bucket ${BUCKET}. Do not enable public bucket access."
