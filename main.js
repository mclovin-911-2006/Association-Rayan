/* ═══════════════════════════════════════
   Association Rayan MMA — Main JS (dynamic + mobile)
   ═══════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = matchMedia('(hover: none)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  const navbar = $('#navbar');
  const hamburger = $('#hamburger');
  const navLinks = $('#nav-links');
  const heroContent = $('.hero-content');
  const heroScroll = $('#hero-scroll');

  // ── Injected UI: progress bar + mobile action bar ──
  const progress = document.createElement('div');
  progress.className = 'scroll-progress';
  document.body.prepend(progress);

  const mobileBar = document.createElement('nav');
  mobileBar.className = 'mobile-bar';
  mobileBar.setAttribute('aria-label', 'Actions rapides');
  mobileBar.innerHTML = `
    <a href="tel:+212681203275" class="mb-btn"><span>📞</span>Appeler</a>
    <a href="https://maps.app.goo.gl/z1mtppAcX1eUbQJY8" target="_blank" rel="noopener noreferrer" class="mb-btn"><span>📍</span>Itinéraire</a>
    <a href="#offres" class="mb-btn mb-primary"><span>🥊</span>Rejoindre</a>`;
  document.body.appendChild(mobileBar);

  // ── Mobile menu (animated, scroll-locked) ──
  $$('.nav-link, .nav-cta', navLinks).forEach((l, i) => l.style.setProperty('--i', i));
  hamburger.setAttribute('aria-expanded', 'false');
  function setMenu(open) {
    hamburger.classList.toggle('active', open);
    navLinks.classList.toggle('open', open);
    document.body.classList.toggle('menu-open', open);
    hamburger.setAttribute('aria-expanded', open);
    if (open) navbar.classList.remove('nav-hidden');
  }
  hamburger.addEventListener('click', () => setMenu(!navLinks.classList.contains('open')));
  $$('.nav-link, .nav-cta', navLinks).forEach(l => l.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });
  addEventListener('resize', () => { if (innerWidth > 768) setMenu(false); });

  // ── Open / closed status (Casablanca time) ──
  const DAYS = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  function casaNow() {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Casablanca', weekday: 'short',
      hour: '2-digit', minute: '2-digit', hour12: false
    }).formatToParts(new Date());
    const get = t => parts.find(p => p.type === t).value;
    return { day: DAYS[get('weekday')], min: (+get('hour') % 24) * 60 + +get('minute') };
  }
  function openStatus() {
    const { day, min } = casaNow();
    const OPEN = 8 * 60 + 30, CLOSE = 22 * 60 + 30;
    const workday = day >= 1 && day <= 6;
    if (workday && min >= OPEN && min < CLOSE) return { open: true, text: "Ouvert maintenant · jusqu'à 22h30" };
    if (workday && min < OPEN) return { open: false, text: 'Fermé · ouvre à 08h30' };
    if (day === 6 || day === 0) return { open: false, text: 'Fermé · réouverture lundi 08h30' };
    return { open: false, text: 'Fermé · ouvre demain à 08h30' };
  }
  const heroBadge = document.createElement('div');
  heroBadge.className = 'open-badge';
  $('#hero-actions').before(heroBadge);
  const hoursP = $('#info-hours p');
  const hoursBadge = document.createElement('span');
  hoursBadge.className = 'open-inline';
  hoursP.after(hoursBadge);
  function renderStatus() {
    const s = openStatus();
    [heroBadge, hoursBadge].forEach(b => {
      b.classList.toggle('open', s.open);
      b.textContent = s.text;
    });
  }
  renderStatus();
  setInterval(renderStatus, 60000);

  // ── Planning: tabs, today highlight, scroll to today ──
  const tabBtns = $$('.tab-btn');
  const todayIdx = casaNow().day; // 1..6 = Lun..Sam
  if (todayIdx >= 1 && todayIdx <= 6) {
    $$('.planning-table').forEach(table => {
      $$('tr', table).forEach(tr => {
        const cell = tr.children[todayIdx];
        if (cell) cell.classList.add('today');
      });
    });
  }
  function scrollToToday(wrap) {
    if (!wrap || todayIdx < 1 || todayIdx > 6) return;
    const th = $$('th', wrap)[todayIdx];
    const first = $$('th', wrap)[0];
    if (th && wrap.scrollWidth > wrap.clientWidth) {
      wrap.scrollTo({ left: th.offsetLeft - first.offsetWidth - 8, behavior: reduceMotion ? 'auto' : 'smooth' });
    }
  }
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      $$('.planning-table-wrap').forEach(t => t.classList.remove('active'));
      const target = document.getElementById(btn.dataset.tab);
      if (target) { target.classList.add('active'); scrollToToday(target); }
    });
  });
  const swipeHint = document.createElement('p');
  swipeHint.className = 'swipe-hint';
  swipeHint.textContent = '↔ Glissez pour voir toute la semaine';
  $('.planning-wrapper').before(swipeHint);
  $$('.planning-table-wrap').forEach(w =>
    w.addEventListener('scroll', () => swipeHint.classList.add('gone'), { passive: true, once: true })
  );
  const planningObs = new IntersectionObserver(([e]) => {
    if (e.isIntersecting) { scrollToToday($('.planning-table-wrap.active')); planningObs.disconnect(); }
  }, { threshold: 0.3 });
  planningObs.observe($('#planning'));

  // ── Scroll-driven effects (single rAF-throttled handler) ──
  const sections = $$('section[id]');
  const navAnchors = $$('.nav-link');
  const splitImgs = $$('.split-img');
  let lastY = 0, ticking = false;

  function updateActiveNav(y) {
    const pos = y + 120;
    sections.forEach(section => {
      if (pos >= section.offsetTop && pos < section.offsetTop + section.offsetHeight) {
        navAnchors.forEach(a => a.classList.remove('active'));
        const active = $(`.nav-link[href="#${section.id}"]`);
        if (active) active.classList.add('active');
      }
    });
  }

  function update() {
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? Math.min(y / max, 1) : 0})`;
    navbar.classList.toggle('scrolled', y > 60);

    // Hide navbar while scrolling down on phones, reveal on scroll up
    if (innerWidth <= 768 && !navLinks.classList.contains('open')) {
      if (y > lastY + 6 && y > 200) navbar.classList.add('nav-hidden');
      else if (y < lastY - 6 || y <= 200) navbar.classList.remove('nav-hidden');
    } else {
      navbar.classList.remove('nav-hidden');
    }
    if (Math.abs(y - lastY) > 6) lastY = y;

    mobileBar.classList.toggle('show', y > innerHeight * 0.6);

    if (heroScroll) heroScroll.style.opacity = y > 60 ? 0 : 1;
    if (!reduceMotion) {
      if (y < innerHeight * 1.2) {
        heroContent.style.transform = `translateY(${y * 0.18}px)`;
        heroContent.style.opacity = Math.max(0, 1 - y / (innerHeight * 0.9));
      }
      splitImgs.forEach(img => {
        const r = img.getBoundingClientRect();
        if (r.bottom > 0 && r.top < innerHeight) {
          const p = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
          img.style.backgroundPosition = `center ${Math.max(0, Math.min(30, 12 - p * 20))}%`;
        }
      });
    }
    updateActiveNav(y);
  }
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { update(); ticking = false; });
  }, { passive: true });
  update();

  // ── Scroll-triggered fade-up with stagger ──
  const fadeElements = $$(
    '.offre-card, .stat-item, .info-item, .feature-list li, .achievement-item, .split-content, .section-header, .coach-img-wrap, .planning-legend'
  );
  const groupCount = new Map();
  fadeElements.forEach(el => {
    el.classList.add('fade-up');
    const n = groupCount.get(el.parentNode) || 0;
    groupCount.set(el.parentNode, n + 1);
    el.style.transitionDelay = `${Math.min(n, 5) * 90}ms`;
  });
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
        setTimeout(() => { entry.target.style.transitionDelay = ''; }, 1200);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
  fadeElements.forEach(el => observer.observe(el));

  // ── Eased counter animation for stats ──
  function animateCounter(el, text) {
    const plus = text.includes('+');
    const num = parseInt(text, 10);
    if (reduceMotion || isNaN(num)) return;
    const duration = 1800;
    const start = performance.now();
    function frame(now) {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(num * eased) + (plus ? '+' : '');
      if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  const statsObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target, entry.target.textContent);
        statsObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });
  $$('.stat-num').forEach(el => statsObserver.observe(el));

  // ── Touch feedback: ripple + light haptic ──
  document.addEventListener('pointerdown', e => {
    const target = e.target.closest('.btn, .nav-cta, .tab-btn, .mb-btn');
    if (!target) return;
    if (isTouch && navigator.vibrate) navigator.vibrate(8);
    if (reduceMotion) return;
    const rect = target.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2;
    const r = document.createElement('span');
    r.className = 'ripple';
    r.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - rect.left - size / 2}px;top:${e.clientY - rect.top - size / 2}px`;
    target.appendChild(r);
    setTimeout(() => r.remove(), 650);
  }, { passive: true });
});
