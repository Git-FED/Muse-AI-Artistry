import { getSession, text } from '../lib/core.js';
import { hasPremium } from '../lib/entitlement.js';
import { PREMIUM_FILES } from '../lib/premium-files.js';

export async function onRequestGet({ request, env, params }) {
  const filename = String(params.filename || '');
  if (!PREMIUM_FILES.has(filename)) return text('Not found.', 404);
  const session = await getSession(request, env);
  if (!session || !await hasPremium(env, session.user.sub)) return text('Premium membership required.', 403);
  if (!env.PREMIUM_MEDIA) return text('Premium media storage is not configured.', 503);
  const object = await env.PREMIUM_MEDIA.get(filename);
  if (!object) return text('Premium media is not available.', 404);
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('content-type', 'image/webp');
  headers.set('cache-control', 'private, no-store, max-age=0');
  headers.set('x-content-type-options', 'nosniff');
  headers.set('cross-origin-resource-policy', 'same-origin');
  headers.set('vary', 'cookie');
  return new Response(object.body, { headers });
}
