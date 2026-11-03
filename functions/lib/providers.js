import { paypalConfig } from './config.js';

async function paypalAccessToken(env) {
  const cfg = paypalConfig(env);
  if (!env.PAYPAL_REST_CLIENT_ID || !env.PAYPAL_REST_CLIENT_SECRET || !cfg.apiBase) throw new Error('PayPal verification is not configured.');
  if (!['https://api-m.paypal.com', 'https://api-m.sandbox.paypal.com'].includes(cfg.apiBase)) throw new Error('PayPal API host is invalid.');
  const credentials = btoa(`${env.PAYPAL_REST_CLIENT_ID}:${env.PAYPAL_REST_CLIENT_SECRET}`);
  const response = await fetch(`${cfg.apiBase}/v1/oauth2/token`, {
    method: 'POST',
    headers: { authorization: `Basic ${credentials}`, 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
    body: 'grant_type=client_credentials'
  });
  if (!response.ok) throw new Error('PayPal could not issue a verification token.');
  const token = await response.json();
  if (!token.access_token) throw new Error('PayPal verification token was missing.');
  return { token: token.access_token, apiBase: cfg.apiBase };
}

export async function getPaypalSubscription(env, subscriptionId) {
  if (!/^[A-Za-z0-9_-]{8,128}$/.test(subscriptionId || '')) throw new Error('Invalid PayPal subscription ID.');
  const { token, apiBase } = await paypalAccessToken(env);
  const response = await fetch(`${apiBase}/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}`, {
    headers: { authorization: `Bearer ${token}`, accept: 'application/json' }
  });
  if (!response.ok) throw new Error('PayPal subscription could not be verified.');
  return response.json();
}

export async function getStripeSubscription(env, subscriptionId) {
  if (!env.STRIPE_SECRET_KEY || !/^sub_[A-Za-z0-9]+$/.test(subscriptionId || '')) throw new Error('Invalid Stripe subscription ID or missing credentials.');
  const response = await fetch(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(subscriptionId)}`, {
    headers: { authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, accept: 'application/json' }
  });
  if (!response.ok) throw new Error('Stripe subscription could not be verified.');
  return response.json();
}

export async function getStripeCheckoutSession(env, sessionId) {
  if (!env.STRIPE_SECRET_KEY || !/^cs_[A-Za-z0-9_]+$/.test(sessionId || '')) throw new Error('Invalid Stripe checkout session ID.');
  const url = new URL(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`);
  url.searchParams.append('expand[]', 'subscription');
  url.searchParams.append('expand[]', 'line_items.data.price');
  const response = await fetch(url, { headers: { authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, accept: 'application/json' } });
  if (!response.ok) throw new Error('Stripe checkout session could not be verified.');
  const session = await response.json();
  if (!session.line_items?.data) {
    const itemsUrl = new URL(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}/line_items`);
    itemsUrl.searchParams.set('limit', '100');
    const itemsResponse = await fetch(itemsUrl, { headers: { authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, accept: 'application/json' } });
    if (!itemsResponse.ok) throw new Error('Stripe checkout items could not be verified.');
    session.line_items = await itemsResponse.json();
  }
  return session;
}
