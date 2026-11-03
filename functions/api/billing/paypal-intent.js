import { paypalConfig, paypalReady } from '../../lib/config.js';
import { getSession, json, sameOrigin, randomToken } from '../../lib/core.js';

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request, env)) return json({ error: 'Request origin was not accepted.' }, 403);
  if (!paypalReady(env)) return json({ error: 'PayPal membership checkout is not configured.' }, 503);
  const session = await getSession(request, env);
  if (!session) return json({ error: 'Sign in with MuseAI before checkout.' }, 401);
  const ref = randomToken(32);
  await env.APP_KV.put(`paypal-intent:${ref}`, JSON.stringify({ userId: session.user.sub, createdAt: Date.now() }), { expirationTtl: 48 * 60 * 60 });
  return json({ customId: ref, planId: paypalConfig(env).planId });
}
