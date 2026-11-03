import { siteOrigin } from './lib/config.js';
import { getSession, redirect } from './lib/core.js';
import { hasPremium } from './lib/entitlement.js';

export async function onRequest(context) {
  const { request, env } = context;
  const session = await getSession(request, env);
  const allowed = session ? await hasPremium(env, session.user.sub) : false;
  if (!allowed) {
    const destination = new URL('/premium-gate.html', siteOrigin(env));
    destination.searchParams.set('next', '/corridor.html');
    return redirect(destination.toString(), 302);
  }
  return context.next();
}
