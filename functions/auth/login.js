import { oauthReady, siteOrigin } from '../lib/config.js';
import { base64url, json, randomToken, redirect } from '../lib/core.js';

const encoder = new TextEncoder();

async function pkceChallenge(verifier) {
  return base64url(await crypto.subtle.digest('SHA-256', encoder.encode(verifier)));
}

function safeReturnTo(value) {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/premium-gate.html';
  const parsed = new URL(value, 'https://local.invalid');
  if (parsed.origin !== 'https://local.invalid') return '/premium-gate.html';
  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

export async function onRequestGet({ request, env }) {
  if (!oauthReady(env)) return json({ error: 'MuseAI sign-in is not configured for this site yet.' }, 503);
  const origin = siteOrigin(env);
  if (new URL(env.MUSE_OAUTH_REDIRECT_URI).origin !== origin || env.MUSE_OAUTH_REDIRECT_URI !== `${origin}/auth/callback`) {
    return json({ error: 'OAuth callback URL must exactly match this site origin and /auth/callback.' }, 503);
  }
  const url = new URL(request.url);
  const state = randomToken(32);
  const verifier = randomToken(48);
  const nonce = randomToken(24);
  const returnTo = safeReturnTo(url.searchParams.get('returnTo'));
  await env.APP_KV.put(`oauth:${state}`, JSON.stringify({ verifier, nonce, returnTo, expiresAt: Date.now() + 10 * 60 * 1000 }), { expirationTtl: 600 });
  const authorize = new URL(env.MUSE_OAUTH_AUTHORIZE_URL);
  authorize.searchParams.set('response_type', 'code');
  authorize.searchParams.set('client_id', env.MUSE_OAUTH_CLIENT_ID);
  authorize.searchParams.set('redirect_uri', env.MUSE_OAUTH_REDIRECT_URI);
  authorize.searchParams.set('scope', env.MUSE_OAUTH_SCOPE || 'openid profile email');
  authorize.searchParams.set('state', state);
  authorize.searchParams.set('nonce', nonce);
  authorize.searchParams.set('code_challenge', await pkceChallenge(verifier));
  authorize.searchParams.set('code_challenge_method', 'S256');
  const stateCookie = `museai_oauth_state=${state}; Path=/auth/callback; HttpOnly; Secure; SameSite=Lax; Max-Age=600`;
  return redirect(authorize.toString(), 302, { 'set-cookie': stateCookie });
}
