export const DEFAULTS = {
  paypalPlanId: 'P-4FD24238VX4902214NK2XP2Y',
  paypalJsClientId: 'BAA_ndqaWMyQwTnDZ0LXwLQ22jdJo9uxkeXYqmBbF-hD41HMiZ83mvOcx1Kti0b6ZfXfje7Q1ievNaS8Ok',
  stripeBuyButtonId: 'buy_btn_1UJKaaJaRf233kfWKZ81fcIe',
  stripePublishableKey: 'pk_live_51UIdAGJaRf233kfWlFacR31IYVGdjCVAttNFzIgQGXQzrUdc894iJcBqamRZNwF11z2AN5kvjyzitor462f2egVI00UmKj0sd8'
};

export function siteOrigin(env) {
  return (env.SITE_ORIGIN || 'https://museai-gallery.pages.dev').replace(/\/$/, '');
}

export function oauthReady(env) {
  const endpointsSecure = [env.MUSE_OAUTH_AUTHORIZE_URL, env.MUSE_OAUTH_TOKEN_URL, env.MUSE_OAUTH_USERINFO_URL].every(value => {
    try { return new URL(value).protocol === 'https:'; } catch (_) { return false; }
  });
  let callbackMatches = false;
  try {
    const origin = siteOrigin(env);
    callbackMatches = Boolean(env.SITE_ORIGIN) && env.MUSE_OAUTH_REDIRECT_URI === `${origin}/auth/callback` && new URL(origin).origin === origin;
  } catch (_) { callbackMatches = false; }
  return Boolean(
    env.MUSE_OAUTH_AUTHORIZE_URL && env.MUSE_OAUTH_TOKEN_URL &&
    env.MUSE_OAUTH_USERINFO_URL && endpointsSecure && env.MUSE_OAUTH_CLIENT_ID &&
    env.MUSE_OAUTH_CLIENT_SECRET && callbackMatches &&
    env.SESSION_SECRET && env.SESSION_SECRET.length >= 32 && env.APP_KV
  );
}

export function paypalConfig(env) {
  return {
    clientId: env.PAYPAL_JS_CLIENT_ID || DEFAULTS.paypalJsClientId,
    planId: env.PAYPAL_PLAN_ID || DEFAULTS.paypalPlanId,
    apiBase: env.PAYPAL_API_BASE || ''
  };
}

export function paypalReady(env) {
  const cfg = paypalConfig(env);
  return Boolean(
    env.PAYPAL_REST_CLIENT_ID && env.PAYPAL_REST_CLIENT_SECRET &&
    (cfg.apiBase === 'https://api-m.paypal.com' || cfg.apiBase === 'https://api-m.sandbox.paypal.com') &&
    cfg.clientId && cfg.planId && env.APP_KV && env.SESSION_SECRET && env.SESSION_SECRET.length >= 32
  );
}

export function stripeConfig(env) {
  return {
    buyButtonId: env.STRIPE_BUY_BUTTON_ID || DEFAULTS.stripeBuyButtonId,
    publishableKey: env.STRIPE_PUBLISHABLE_KEY || DEFAULTS.stripePublishableKey
  };
}

export function stripeReady(env) {
  const cfg = stripeConfig(env);
  return Boolean(
    cfg.buyButtonId && cfg.publishableKey && env.STRIPE_SECRET_KEY &&
    env.STRIPE_WEBHOOK_SECRET && env.STRIPE_EXPECTED_PRICE_ID && env.APP_KV && env.SESSION_SECRET && env.SESSION_SECRET.length >= 32
  );
}
