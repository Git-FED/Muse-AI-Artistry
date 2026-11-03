import { oauthReady, paypalReady, stripeReady } from '../lib/config.js';
import { json, getSession } from '../lib/core.js';
import { hasPremium } from '../lib/entitlement.js';

export async function onRequestGet({ request, env }) {
  const session = await getSession(request, env);
  const premium = session ? await hasPremium(env, session.user.sub) : false;
  return json({
    authenticated: Boolean(session),
    user: session ? { name: session.user.name || '', email: session.user.email || '' } : null,
    premium,
    authReady: oauthReady(env),
    paypalReady: paypalReady(env),
    stripeReady: stripeReady(env)
  });
}
