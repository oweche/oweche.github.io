(() => {
  'use strict';

  const root = document.documentElement;
  const motionButton = document.querySelector('#motion-toggle');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const motionListeners = new Set();
  const motionStorageKey = 'owen-portfolio-motion';
  let savedMotion = null;
  try { savedMotion = window.localStorage.getItem(motionStorageKey); } catch { /* Optional preference. */ }
  let motionPaused = reducedMotion.matches || savedMotion === 'paused';

  function setMotionPaused(paused, remember = false) {
    motionPaused = paused;
    root.classList.toggle('motion-paused', paused);
    if (motionButton) {
      motionButton.setAttribute('aria-pressed', String(paused));
      motionButton.setAttribute('aria-label', paused ? 'Turn motion on' : 'Turn motion off');
      motionButton.textContent = paused ? 'Motion off' : 'Motion on';
    }
    if (remember) {
      savedMotion = paused ? 'paused' : 'enabled';
      try { window.localStorage.setItem(motionStorageKey, savedMotion); } catch { /* Choice still applies now. */ }
    }
    motionListeners.forEach(listener => listener(paused));
  }

  setMotionPaused(motionPaused);
  motionButton?.addEventListener('click', () => setMotionPaused(!motionPaused, true));
  const syncMotionPreference = () => setMotionPaused(reducedMotion.matches || savedMotion === 'paused');
  if (reducedMotion.addEventListener) reducedMotion.addEventListener('change', syncMotionPreference);
  else reducedMotion.addListener(syncMotionPreference);

  function setupLogoLoops() {
    document.querySelectorAll('.logo-track').forEach(track => {
      const group = track.querySelector('.logo-group');
      if (!group || track.querySelectorAll('.logo-group').length > 1) return;
      const clone = group.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      track.append(clone);
    });
  }

  function setupReveals() {
    const elements = [...document.querySelectorAll('[data-reveal]')];
    const showAll = () => elements.forEach(element => element.classList.add('is-visible'));
    if (!('IntersectionObserver' in window) || motionPaused) return showAll();
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -24px 0px' });
    elements.forEach(element => observer.observe(element));
    motionListeners.add(paused => {
      if (!paused) return;
      showAll();
      observer.disconnect();
    });
  }

  function setupCounters() {
    const counters = [...document.querySelectorAll('[data-counter]')];
    const finished = new WeakSet();
    function format(element, value) {
      const raw = element.getAttribute('data-counter') || '0';
      const decimals = Math.min((raw.split('.')[1] || '').length, 3);
      return (element.getAttribute('data-prefix') || '') + value.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }) + (element.getAttribute('data-suffix') || '');
    }
    function finish(element) {
      const target = Number(element.getAttribute('data-counter'));
      if (Number.isFinite(target)) element.textContent = format(element, target);
      finished.add(element);
    }
    function animate(element) {
      if (finished.has(element)) return;
      const target = Number(element.getAttribute('data-counter'));
      if (!Number.isFinite(target) || motionPaused) return finish(element);
      const started = performance.now();
      function tick(now) {
        const progress = Math.min((now - started) / 1100, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        element.textContent = format(element, target * eased);
        if (progress < 1 && !motionPaused) window.requestAnimationFrame(tick);
        else finish(element);
      }
      window.requestAnimationFrame(tick);
    }
    if (!('IntersectionObserver' in window) || motionPaused) counters.forEach(finish);
    else {
      const observer = new IntersectionObserver(entries => entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        animate(entry.target);
        observer.unobserve(entry.target);
      }), { threshold: 0.3 });
      counters.forEach(element => observer.observe(element));
      motionListeners.add(paused => { if (paused) counters.forEach(finish); });
    }
  }

  function setupScrollMotion() {
    const bar = document.querySelector('.scroll-progress span');
    let previousY = window.scrollY;
    let queued = false;
    function update() {
      queued = false;
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const progress = Math.min(1, Math.max(0, window.scrollY / max));
      if (bar) bar.style.transform = `scaleX(${progress})`;
      const delta = Math.abs(window.scrollY - previousY);
      root.style.setProperty('--flow-speed', `${Math.max(12, 28 - Math.min(delta, 16))}s`);
      previousY = window.scrollY;
    }
    window.addEventListener('scroll', () => {
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(update);
    }, { passive: true });
    update();
  }

  function setupPointerGlow() {
    if (!finePointer.matches) return;
    let queued = false;
    let x = -200;
    let y = -200;
    function render() {
      queued = false;
      if (motionPaused) return;
      root.style.setProperty('--pointer-x', `${x}px`);
      root.style.setProperty('--pointer-y', `${y}px`);
      root.classList.add('pointer-active');
    }
    window.addEventListener('pointermove', event => {
      x = event.clientX;
      y = event.clientY;
      if (!queued) { queued = true; window.requestAnimationFrame(render); }
    }, { passive: true });
    window.addEventListener('pointerleave', () => root.classList.remove('pointer-active'));
    motionListeners.add(paused => { if (paused) root.classList.remove('pointer-active'); });
  }

  function setupParallax() {
    const visual = document.querySelector('[data-parallax]');
    if (!visual || !finePointer.matches) return;
    const reset = () => { visual.style.setProperty('--parallax-x', '0px'); visual.style.setProperty('--parallax-y', '0px'); };
    visual.addEventListener('pointermove', event => {
      if (motionPaused) return reset();
      const box = visual.getBoundingClientRect();
      visual.style.setProperty('--parallax-x', `${((event.clientX - box.left) / box.width - .5) * 16}px`);
      visual.style.setProperty('--parallax-y', `${((event.clientY - box.top) / box.height - .5) * 14}px`);
    });
    visual.addEventListener('pointerleave', reset);
    motionListeners.add(paused => { if (paused) reset(); });
  }

  function setupTiltCards() {
    if (!finePointer.matches) return;
    document.querySelectorAll('[data-tilt]').forEach(card => {
      const reset = () => { card.style.setProperty('--tilt-x', '0deg'); card.style.setProperty('--tilt-y', '0deg'); };
      card.addEventListener('pointermove', event => {
        if (motionPaused) return reset();
        const box = card.getBoundingClientRect();
        const x = (event.clientX - box.left) / box.width - .5;
        const y = (event.clientY - box.top) / box.height - .5;
        card.style.setProperty('--tilt-x', `${(-y * 3.2).toFixed(2)}deg`);
        card.style.setProperty('--tilt-y', `${(x * 4.2).toFixed(2)}deg`);
      });
      card.addEventListener('pointerleave', reset);
      motionListeners.add(paused => { if (paused) reset(); });
    });
  }

  function setupMagneticTargets() {
    if (!finePointer.matches) return;
    document.querySelectorAll('[data-magnetic]').forEach(target => {
      const reset = () => { target.style.setProperty('--mag-x', '0px'); target.style.setProperty('--mag-y', '0px'); };
      target.addEventListener('pointermove', event => {
        if (motionPaused) return reset();
        const box = target.getBoundingClientRect();
        target.style.setProperty('--mag-x', `${(event.clientX - box.left - box.width / 2) * .12}px`);
        target.style.setProperty('--mag-y', `${(event.clientY - box.top - box.height / 2) * .16}px`);
      });
      target.addEventListener('pointerleave', reset);
      motionListeners.add(paused => { if (paused) reset(); });
    });
  }

  function setupProjectFilters() {
    const filters = [...document.querySelectorAll('[data-filter]')];
    const projects = [...document.querySelectorAll('article[data-category]')];
    const count = document.querySelector('#project-count');
    if (!filters.length || !projects.length) return;
    function applyFilter(filter) {
      let visible = 0;
      projects.forEach(project => {
        const categories = (project.getAttribute('data-category') || '').split(/\s+/);
        const matches = filter === 'all' || categories.includes(filter);
        project.hidden = !matches;
        if (matches) { visible += 1; project.classList.add('is-visible'); }
      });
      filters.forEach(button => {
        const selected = button.getAttribute('data-filter') === filter;
        button.setAttribute('aria-pressed', String(selected));
        button.classList.toggle('is-active', selected);
      });
      if (count) count.textContent = `${visible} ${visible === 1 ? 'project' : 'projects'}`;
    }
    filters.forEach(button => button.addEventListener('click', () => applyFilter(button.getAttribute('data-filter') || 'all')));
    applyFilter(filters.find(button => button.getAttribute('aria-pressed') === 'true')?.getAttribute('data-filter') || 'all');
  }

  function setupProjectDialog() {
    const dialog = document.querySelector('#project-dialog');
    const content = document.querySelector('#dialog-content');
    const closeButton = document.querySelector('#dialog-close');
    if (!(dialog instanceof HTMLDialogElement) || !content) return;
    let trigger = null;
    document.querySelectorAll('[data-project]').forEach(button => button.addEventListener('click', () => {
      const template = document.getElementById(`project-${button.getAttribute('data-project')}`);
      if (!(template instanceof HTMLTemplateElement)) return;
      trigger = button;
      content.replaceChildren(template.content.cloneNode(true));
      const heading = content.querySelector('h1, h2, h3');
      if (heading) { heading.id ||= 'project-dialog-title'; dialog.setAttribute('aria-labelledby', heading.id); }
      if (!dialog.open) dialog.showModal();
      closeButton?.focus({ preventScroll: true });
    }));
    closeButton?.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const box = dialog.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
    });
    dialog.addEventListener('close', () => { if (trigger?.isConnected) trigger.focus({ preventScroll: true }); });
  }

  function setupEmailCopy() {
    const button = document.querySelector('#copy-email');
    const status = document.querySelector('#copy-status');
    if (!button) return;
    const email = 'owenchen0408@gmail.com';
    button.addEventListener('click', async () => {
      try {
        if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
        await navigator.clipboard.writeText(email);
        if (status) status.textContent = 'Email address copied.';
      } catch {
        if (status) status.textContent = `Email: ${email}. Opening your email app.`;
        window.location.href = `mailto:${email}`;
      }
    });
  }

  function setupNavigation() {
    const links = [...document.querySelectorAll('a[data-nav][href^="#"]')];
    const destinations = links.map(link => ({ link, section: document.getElementById(link.getAttribute('href')?.slice(1)) })).filter(item => item.section);
    if (!destinations.length || !('IntersectionObserver' in window)) return;
    const visible = new Map();
    const activate = link => destinations.forEach(item => {
      const active = item.link === link;
      item.link.classList.toggle('active', active);
      if (active) item.link.setAttribute('aria-current', 'location'); else item.link.removeAttribute('aria-current');
    });
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => entry.isIntersecting ? visible.set(entry.target, entry) : visible.delete(entry.target));
      const nearest = [...visible.values()].sort((a, b) => Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top))[0];
      if (nearest) activate(destinations.find(item => item.section === nearest.target)?.link);
    }, { rootMargin: '-10% 0px -60% 0px', threshold: 0 });
    destinations.forEach(({ link, section }) => { observer.observe(section); link.addEventListener('click', () => activate(link)); });
  }

  setupLogoLoops();
  setupReveals();
  setupCounters();
  setupScrollMotion();
  setupPointerGlow();
  setupParallax();
  setupTiltCards();
  setupMagneticTargets();
  setupProjectFilters();
  setupProjectDialog();
  setupEmailCopy();
  setupNavigation();
  root.classList.add('enhanced');
})();
