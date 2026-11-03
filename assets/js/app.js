(() => {
  'use strict';
  const support = document.getElementById('museai-support-panel');
  const openButton = document.getElementById('museai-support-open');
  if (support && openButton) {
    const ageIntro = document.getElementById('museai-age-intro');
    const ageWrap = document.getElementById('museai-age-form-wrap');
    const form = document.getElementById('museai-age-form');
    const dateInput = document.getElementById('museai-dob');
    const error = document.getElementById('museai-age-error');
    const supportLinks = document.getElementById('museai-payment-options');
    const start = document.getElementById('museai-age-start');
    const isConfirmed = () => { try { return sessionStorage.getItem('museai_age_confirmed') === 'yes'; } catch (_) { return false; } };
    const revealSupportLinks = () => {
      if (ageIntro) ageIntro.hidden = true;
      if (ageWrap) ageWrap.hidden = true;
      if (supportLinks) supportLinks.hidden = false;
    };
    const openPanel = () => {
      support.hidden = false;
      support.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      if (isConfirmed()) revealSupportLinks();
      support.querySelector('[data-museai-close]')?.focus({preventScroll:true});
    };
    const closePanel = () => {
      support.hidden = true;
      support.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      openButton.focus({preventScroll:true});
    };
    openButton.addEventListener('click', openPanel);
    document.querySelectorAll('[data-open-support]').forEach(button => button.addEventListener('click', openPanel));
    support.querySelectorAll('[data-museai-close]').forEach(button => button.addEventListener('click', closePanel));
    start?.addEventListener('click', () => { if (ageIntro) ageIntro.hidden = true; if (ageWrap) ageWrap.hidden = false; dateInput?.focus(); });
    form?.addEventListener('submit', event => {
      event.preventDefault();
      if (!dateInput.value) { error.textContent = 'Enter your date of birth to continue.'; return; }
      const birth = new Date(dateInput.value + 'T00:00:00');
      const now = new Date();
      if (Number.isNaN(birth.getTime()) || birth > now) { error.textContent = 'Enter a valid date of birth.'; return; }
      let age = now.getFullYear() - birth.getFullYear();
      const beforeBirthday = now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate());
      if (beforeBirthday) age--;
      if (age < 18) { error.textContent = 'You must be at least 18 to view these support links.'; return; }
      error.textContent = '';
      try { sessionStorage.setItem('museai_age_confirmed','yes'); } catch (_) { /* This check still applies for this page view. */ }
      dateInput.value = '';
      revealSupportLinks();
    });
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && !support.hidden) closePanel(); });
  }

  const menuToggle = document.getElementById('museai-menu-toggle');
  const nav = document.getElementById('promo-nav');
  if (menuToggle && nav) {
    menuToggle.addEventListener('click', () => {
      const expanded = menuToggle.getAttribute('aria-expanded') === 'true';
      menuToggle.setAttribute('aria-expanded', String(!expanded));
      menuToggle.setAttribute('aria-label', expanded ? 'Open navigation' : 'Close navigation');
      nav.classList.toggle('is-open', !expanded);
    });
    nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
      nav.classList.remove('is-open'); menuToggle.setAttribute('aria-expanded','false'); menuToggle.setAttribute('aria-label','Open navigation');
    }));
  }
  document.querySelectorAll('a[href^="#"]').forEach(link => link.addEventListener('click', event => {
    const target = document.querySelector(link.getAttribute('href'));
    if (target) { event.preventDefault(); target.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'}); }
  }));
  const revealItems = document.querySelectorAll('.reveal-in');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); } }), {threshold:.12});
    revealItems.forEach(item => observer.observe(item));
  } else revealItems.forEach(item => item.classList.add('is-visible'));
  document.querySelectorAll('[data-tilt]').forEach(card => {
    card.addEventListener('pointermove', event => {
      if (event.pointerType === 'touch' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - .5;
      const y = (event.clientY - rect.top) / rect.height - .5;
      card.style.transform = `perspective(950px) rotateX(${(-y*4).toFixed(2)}deg) rotateY(${(x*5).toFixed(2)}deg) translateY(-2px)`;
    });
    card.addEventListener('pointerleave', () => { card.style.transform=''; });
  });
  document.querySelectorAll('.magnetic').forEach(button => {
    button.addEventListener('pointermove', event => {
      if (event.pointerType === 'touch') return;
      const rect=button.getBoundingClientRect();
      const dx=(event.clientX-(rect.left+rect.width/2))*.08;
      const dy=(event.clientY-(rect.top+rect.height/2))*.08;
      button.style.transform=`translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px)`;
    });
    button.addEventListener('pointerleave', () => { button.style.transform=''; });
  });
  const canvas = document.getElementById('museai-particles');
  if (canvas && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const ctx=canvas.getContext('2d'); let points=[]; let raf=0; let width=0,height=0;
    const resize=()=>{const dpr=Math.min(devicePixelRatio||1,2);width=innerWidth;height=innerHeight;canvas.width=width*dpr;canvas.height=height*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);const count=Math.min(70,Math.round(width*height/22000));points=Array.from({length:count},()=>({x:Math.random()*width,y:Math.random()*height,vx:(Math.random()-.5)*.18,vy:(Math.random()-.5)*.18,r:Math.random()*1.4+.5}));};
    const draw=()=>{ctx.clearRect(0,0,width,height);for(let i=0;i<points.length;i++){const p=points[i];p.x+=p.vx;p.y+=p.vy;if(p.x<0||p.x>width)p.vx*=-1;if(p.y<0||p.y>height)p.vy*=-1;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle='rgba(167,226,255,.62)';ctx.fill();for(let j=i+1;j<points.length;j++){const q=points[j],dx=p.x-q.x,dy=p.y-q.y,d=Math.hypot(dx,dy);if(d<115){ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.strokeStyle=`rgba(0,210,255,${(1-d/115)*.075})`;ctx.lineWidth=.7;ctx.stroke();}}}raf=requestAnimationFrame(draw);};
    resize();draw();addEventListener('resize',resize,{passive:true});document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelAnimationFrame(raf);else if(!raf)draw();});
  }
})();
