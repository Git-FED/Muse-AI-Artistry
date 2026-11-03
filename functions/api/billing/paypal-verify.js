import { paypalConfig, paypalReady } from '../../lib/config.js';
import { getSession, json, readJson, sameOrigin } from '../../lib/core.js';
import { entitlementKey } from '../../lib/entitlement.js';
import { getPaypalSubscription } from '../../lib/providers.js';

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request, env)) return json({ error: 'Request origin was not accepted.' }, 403);
  if (!paypalReady(env)) return json({ error: 'PayPal verification is not configured.' }, 503);
  const session = await getSession(request, env);
  if (!session) return json({ error: 'Sign in with MuseAI before confirming membership.' }, 401);
  let body;
  try { body = await readJson(request); } catch (_) { return json({ error: 'Invalid request.' }, 400); }
  const subscriptionId = String(body.subscriptionID || '');
  const customId = String(body.customId || '');
  if (!/^[A-Za-z0-9_-]{8,128}$/.test(subscriptionId) || !/^[A-Za-z0-9_-]{32,128}$/.test(customId)) return json({ error: 'PayPal confirmation was incomplete.' }, 400);
  const intentKey = `paypal-intent:${customId}`;
  const intent = await env.APP_KV.get(intentKey, { type: 'json' });
  if (!intent || intent.userId !== session.user.sub || Date.now() - intent.createdAt > 48 * 60 * 60 * 1000) return json({ error: 'PayPal checkout could not be linked to this signed-in account.' }, 403);
  const used = await env.APP_KV.get(`paypal-used-intent:${customId}`, { type: 'json' });
  if (used && (used.userId !== session.user.sub || used.subscriptionId !== subscriptionId)) return json({ error: 'This PayPal checkout intent has already been used.' }, 409);

  try {
    const subscription = await getPaypalSubscription(env, subscriptionId);
    const cfg = paypalConfig(env);
    if (subscription.plan_id !== cfg.planId || subscription.custom_id !== customId) return json({ error: 'PayPal subscription does not match this membership checkout.' }, 403);
    if (subscription.status !== 'ACTIVE') return json({ error: 'PayPal has not confirmed an active subscription yet. Please try again shortly.' }, 409);
    const record = {
      provider: 'paypal',
      subscriptionId,
      customId,
      planId: cfg.planId,
      status: 'active',
      verifiedAt: Date.now()
    };
    await env.APP_KV.put(entitlementKey(session.user.sub, 'paypal', subscriptionId), JSON.stringify(record));
    await env.APP_KV.put(`paypal-used-intent:${customId}`, JSON.stringify({ userId: session.user.sub, subscriptionId }), { expirationTtl: 48 * 60 * 60 });
    return json({ ok: true, premium: true });
  } catch (_) {
    return json({ error: 'PayPal could not verify the subscription. Premium remains locked.' }, 502);
  }
}
