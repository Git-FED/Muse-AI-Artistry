#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUCKET="${PREMIUM_MEDIA_BUCKET:-museai-premium-media}"
FILES=(
  fed-edu-simple-login-1.webp fed-edu-simple-login-2.webp fed-edu-simple-login-3.webp
  fed-edu-simple-login-4.webp fed-edu-simple-login-5.webp
  fed-edu-variation-1.webp fed-edu-variation-2.webp fed-edu-variation-3.webp
  fed-edu-variation-4.webp fed-edu-variation-5.webp
)

for file in "${FILES[@]}"; do
  npx wrangler r2 object put "${BUCKET}/${file}" --file "${ROOT}/assets/gallery-images/${file}" --remote
done

echo "Uploaded ${#FILES[@]} Premium images into private bucket ${BUCKET}. Do not enable public bucket access."
