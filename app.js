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

  function setupThemeCycle() {
    const button = document.querySelector('#theme-cycle');
    if (!button) return;
    const themes = [
      { id: 'acid', label: 'Acid' },
      { id: 'cyan', label: 'Cyan' },
      { id: 'orange', label: 'Orange' },
    ];
    let index = 0;
    try {
      const saved = window.localStorage.getItem('owen-portfolio-theme');
      const savedIndex = themes.findIndex(theme => theme.id === saved);
      if (savedIndex >= 0) index = savedIndex;
    } catch { /* Theme persistence is optional. */ }
    function apply() {
      root.dataset.theme = themes[index].id;
      button.textContent = `Theme · ${themes[index].label}`;
      button.setAttribute('aria-label', `Accent theme: ${themes[index].label}. Activate to change.`);
    }
    button.addEventListener('click', () => {
      index = (index + 1) % themes.length;
      apply();
      try { window.localStorage.setItem('owen-portfolio-theme', themes[index].id); } catch { /* Optional. */ }
    });
    apply();
  }

  function setupFocusSwitcher() {
    const buttons = [...document.querySelectorAll('[data-focus]')];
    const status = document.querySelector('#focus-status');
    if (!buttons.length || !status) return;
    const descriptions = {
      semiconductors: 'Characterization, metrology, and reliability.',
      robotics: 'Kinematics, control, and rapid physical iteration.',
      embedded: 'PCB design, instrumentation, and hardware validation.',
    };
    buttons.forEach(button => button.addEventListener('click', () => {
      const focus = button.getAttribute('data-focus') || 'semiconductors';
      buttons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      document.querySelector('.hero')?.setAttribute('data-focus-view', focus);
      status.textContent = descriptions[focus] || descriptions.semiconductors;
    }));
  }

  function setupExperienceAccordions() {
    document.querySelectorAll('.experience-toggle').forEach(button => {
      button.addEventListener('click', () => {
        const detail = document.getElementById(button.getAttribute('aria-controls') || '');
        if (!detail) return;
        const expanded = button.getAttribute('aria-expanded') === 'true';
        button.setAttribute('aria-expanded', String(!expanded));
        detail.hidden = expanded;
        const marker = button.querySelector('span');
        if (marker) marker.textContent = expanded ? '+' : '−';
      });
    });
  }

  function setupPhotoViewer() {
    const dialog = document.querySelector('#photo-dialog');
    const image = document.querySelector('#photo-image');
    const caption = document.querySelector('#photo-caption');
    const close = document.querySelector('#photo-close');
    if (!(dialog instanceof HTMLDialogElement) || !(image instanceof HTMLImageElement) || !caption) return;
    document.querySelectorAll('[data-photo]').forEach(button => button.addEventListener('click', () => {
      const description = button.getAttribute('data-caption') || 'Project photo';
      image.src = button.getAttribute('data-photo') || '';
      image.alt = description;
      caption.textContent = description;
      dialog.showModal();
      close?.focus({ preventScroll: true });
    }));
    close?.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  }

  function setupCommandPalette() {
    const dialog = document.querySelector('#command-dialog');
    const open = document.querySelector('#command-open');
    const search = document.querySelector('#command-search');
    const links = [...document.querySelectorAll('#command-results a')];
    if (!(dialog instanceof HTMLDialogElement) || !(search instanceof HTMLInputElement) || !open) return;
    function show() {
      if (!dialog.open) dialog.showModal();
      search.value = '';
      links.forEach(link => { link.hidden = false; });
      window.setTimeout(() => search.focus(), 0);
    }
    open.addEventListener('click', show);
    document.addEventListener('keydown', event => {
      const target = event.target;
      const typing = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;
      if ((event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) || (event.key === '/' && !typing)) {
        event.preventDefault();
        show();
      }
    });
    search.addEventListener('input', () => {
      const query = search.value.trim().toLowerCase();
      links.forEach(link => { link.hidden = !(link.getAttribute('data-command-label') || '').includes(query); });
    });
    search.addEventListener('keydown', event => {
      const visible = links.filter(link => !link.hidden);
      if (event.key === 'ArrowDown' && visible[0]) { event.preventDefault(); visible[0].focus(); }
      if (event.key === 'Enter' && visible[0]) { event.preventDefault(); visible[0].click(); }
    });
    dialog.addEventListener('keydown', event => {
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
      const visible = links.filter(link => !link.hidden);
      const current = visible.indexOf(document.activeElement);
      if (current < 0) return;
      event.preventDefault();
      const next = event.key === 'ArrowDown' ? (current + 1) % visible.length : (current - 1 + visible.length) % visible.length;
      visible[next]?.focus();
    });
    links.forEach(link => link.addEventListener('click', () => dialog.close()));
  }

  function setupProjectCompare() {
    const buttons = [...document.querySelectorAll('[data-compare]')];
    const tray = document.querySelector('#compare-tray');
    const selection = document.querySelector('#compare-selection');
    const open = document.querySelector('#compare-open');
    const clear = document.querySelector('#compare-clear');
    const dialog = document.querySelector('#project-dialog');
    const dialogContent = document.querySelector('#dialog-content');
    if (!buttons.length || !tray || !selection || !open || !clear || !(dialog instanceof HTMLDialogElement) || !dialogContent) return;
    const selected = new Set();
    const titleFor = id => document.querySelector(`[data-compare="${id}"]`)?.closest('.project-card')?.querySelector('h3')?.textContent?.trim() || id;
    function update() {
      buttons.forEach(button => {
        const active = selected.has(button.getAttribute('data-compare'));
        button.setAttribute('aria-pressed', String(active));
        button.classList.toggle('is-selected', active);
        const marker = button.querySelector('span');
        if (marker) marker.textContent = active ? '✓' : '+';
      });
      tray.hidden = selected.size === 0;
      selection.textContent = selected.size ? [...selected].map(titleFor).join(' + ') : 'Choose two projects';
      open.disabled = selected.size !== 2;
    }
    buttons.forEach(button => button.addEventListener('click', () => {
      const id = button.getAttribute('data-compare');
      if (!id) return;
      if (selected.has(id)) selected.delete(id);
      else if (selected.size < 2) selected.add(id);
      else {
        const first = selected.values().next().value;
        selected.delete(first);
        selected.add(id);
      }
      update();
    }));
    clear.addEventListener('click', () => { selected.clear(); update(); });
    open.addEventListener('click', () => {
      if (selected.size !== 2) return;
      const article = document.createElement('article');
      article.className = 'dialog-project comparison-dialog';
      const label = document.createElement('p');
      label.className = 'project-label';
      label.textContent = 'Side-by-side project view';
      const heading = document.createElement('h2');
      heading.id = 'project-dialog-title';
      heading.textContent = 'Compare the systems';
      const grid = document.createElement('div');
      grid.className = 'comparison-grid';
      selected.forEach(id => {
        const template = document.getElementById(`project-${id}`);
        if (!(template instanceof HTMLTemplateElement)) return;
        const source = template.content;
        const panel = document.createElement('section');
        const title = document.createElement('h3');
        title.textContent = source.querySelector('h2')?.textContent || titleFor(id);
        const summary = document.createElement('p');
        summary.textContent = source.querySelector('.dialog-grid p')?.textContent || '';
        const list = source.querySelector('ul')?.cloneNode(true);
        panel.append(title, summary);
        if (list) panel.append(list);
        grid.append(panel);
      });
      article.append(label, heading, grid);
      dialogContent.replaceChildren(article);
      dialog.setAttribute('aria-labelledby', heading.id);
      dialog.showModal();
    });
    update();
  }

  function setupToolExplorer() {
    const loop = document.querySelector('.logo-loop');
    const search = document.querySelector('#tool-search');
    const filters = [...document.querySelectorAll('[data-tool-filter]')];
    const speed = document.querySelector('#tool-speed');
    const detail = document.querySelector('#tool-detail');
    if (!loop || !(search instanceof HTMLInputElement) || !filters.length || !speed || !detail) return;
    const categoryMap = {
      code: ['python','c','c++','java','matlab','systemverilog','verilog','git','github','linux','thinlinc','vs code','jupyter','numpy','pandas','windows'],
      controls: ['ros 2','isaac gym','pinocchio','osqp'],
      cad: ['solidworks','siemens nx','fusion 360','g-code'],
      hardware: ['ltspice','altium designer','kicad','raspberry pi','esp32','teensy'],
      metrology: ['labview','ni vision','keyence','cary','hapsite','gige vision'],
    };
    let activeFilter = 'all';
    function categoryFor(label) {
      return Object.entries(categoryMap).find(([, names]) => names.some(name => name.length <= 2 ? label === name : label.includes(name)))?.[0] || 'hardware';
    }
    function apply() {
      const query = search.value.trim().toLowerCase();
      const filtering = Boolean(query) || activeFilter !== 'all';
      loop.classList.toggle('filtered', filtering);
      loop.querySelectorAll('.logo-group:not([aria-hidden="true"]) figure').forEach(figure => {
        const label = figure.querySelector('figcaption')?.textContent?.trim().toLowerCase() || '';
        const matches = (!query || label.includes(query)) && (activeFilter === 'all' || categoryFor(label) === activeFilter);
        figure.hidden = !matches;
      });
      filters.forEach(button => button.setAttribute('aria-pressed', String(button.getAttribute('data-tool-filter') === activeFilter)));
    }
    filters.forEach(button => button.addEventListener('click', () => { activeFilter = button.getAttribute('data-tool-filter') || 'all'; apply(); }));
    search.addEventListener('input', apply);
    const speeds = [
      { id: 'normal', label: 'Normal' },
      { id: 'slow', label: 'Slow' },
      { id: 'fast', label: 'Fast' },
    ];
    let speedIndex = 0;
    speed.addEventListener('click', () => {
      speedIndex = (speedIndex + 1) % speeds.length;
      loop.dataset.speed = speeds[speedIndex].id;
      speed.textContent = `Rail speed · ${speeds[speedIndex].label}`;
    });
    loop.querySelectorAll('.logo-group:not([aria-hidden="true"]) figure').forEach(figure => {
      const label = figure.querySelector('figcaption')?.textContent?.trim() || 'Tool';
      figure.tabIndex = 0;
      figure.setAttribute('role', 'button');
      figure.setAttribute('aria-label', `Inspect ${label}`);
      const select = () => {
        loop.querySelectorAll('figure.is-tool-selected').forEach(item => item.classList.remove('is-tool-selected'));
        figure.classList.add('is-tool-selected');
        const category = categoryFor(label.toLowerCase());
        const descriptions = {
          code: 'Programming, analysis, and development workflow.',
          controls: 'Robotics, optimization, and control systems.',
          cad: 'Mechanical design and manufacturing workflow.',
          hardware: 'Circuits, embedded platforms, and board design.',
          metrology: 'Instrumentation, imaging, and characterization.',
        };
        const categoryNode = detail.querySelector('span');
        const titleNode = detail.querySelector('strong');
        const descriptionNode = detail.querySelector('p');
        if (categoryNode) categoryNode.textContent = category;
        if (titleNode) titleNode.textContent = label;
        if (descriptionNode) descriptionNode.textContent = descriptions[category] || descriptions.hardware;
      };
      figure.addEventListener('click', select);
      figure.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(); } });
    });
    apply();
  }

  function setupBackToTop() {
    const button = document.querySelector('#back-to-top');
    if (!button) return;
    const update = () => button.classList.toggle('is-visible', window.scrollY > 700);
    window.addEventListener('scroll', update, { passive: true });
    button.addEventListener('click', () => window.scrollTo({ top: 0, behavior: motionPaused ? 'auto' : 'smooth' }));
    update();
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
  setupThemeCycle();
  setupFocusSwitcher();
  setupExperienceAccordions();
  setupPhotoViewer();
  setupCommandPalette();
  setupProjectFilters();
  setupProjectDialog();
  setupProjectCompare();
  setupToolExplorer();
  setupEmailCopy();
  setupNavigation();
  setupBackToTop();
  root.classList.add('enhanced');
})();
