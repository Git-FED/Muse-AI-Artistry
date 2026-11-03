import { DEFAULTS, oauthReady, paypalConfig, paypalReady, siteOrigin, stripeConfig, stripeReady } from '../lib/config.js';
import { json } from '../lib/core.js';

export async function onRequestGet({ env }) {
  const paypal = paypalConfig(env);
  const stripe = stripeConfig(env);
  return json({
    siteOrigin: siteOrigin(env),
    authReady: oauthReady(env),
    paypal: { ready: paypalReady(env), clientId: paypal.clientId, planId: paypal.planId },
    stripe: { ready: stripeReady(env), buyButtonId: stripe.buyButtonId, publishableKey: stripe.publishableKey },
    publicDefaultsProvided: Boolean(DEFAULTS.paypalPlanId && DEFAULTS.stripeBuyButtonId)
  });
}
