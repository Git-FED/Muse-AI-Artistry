import { userKey } from './core.js';
import { paypalConfig, paypalReady, stripeReady } from './config.js';
import { getPaypalSubscription, getStripeSubscription } from './providers.js';

const CHECK_INTERVAL_MS = 5 * 60 * 1000;
const ACTIVE_STRIPE = new Set(['active', 'trialing']);

export async function hasPremium(env, userId) {
  if (!env.APP_KV || !userId) return false;
  const prefix = `ent:${userKey(userId)}:`;
  let page = await env.APP_KV.list({ prefix, limit: 100 });
  const keys = [...page.keys];
  while (page.list_complete === false && keys.length < 500) {
    page = await env.APP_KV.list({ prefix, limit: 100, cursor: page.cursor });
    keys.push(...page.keys);
  }
  for (const item of keys) {
    const record = await env.APP_KV.get(item.name, { type: 'json' });
    if (!record || record.status !== 'active') continue;
    if (record.expiresAt && record.expiresAt <= Date.now()) continue;
    if (record.provider === 'paypal' && !paypalReady(env)) continue;
    if (record.provider === 'stripe' && !stripeReady(env)) continue;
    if (Date.now() - (record.verifiedAt || 0) < CHECK_INTERVAL_MS) return true;
    try {
      if (record.provider === 'paypal') {
        const cfg = paypalConfig(env);
        if (!env.PAYPAL_REST_CLIENT_ID || !env.PAYPAL_REST_CLIENT_SECRET || !cfg.apiBase) continue;
        const subscription = await getPaypalSubscription(env, record.subscriptionId);
        const active = subscription.status === 'ACTIVE' &&
          subscription.plan_id === cfg.planId &&
          subscription.custom_id === record.customId;
        const updated = { ...record, status: active ? 'active' : 'inactive', verifiedAt: Date.now() };
        await env.APP_KV.put(item.name, JSON.stringify(updated));
        if (active) return true;
      } else if (record.provider === 'stripe') {
        if (!stripeReady(env)) continue;
        const subscription = await getStripeSubscription(env, record.subscriptionId);
        const priceIds = (subscription.items?.data || []).map(line => typeof line.price === 'string' ? line.price : line.price?.id).filter(Boolean);
        const active = ACTIVE_STRIPE.has(subscription.status) && priceIds.includes(env.STRIPE_EXPECTED_PRICE_ID);
        const updated = { ...record, status: active ? 'active' : 'inactive', verifiedAt: Date.now() };
        await env.APP_KV.put(item.name, JSON.stringify(updated));
        if (active) return true;
      }
    } catch (_) {
      // Fail closed: a stale entitlement is not accepted if the provider cannot confirm it.
    }
  }
  return false;
}

export function entitlementKey(userId, provider, subscriptionId) {
  return `ent:${userKey(userId)}:${provider}:${encodeURIComponent(subscriptionId)}`;
}
