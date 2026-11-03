import { stripeReady } from '../../lib/config.js';
import { getSession, json, sameOrigin, randomToken } from '../../lib/core.js';

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request, env)) return json({ error: 'Request origin was not accepted.' }, 403);
  if (!stripeReady(env)) return json({ error: 'Card checkout is not configured for server verification.' }, 503);
  const session = await getSession(request, env);
  if (!session) return json({ error: 'Sign in with MuseAI before checkout.' }, 401);
  const clientReferenceId = randomToken(32);
  await env.APP_KV.put(`stripe-intent:${clientReferenceId}`, JSON.stringify({ userId: session.user.sub, createdAt: Date.now() }), { expirationTtl: 48 * 60 * 60 });
  return json({ clientReferenceId });
}
