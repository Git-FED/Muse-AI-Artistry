import { stripeReady } from '../../lib/config.js';
import { json } from '../../lib/core.js';
import { entitlementKey } from '../../lib/entitlement.js';
import { getStripeCheckoutSession, getStripeSubscription } from '../../lib/providers.js';

const ACTIVE = new Set(['active', 'trialing']);
const encoder = new TextEncoder();

async function hmac(value, secret) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const bytes = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value)));
  return [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

async function verifySignature(raw, header, secret) {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(header.split(',').map(item => item.split('=')));
  const timestamp = Number(parts.t);
  if (!Number.isFinite(timestamp) || Math.abs(Date.now() / 1000 - timestamp) > 300) return false;
  const expected = await hmac(`${timestamp}.${raw}`, secret);
  const signatures = header.split(',').filter(part => part.startsWith('v1=')).map(part => part.slice(3));
  return signatures.some(signature => safeEqual(signature, expected));
}

async function saveSubscription(env, userId, subscriptionId, status) {
  const key = entitlementKey(userId, 'stripe', subscriptionId);
  await env.APP_KV.put(key, JSON.stringify({ provider: 'stripe', subscriptionId, status: ACTIVE.has(status) ? 'active' : 'inactive', verifiedAt: Date.now() }));
}

async function processCheckout(env, eventObject) {
  if (!eventObject.id) return;
  const session = await getStripeCheckoutSession(env, eventObject.id);
  const reference = session.client_reference_id;
  if (!reference || !/^\w{32,128}$/.test(reference) || session.mode !== 'subscription' || session.status !== 'complete') return;
  const intentKey = `stripe-intent:${reference}`;
  const intent = await env.APP_KV.get(intentKey, { type: 'json' });
  if (!intent?.userId || Date.now() - intent.createdAt > 48 * 60 * 60 * 1000) return;
  if (!['paid', 'no_payment_required'].includes(session.payment_status)) return;
  const priceIds = (session.line_items?.data || []).map(item => typeof item.price === 'string' ? item.price : item.price?.id).filter(Boolean);
  if (!priceIds.includes(env.STRIPE_EXPECTED_PRICE_ID)) return;

  let subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
  if (!subscriptionId) return;
  const subscription = await getStripeSubscription(env, subscriptionId);
  await env.APP_KV.put(`stripe-sub:${subscriptionId}`, JSON.stringify({ userId: intent.userId, reference }), { expirationTtl: 400 * 24 * 60 * 60 });
  await saveSubscription(env, intent.userId, subscriptionId, subscription.status);
}

async function updateSubscription(env, object) {
  const subscriptionId = object?.id || object?.subscription;
  if (!subscriptionId || !/^sub_[A-Za-z0-9]+$/.test(subscriptionId)) return;
  const mapping = await env.APP_KV.get(`stripe-sub:${subscriptionId}`, { type: 'json' });
  if (!mapping?.userId) return;
  let subscription;
  try { subscription = await getStripeSubscription(env, subscriptionId); }
  catch (_) { return; }
  const priceIds = (subscription.items?.data || []).map(line => typeof line.price === 'string' ? line.price : line.price?.id).filter(Boolean);
  const state = ACTIVE.has(subscription.status) && priceIds.includes(env.STRIPE_EXPECTED_PRICE_ID) ? subscription.status : 'inactive';
  await saveSubscription(env, mapping.userId, subscriptionId, state);
}

export async function onRequestPost({ request, env }) {
  if (!stripeReady(env)) return json({ error: 'Stripe webhook is not configured.' }, 503);
  const raw = await request.text();
  if (raw.length > 1_000_000) return json({ error: 'Webhook body is too large.' }, 413);
  if (!await verifySignature(raw, request.headers.get('stripe-signature'), env.STRIPE_WEBHOOK_SECRET)) return json({ error: 'Invalid Stripe signature.' }, 400);
  let event;
  try { event = JSON.parse(raw); } catch (_) { return json({ error: 'Invalid event body.' }, 400); }
  try {
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      await processCheckout(env, event.data?.object || {});
    } else if (['customer.subscription.updated', 'customer.subscription.deleted', 'invoice.paid', 'invoice.payment_failed'].includes(event.type)) {
      await updateSubscription(env, event.data?.object || {});
    }
  } catch (_) {
    // Respond with a retryable server error so Stripe can retry transient verification/storage failures.
    return json({ error: 'Stripe event could not be processed.' }, 500);
  }
  return json({ received: true });
}
