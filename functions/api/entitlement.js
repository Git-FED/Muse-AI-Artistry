import { json, getSession } from '../lib/core.js';
import { hasPremium } from '../lib/entitlement.js';

export async function onRequestGet({ request, env }) {
  const session = await getSession(request, env);
  const premium = session ? await hasPremium(env, session.user.sub) : false;
  return json({ premium, authenticated: Boolean(session) });
}
