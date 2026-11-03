import { clearSession, json, sameOrigin } from '../lib/core.js';

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request, env)) return json({ error: 'Request origin was not accepted.' }, 403);
  const cookie = await clearSession(request, env);
  return json({ ok: true }, 200, { 'set-cookie': cookie });
}
