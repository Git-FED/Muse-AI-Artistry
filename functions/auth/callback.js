import { oauthReady, siteOrigin } from '../lib/config.js';
import { createSession, json, redirect } from '../lib/core.js';

function readCookie(request, name) {
  for (const item of (request.headers.get('cookie') || '').split(';')) {
    const [key, ...value] = item.trim().split('=');
    if (key === name) return value.join('=');
  }
  return '';
}

export async function onRequestGet({ request, env }) {
  if (!oauthReady(env)) return json({ error: 'MuseAI sign-in is not configured.' }, 503);
  const url = new URL(request.url);
  const code = url.searchParams.get('code') || '';
  const state = url.searchParams.get('state') || '';
  const stateCookie = readCookie(request, 'museai_oauth_state');
  if (!code || !state || state !== stateCookie || !/^[A-Za-z0-9_-]{32,128}$/.test(state)) {
    return json({ error: 'Sign-in could not be validated. Please try again.' }, 400, { 'set-cookie': 'museai_oauth_state=; Path=/auth/callback; HttpOnly; Secure; SameSite=Lax; Max-Age=0' });
  }
  const key = `oauth:${state}`;
  const flow = await env.APP_KV.get(key, { type: 'json' });
  await env.APP_KV.delete(key);
  if (!flow || flow.expiresAt <= Date.now()) return json({ error: 'Sign-in expired. Please try again.' }, 400);

  const form = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: env.MUSE_OAUTH_REDIRECT_URI,
    client_id: env.MUSE_OAUTH_CLIENT_ID,
    client_secret: env.MUSE_OAUTH_CLIENT_SECRET,
    code_verifier: flow.verifier
  });
  const tokenResponse = await fetch(env.MUSE_OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
    body: form.toString()
  });
  if (!tokenResponse.ok) return json({ error: 'MuseAI sign-in could not complete.' }, 502);
  const tokens = await tokenResponse.json();
  if (!tokens.access_token) return json({ error: 'MuseAI sign-in returned no access token.' }, 502);
  const profileResponse = await fetch(env.MUSE_OAUTH_USERINFO_URL, {
    headers: { authorization: `Bearer ${tokens.access_token}`, accept: 'application/json' }
  });
  if (!profileResponse.ok) return json({ error: 'MuseAI profile could not be verified.' }, 502);
  const profile = await profileResponse.json();
  if (typeof profile.sub !== 'string' || !profile.sub.trim()) return json({ error: 'MuseAI profile has no stable account ID.' }, 502);

  const name = typeof profile.name === 'string' ? profile.name.slice(0, 100) : '';
  const user = { sub: profile.sub, name, email: typeof profile.email === 'string' ? profile.email.slice(0, 254) : '' };
  const session = await createSession(env, user);
  const destination = new URL(flow.returnTo || '/premium-gate.html', siteOrigin(env));
  if (destination.origin !== siteOrigin(env)) return json({ error: 'Invalid return location.' }, 400);
  return redirect(destination.toString(), 303, {
    'set-cookie': session.cookie
  });
}
