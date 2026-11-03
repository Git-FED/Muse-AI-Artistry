const SESSION_COOKIE = 'museai_session';
const SESSION_TTL = 60 * 60 * 24 * 7;
const encoder = new TextEncoder();

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers }
  });
}

export function text(message, status = 400, headers = {}) {
  return new Response(message, {
    status,
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store', ...headers }
  });
}

export function randomToken(bytes = 32) {
  const data = crypto.getRandomValues(new Uint8Array(bytes));
  return base64url(data);
}

export function base64url(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function fromBase64url(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

async function signature(value, secret) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return base64url(await crypto.subtle.sign('HMAC', key, encoder.encode(value)));
}

function cookieValue(request, name) {
  const header = request.headers.get('cookie') || '';
  for (const part of header.split(';')) {
    const [key, ...value] = part.trim().split('=');
    if (key === name) return value.join('=');
  }
  return '';
}

function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

export function userKey(userId) {
  return base64url(encoder.encode(String(userId)));
}

export async function getSession(request, env) {
  if (!env.APP_KV || !env.SESSION_SECRET) return null;
  const value = cookieValue(request, SESSION_COOKIE);
  const dot = value.lastIndexOf('.');
  if (dot < 1) return null;
  const sid = value.slice(0, dot);
  const supplied = value.slice(dot + 1);
  const expected = await signature(sid, env.SESSION_SECRET);
  if (!constantTimeEqual(supplied, expected)) return null;
  const session = await env.APP_KV.get(`session:${sid}`, { type: 'json' });
  if (!session || session.expiresAt <= Date.now() || !session.user?.sub) return null;
  return { ...session, sid };
}

export async function createSession(env, user) {
  if (!env.APP_KV || !env.SESSION_SECRET) throw new Error('Session storage is not configured.');
  const sid = randomToken(32);
  const expiresAt = Date.now() + SESSION_TTL * 1000;
  await env.APP_KV.put(`session:${sid}`, JSON.stringify({ user, expiresAt }), { expirationTtl: SESSION_TTL });
  const sig = await signature(sid, env.SESSION_SECRET);
  return {
    cookie: `${SESSION_COOKIE}=${sid}.${sig}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL}`,
    sid
  };
}

export async function clearSession(request, env) {
  const session = await getSession(request, env);
  if (session && env.APP_KV) await env.APP_KV.delete(`session:${session.sid}`);
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export function sameOrigin(request, env) {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try { return new URL(origin).origin === new URL(env.SITE_ORIGIN || 'https://museai-gallery.pages.dev').origin; }
  catch (_) { return false; }
}

export function redirect(location, status = 302, headers = {}) {
  return new Response(null, { status, headers: { location, 'cache-control': 'no-store', ...headers } });
}

export async function readJson(request, maxBytes = 16_384) {
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > maxBytes) throw new Error('Request is too large.');
  const raw = await request.text();
  if (raw.length > maxBytes) throw new Error('Request is too large.');
  return JSON.parse(raw || '{}');
}
