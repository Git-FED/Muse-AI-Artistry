(() => {
  'use strict';
  const status = document.getElementById('paywall-status');
  const signIn = document.getElementById('muse-signin');
  const signOut = document.getElementById('muse-signout');
  const openPremium = document.getElementById('open-premium');
  const ageForm = document.getElementById('age-form');
  const ageError = document.getElementById('age-error');
  const dob = document.getElementById('birth-date');
  const checkout = document.getElementById('checkout-options');
  const paypalNote = document.getElementById('paypal-note');
  const stripeNote = document.getElementById('stripe-note');
  let config = null;
  let checkoutStarted = false;

  function message(text, kind = '') {
    status.textContent = text;
    if (kind) status.dataset.kind = kind;
    else delete status.dataset.kind;
  }

  async function api(url, options = {}) {
    const response = await fetch(url, { credentials: 'same-origin', cache: 'no-store', ...options, headers: { ...(options.headers || {}), ...(options.body ? { 'content-type': 'application/json' } : {}) } });
    let data = {};
    try { data = await response.json(); } catch (_) {}
    if (!response.ok) throw new Error(data.error || 'The request could not be completed.');
    return data;
  }

  function adult(birthDate) {
    const birth = new Date(`${birthDate}T00:00:00`);
    const now = new Date();
    if (!birthDate || Number.isNaN(birth.getTime()) || birth > now) return false;
    let age = now.getFullYear() - birth.getFullYear();
    if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age--;
    return age >= 18;
  }

  function loadScript(src, id) {
    return new Promise((resolve, reject) => {
      const existing = document.getElementById(id);
      if (existing) { resolve(); return; }
      const script = document.createElement('script');
      script.id = id;
      script.src = src;
      script.async = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error('Payment provider could not load.'));
      document.head.appendChild(script);
    });
  }

  async function showPayPal() {
    if (!config.paypal?.ready) {
      paypalNote.textContent = 'PayPal verification is not configured yet; this option is disabled.';
      return;
    }
    try {
      const intent = await api('/api/billing/paypal-intent', { method: 'POST', body: '{}' });
      const sdk = new URL('https://www.paypal.com/sdk/js');
      sdk.searchParams.set('client-id', config.paypal.clientId);
      sdk.searchParams.set('vault', 'true');
      sdk.searchParams.set('intent', 'subscription');
      sdk.searchParams.set('data-sdk-integration-source', 'button-factory');
      await loadScript(sdk.toString(), 'museai-premium-paypal-sdk');
      if (!window.paypal) throw new Error('PayPal buttons were not available.');
      window.paypal.Buttons({
        style: { shape: 'rect', color: 'gold', layout: 'vertical', label: 'subscribe' },
        createSubscription: (data, actions) => actions.subscription.create({ plan_id: config.paypal.planId, quantity: 1, custom_id: intent.customId }),
        onApprove: async data => {
          message('Verifying the PayPal subscription with the server…');
          try {
            await api('/api/billing/paypal-verify', { method: 'POST', body: JSON.stringify({ subscriptionID: data.subscriptionID, customId: intent.customId }) });
            message('Premium membership verified. Opening the gallery…', 'success');
            window.location.assign('/corridor.html');
          } catch (error) { message(error.message, 'error'); }
        },
        onCancel: () => message('Checkout was cancelled. Premium remains locked.'),
        onError: () => message('PayPal checkout could not be completed. Premium remains locked.', 'error')
      }).render('#paypal-button-container');
      paypalNote.textContent = 'Access is granted only after the server verifies this subscription.';
    } catch (error) { paypalNote.textContent = error.message; }
  }

  async function showStripe() {
    if (!config.stripe?.ready) {
      stripeNote.textContent = 'Card checkout is disabled until the Stripe secret, webhook, and expected subscription price are configured.';
      return;
    }
    try {
      const intent = await api('/api/billing/stripe-intent', { method: 'POST', body: '{}' });
      await loadScript('https://js.stripe.com/v3/buy-button.js', 'museai-premium-stripe-sdk');
      const box = document.getElementById('premium-stripe-button-container');
      const button = document.createElement('stripe-buy-button');
      button.setAttribute('buy-button-id', config.stripe.buyButtonId);
      button.setAttribute('publishable-key', config.stripe.publishableKey);
      button.setAttribute('client-reference-id', intent.clientReferenceId);
      box.replaceChildren(button);
      stripeNote.textContent = 'Stripe will return you to the site; access activates only after a signed webhook and active-subscription check.';
    } catch (error) { stripeNote.textContent = error.message; }
  }

  async function startCheckout() {
    if (checkoutStarted) return;
    checkoutStarted = true;
    checkout.hidden = false;
    await Promise.all([showPayPal(), showStripe()]);
  }

  async function refresh() {
    try {
      const [session, paymentConfig] = await Promise.all([api('/api/session'), api('/api/paywall-config')]);
      config = paymentConfig;
      if (!session.authenticated) {
        if (!session.authReady) {
          signIn.setAttribute('aria-disabled', 'true');
          message('MuseAI sign-in is not configured for this site yet.');
        } else message('Sign in with MuseAI to continue.');
        signIn.hidden = false;
        signOut.hidden = true;
        ageForm.hidden = true;
        checkout.hidden = true;
        return;
      }
      signIn.hidden = true;
      signOut.hidden = false;
      if (session.premium) {
        ageForm.hidden = true;
        checkout.hidden = true;
        openPremium.hidden = false;
        message(`Premium is active${session.user?.name ? ` for ${session.user.name}` : ''}.`, 'success');
        return;
      }
      openPremium.hidden = true;
      if (sessionStorage.getItem('museai_paywall_age_confirmed') === 'yes') {
        ageForm.hidden = true;
        message('Signed in. Preparing payment choices…');
        await startCheckout();
      } else {
        ageForm.hidden = false;
        checkout.hidden = true;
        message('Signed in. Confirm that you are at least 18 to view subscription options.');
      }
    } catch (error) {
      message(`${error.message} Premium stays locked until server checks are available.`, 'error');
    }
  }

  ageForm.addEventListener('submit', event => {
    event.preventDefault();
    if (!adult(dob.value)) {
      ageError.textContent = 'Enter a valid date showing you are at least 18.';
      return;
    }
    ageError.textContent = '';
    dob.value = '';
    try { sessionStorage.setItem('museai_paywall_age_confirmed', 'yes'); } catch (_) {}
    message('Age check complete. Preparing payment choices…');
    void startCheckout();
  });

  signOut.addEventListener('click', async () => {
    try {
      await api('/auth/logout', { method: 'POST', body: '{}' });
      window.location.reload();
    } catch (error) { message(error.message, 'error'); }
  });

  void refresh();
})();
