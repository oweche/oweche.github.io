(() => {
  'use strict';

  const root = document.documentElement;
  const query = selector => document.querySelector(selector);
  const queryAll = selector => [...document.querySelectorAll(selector)];
  const engine = window.KineticLab || window.LabEngine;
  const clamp = engine?.clamp || ((value, min, max) => Math.min(max, Math.max(min, value)));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const motionListeners = new Set();
  const motionButton = query('#motion-toggle');
  const storageKey = 'owen-portfolio-motion';
  let savedMotion = null;
  try { savedMotion = localStorage.getItem(storageKey); } catch { /* Preferences are optional. */ }
  let motionPaused = reducedMotion.matches || savedMotion === 'paused';

  function setMotion(paused, remember = false) {
    motionPaused = paused || reducedMotion.matches;
    root.classList.toggle('motion-paused', motionPaused);
    if (motionButton) {
      motionButton.textContent = motionPaused ? 'Motion off' : 'Motion on';
      motionButton.setAttribute('aria-pressed', String(motionPaused));
      motionButton.setAttribute('aria-label', reducedMotion.matches
        ? 'Motion off, following your reduced-motion preference'
        : motionPaused ? 'Turn motion on' : 'Turn motion off');
      motionButton.disabled = reducedMotion.matches;
    }
    if (remember) {
      savedMotion = paused ? 'paused' : 'enabled';
      try { localStorage.setItem(storageKey, savedMotion); } catch { /* Apply for this visit. */ }
    }
    motionListeners.forEach(listener => listener(motionPaused));
  }
  setMotion(motionPaused);
  motionButton?.addEventListener('click', () => setMotion(!motionPaused, true));
  const syncMotion = () => setMotion(reducedMotion.matches || savedMotion === 'paused');
  if (reducedMotion.addEventListener) reducedMotion.addEventListener('change', syncMotion);
  else reducedMotion.addListener(syncMotion);

  const hero = query('[data-lab-root]');
  const stage = query('.lab-stage');
  const canvas = query('#lab-canvas');
  const context = canvas?.getContext('2d');
  let pointer = { x: 0.5, y: 0.5 };
  let accent = '#d9a84e';
  let heroProgress = 0;
  let redrawLab = () => {};

  if (hero && stage && canvas && context && engine) {
    let width = 1;
    let height = 1;
    let nodes = [];
    let frame = 0;
    let lastDraw = 0;
    let elapsed = 0;
    let lastTick = 0;
    let inView = hero.getBoundingClientRect().bottom > 0;

    function draw(time = elapsed) {
      context.clearRect(0, 0, width, height);
      const phase = motionPaused ? 0 : time * 0.00015;
      const shift = motionPaused ? 0 : heroProgress;
      const points = nodes.map((node, index) => {
        const depth = 0.3 + node.depth * 0.7;
        return {
          x: node.x * width + (pointer.x - 0.5) * depth * 42 + Math.sin(phase + index) * 12,
          y: node.y * height + (pointer.y - 0.5) * depth * 28 + Math.cos(phase + index * 0.7) * 9 - shift * depth * 60,
          depth,
        };
      });
      const reach = Math.min(width * 0.22, 235);
      context.lineWidth = 0.65;
      context.strokeStyle = accent;
      for (let i = 0; i < points.length; i += 1) {
        for (let j = i + 1; j < points.length; j += 1) {
          const distance = Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y);
          if (distance >= reach) continue;
          context.globalAlpha = (1 - distance / reach) * 0.22;
          context.beginPath();
          context.moveTo(points[i].x, points[i].y);
          context.lineTo(points[j].x, points[j].y);
          context.stroke();
        }
      }
      points.forEach((point, index) => {
        context.globalAlpha = 0.3 + point.depth * 0.5;
        context.fillStyle = index % 5 === 0 ? '#eef0e9' : accent;
        context.beginPath();
        context.arc(point.x, point.y, index % 5 === 0 ? 2 : 1.1, 0, Math.PI * 2);
        context.fill();
      });
      context.globalAlpha = 1;
    }
    function shouldRun() { return !motionPaused && !document.hidden && inView; }
    function tick(now) {
      frame = 0;
      if (!shouldRun()) return;
      elapsed += lastTick ? Math.min(now - lastTick, 50) : 0;
      lastTick = now;
      if (now - lastDraw >= 32) { draw(); lastDraw = now; }
      frame = requestAnimationFrame(tick);
    }
    function reconcile() {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      lastTick = 0;
      draw();
      if (shouldRun()) frame = requestAnimationFrame(tick);
    }
    function resize() {
      const box = stage.getBoundingClientRect();
      width = Math.max(1, box.width);
      height = Math.max(1, box.height);
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      nodes = engine.seededNodes(width < 700 || !finePointer.matches ? 34 : 68, 408);
      reconcile();
    }
    redrawLab = () => { if (!frame) draw(); };
    function influence(event) {
      if (motionPaused) return;
      const box = stage.getBoundingClientRect();
      pointer = engine.normalizePointer(event.clientX - box.left, event.clientY - box.top, width, height);
      stage.style.setProperty('--lab-pointer-x', `${(pointer.x - 0.5) * 18}px`);
      stage.style.setProperty('--lab-pointer-y', `${(pointer.y - 0.5) * 14}px`);
      redrawLab();
    }
    stage.addEventListener('pointermove', influence, { passive: true });
    stage.addEventListener('pointerdown', influence, { passive: true });
    stage.addEventListener('pointerleave', () => {
      pointer = { x: 0.5, y: 0.5 };
      stage.style.setProperty('--lab-pointer-x', '0px');
      stage.style.setProperty('--lab-pointer-y', '0px');
      redrawLab();
    });
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(stage);
    else window.addEventListener('resize', resize, { passive: true });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(entries => { inView = entries[0].isIntersecting; reconcile(); }).observe(hero);
    } else {
      window.addEventListener('scroll', () => {
        const box = hero.getBoundingClientRect();
        const visible = box.bottom > 0 && box.top < window.innerHeight;
        if (visible !== inView) { inView = visible; reconcile(); }
      }, { passive: true });
    }
    document.addEventListener('visibilitychange', reconcile);
    motionListeners.add(paused => {
      if (paused) {
        pointer = { x: 0.5, y: 0.5 };
        stage.style.setProperty('--lab-pointer-x', '0px');
        stage.style.setProperty('--lab-pointer-y', '0px');
      }
      reconcile();
    });
    resize();
  }

  const domainButtons = queryAll('[data-domain]');
  const imageMetadata = {
    'assets/photos/cleanroom.jpg': {
      alt: 'Owen Chen and a colleague in cleanroom PPE beside semiconductor imaging equipment',
      caption: 'Semiconductor characterization · Cleanroom',
      medium: 'Surface / spectrum / electrical evidence',
    },
    'assets/photos/robot-city.jpg': {
      alt: 'Bipedal city transport robot mounted on a laboratory test rig',
      caption: 'Bipedal city transport robot · Test rig',
      medium: 'Kinematics / control / system integration',
    },
    'assets/photos/robot-prototype.jpg': {
      alt: 'Compact white bipedal robot prototype on a workbench',
      caption: 'Compact bipedal prototype · Workbench',
      medium: 'Geometry / actuation / packaging',
    },
  };
  function selectDomain(id) {
    if (!engine) return;
    const domain = engine.resolveDomain(id);
    domainButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.domain === domain.id)));
    if (hero) hero.dataset.domain = domain.id;
    accent = domain.accent;
    root.style.setProperty('--domain-accent', accent);
    if (query('#lab-status-label')) query('#lab-status-label').textContent = domain.label;
    if (query('#lab-status')) query('#lab-status').textContent = domain.status;
    const image = query('#lab-specimen-image');
    const metadata = imageMetadata[domain.image];
    if (image) { image.src = domain.image; image.alt = domain.alt || metadata?.alt || domain.label; }
    if (query('#lab-specimen-caption')) query('#lab-specimen-caption').textContent = domain.caption || metadata?.caption || domain.label;
    if (query('#lab-specimen-medium')) query('#lab-specimen-medium').textContent = domain.medium || metadata?.medium || '';
    query('#lab-related-link')?.setAttribute('href', `#project-${domain.projectId}-story`);
    redrawLab();
  }
  domainButtons.forEach((button, index) => {
    button.addEventListener('click', () => selectDomain(button.dataset.domain));
    button.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % domainButtons.length;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + domainButtons.length) % domainButtons.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = domainButtons.length - 1;
      if (next === undefined) return;
      event.preventDefault();
      domainButtons[next].focus();
      domainButtons[next].click();
    });
  });
  selectDomain(domainButtons.find(button => button.getAttribute('aria-pressed') === 'true')?.dataset.domain || 'sensing');

  const revealElements = queryAll('[data-reveal]');
  const showAll = () => revealElements.forEach(element => element.classList.add('is-visible'));
  root.classList.add('js-reveals');
  if ('IntersectionObserver' in window && !motionPaused) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }), { threshold: 0.06, rootMargin: '0px 0px -20px 0px' });
    revealElements.forEach(element => observer.observe(element));
    motionListeners.add(paused => { if (paused) { showAll(); observer.disconnect(); } });
  } else showAll();

  const counters = queryAll('[data-counter]');
  const counterFrames = new Map();
  const completedCounters = new WeakSet();
  function counterText(element, value) {
    const decimals = Math.min((element.dataset.counter.split('.')[1] || '').length, 3);
    return `${element.dataset.prefix || ''}${value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${element.dataset.suffix || ''}`;
  }
  function finishCounter(element) {
    const value = Number(element.dataset.counter);
    if (Number.isFinite(value)) element.textContent = counterText(element, value);
    if (counterFrames.has(element)) cancelAnimationFrame(counterFrames.get(element));
    counterFrames.delete(element);
    completedCounters.add(element);
  }
  function animateCounter(element) {
    if (completedCounters.has(element) || counterFrames.has(element)) return;
    const target = Number(element.dataset.counter);
    if (!Number.isFinite(target) || motionPaused) return finishCounter(element);
    const started = performance.now();
    const tick = now => {
      if (motionPaused || document.hidden) return finishCounter(element);
      const progress = clamp((now - started) / 900, 0, 1);
      element.textContent = counterText(element, target * (1 - Math.pow(1 - progress, 3)));
      if (progress === 1) finishCounter(element);
      else counterFrames.set(element, requestAnimationFrame(tick));
    };
    counterFrames.set(element, requestAnimationFrame(tick));
  }
  if ('IntersectionObserver' in window && !motionPaused) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      animateCounter(entry.target);
      observer.unobserve(entry.target);
    }), { threshold: 0.4 });
    counters.forEach(element => observer.observe(element));
    motionListeners.add(paused => { if (paused) { observer.disconnect(); counters.forEach(finishCounter); } });
  } else counters.forEach(finishCounter);

  const navLinks = queryAll('a[data-nav][href^="#"]');
  const navSections = navLinks.map(link => ({ link, section: document.getElementById(link.hash.slice(1)) })).filter(item => item.section);
  const progressBar = query('.page-progress span');
  const backToTop = query('#back-to-top');
  const parallaxMedia = queryAll('[data-parallax-media]');
  let scrollQueued = false;
  function updateScroll() {
    scrollQueued = false;
    const scrollMax = Math.max(1, root.scrollHeight - window.innerHeight);
    if (progressBar) progressBar.style.transform = `scaleX(${clamp(window.scrollY / scrollMax, 0, 1)})`;
    query('.site-header')?.classList.toggle('is-condensed', window.scrollY > 40);
    if (hero) {
      const box = hero.getBoundingClientRect();
      heroProgress = clamp(-box.top / Math.max(1, box.height - window.innerHeight), 0, 1);
      hero.style.setProperty('--hero-progress', motionPaused ? '0' : String(heroProgress));
    }
    let current = navSections[0];
    navSections.forEach(item => { if (item.section.getBoundingClientRect().top <= window.innerHeight * 0.3) current = item; });
    if (window.scrollY + window.innerHeight >= root.scrollHeight - 5) current = navSections[navSections.length - 1];
    navSections.forEach(item => {
      const active = item === current;
      item.link.classList.toggle('active', active);
      if (active) item.link.setAttribute('aria-current', 'location');
      else item.link.removeAttribute('aria-current');
    });
    parallaxMedia.forEach(media => {
      const box = media.getBoundingClientRect();
      const offset = motionPaused || !finePointer.matches ? 0 : clamp((window.innerHeight / 2 - box.top - box.height / 2) * 0.035, -22, 22);
      media.style.setProperty('--media-shift', `${offset.toFixed(2)}px`);
    });
    const showTop = window.scrollY > 650;
    if (backToTop) { backToTop.classList.toggle('is-visible', showTop); backToTop.hidden = !showTop; }
    redrawLab();
  }
  function queueScroll() {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(updateScroll);
  }
  window.addEventListener('scroll', queueScroll, { passive: true });
  window.addEventListener('resize', queueScroll, { passive: true });
  window.addEventListener('load', queueScroll, { once: true });
  motionListeners.add(queueScroll);
  backToTop?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: motionPaused ? 'auto' : 'smooth' });
    query('.wordmark')?.focus({ preventScroll: true });
  });

  queryAll('.experience-toggle').forEach(button => button.addEventListener('click', () => {
    const detail = document.getElementById(button.getAttribute('aria-controls'));
    if (!detail) return;
    const open = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(open));
    button.textContent = open ? 'Hide evidence' : 'View evidence';
    detail.hidden = !open;
    queueScroll();
  }));

  const filters = queryAll('[data-filter]');
  const projects = queryAll('.system-story[data-category]');
  function filterProjects(filter) {
    let visible = 0;
    projects.forEach(project => {
      project.hidden = filter !== 'all' && !project.dataset.category.split(/\s+/).includes(filter);
      if (!project.hidden) { visible += 1; project.classList.add('is-visible'); }
    });
    filters.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === filter)));
    if (query('#project-count')) query('#project-count').textContent = `${visible} ${visible === 1 ? 'system' : 'systems'}`;
    queueScroll();
  }
  filters.forEach(button => button.addEventListener('click', () => filterProjects(button.dataset.filter)));
  query('#lab-related-link')?.addEventListener('click', () => filterProjects('all'));

  function prepareDialog(dialog, closeButton) {
    if (!dialog || typeof dialog.showModal !== 'function') return null;
    let returnFocus = null;
    closeButton?.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const box = dialog.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
    });
    dialog.addEventListener('close', () => {
      root.classList.toggle('dialog-open', Boolean(query('dialog[open]')));
      if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
      returnFocus = null;
    });
    return {
      open(trigger, initialFocus = closeButton) {
        if (dialog.open || query('dialog[open]')) return;
        returnFocus = trigger || document.activeElement;
        dialog.showModal();
        root.classList.add('dialog-open');
        initialFocus?.focus({ preventScroll: true });
      },
      close(restore = true) { if (!restore) returnFocus = null; dialog.close(); },
    };
  }
  const projectDialog = query('#project-dialog');
  const projectModal = prepareDialog(projectDialog, query('#dialog-close'));
  queryAll('[data-project]').forEach(button => button.addEventListener('click', () => {
    const template = document.getElementById(`project-${button.dataset.project}`);
    const content = query('#dialog-content');
    if (!projectModal || !template?.content || !content) return;
    content.replaceChildren(template.content.cloneNode(true));
    const heading = content.querySelector('h2');
    if (heading) { heading.id = 'project-dialog-title'; projectDialog.setAttribute('aria-labelledby', heading.id); }
    projectModal.open(button);
  }));
  const photoModal = prepareDialog(query('#photo-dialog'), query('#photo-close'));
  queryAll('[data-photo]').forEach(button => button.addEventListener('click', () => {
    if (!photoModal) return;
    const caption = button.dataset.caption || button.closest('.story-media')?.querySelector('img')?.alt || 'Project photo';
    query('#photo-image').src = button.dataset.photo;
    query('#photo-image').alt = caption;
    query('#photo-caption').textContent = caption;
    photoModal.open(button);
  }));

  const commandDialog = query('#command-dialog');
  const commandSearch = query('#command-search');
  const commandLinks = queryAll('[data-command-label]');
  const commandModal = prepareDialog(commandDialog, commandDialog?.querySelector('.dialog-close'));
  function filterCommands() {
    const value = commandSearch.value.trim().toLowerCase();
    commandLinks.forEach(link => { link.hidden = !`${link.dataset.commandLabel} ${link.textContent}`.toLowerCase().includes(value); });
  }
  function openCommands(trigger) {
    if (!commandModal || !commandSearch) return;
    commandSearch.value = '';
    filterCommands();
    commandModal.open(trigger, commandSearch);
  }
  query('#command-open')?.addEventListener('click', event => openCommands(event.currentTarget));
  document.addEventListener('keydown', event => {
    if ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      if (commandDialog?.open) commandModal?.close();
      else openCommands(document.activeElement);
    }
  });
  commandSearch?.addEventListener('input', filterCommands);
  commandDialog?.addEventListener('keydown', event => {
    const visible = commandLinks.filter(link => !link.hidden);
    if (!visible.length) return;
    if (event.key === 'Enter' && document.activeElement === commandSearch) { event.preventDefault(); visible[0].click(); return; }
    if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;
    const index = visible.indexOf(document.activeElement);
    if (index < 0 && document.activeElement !== commandSearch) return;
    event.preventDefault();
    const next = index < 0 ? (event.key === 'ArrowDown' ? 0 : visible.length - 1)
      : (index + (event.key === 'ArrowDown' ? 1 : -1) + visible.length) % visible.length;
    visible[next].focus();
  });
  commandLinks.forEach(link => link.addEventListener('click', () => {
    commandModal?.close(false);
    const section = document.getElementById(link.hash.slice(1));
    if (section) {
      const hadTabIndex = section.hasAttribute('tabindex');
      if (!hadTabIndex) section.setAttribute('tabindex', '-1');
      section.focus({ preventScroll: true });
      if (!hadTabIndex) section.addEventListener('blur', () => section.removeAttribute('tabindex'), { once: true });
    }
  }));

  const toolSearch = query('#tool-search');
  const toolButtons = queryAll('[data-tool]');
  const toolFilters = queryAll('[data-tool-filter]');
  const toolCopy = {
    code: 'Programming, analysis, and development tools for turning a system model or measurement into working code.',
    controls: 'Robotics, optimization, and simulation tools for modeling motion and developing control systems.',
    cad: 'Mechanical design and manufacturing tools for moving from geometry to a physical prototype.',
    hardware: 'Circuit design, simulation, and embedded platforms for building and validating electronic systems.',
    metrology: 'Instrumentation, imaging, and characterization tools for collecting repeatable physical evidence.',
  };
  const specificToolCopy = {
    Python: 'Measurement processing and statistical analysis, including optical spectroscopy and surface-characterization pipelines.',
    Java: 'Actuator control for FTC competition robotics.',
    'Fusion 360': 'Mechanical design and CAM workflows for prototype parts and CNC machining.',
    KiCad: 'PCB design for embedded sensing, including the nine-channel rehabilitation pressure-sensing board.',
    'Keyence VK-X-3000 / VHX-7000': 'Laser profilometry and microscopy for surface measurement and electronic-component characterization.',
    'Cary 6000i / Lambda 950': 'UV-Vis-NIR spectroscopy in repeatable electronic-component measurement workflows.',
  };
  let toolFilter = 'all';
  let selectedTool = null;
  function showTool(button) {
    selectedTool = button;
    toolButtons.forEach(item => { item.classList.toggle('is-selected', item === button); item.setAttribute('aria-pressed', String(item === button)); });
    query('#tool-detail-category').textContent = button.dataset.toolCategory;
    query('#tool-detail-name').textContent = button.dataset.tool;
    query('#tool-detail-copy').textContent = specificToolCopy[button.dataset.tool] || toolCopy[button.dataset.toolCategory];
  }
  function filterTools() {
    const value = toolSearch?.value.trim().toLowerCase() || '';
    let total = 0;
    toolButtons.forEach(button => {
      const searchable = `${button.dataset.tool} ${button.textContent} ${button.dataset.toolCategory}`.toLowerCase();
      button.hidden = !searchable.includes(value) || (toolFilter !== 'all' && button.dataset.toolCategory !== toolFilter);
      if (!button.hidden) total += 1;
    });
    toolFilters.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.toolFilter === toolFilter)));
    if (!total || !selectedTool || selectedTool.hidden) {
      selectedTool = null;
      toolButtons.forEach(button => { button.classList.remove('is-selected'); button.setAttribute('aria-pressed', 'false'); });
      query('#tool-detail-category').textContent = total ? 'System overview' : 'No matching tools';
      query('#tool-detail-name').textContent = total ? 'Inspect the stack' : 'Try another search';
      query('#tool-detail-copy').textContent = total ? 'Choose a tool to see where it fits in the engineering workflow.' : 'Clear the search or choose another category to explore the toolchain.';
    }
    queueScroll();
  }
  toolButtons.forEach(button => {
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => showTool(button));
  });
  toolFilters.forEach(button => button.addEventListener('click', () => { toolFilter = button.dataset.toolFilter; filterTools(); }));
  toolSearch?.addEventListener('input', filterTools);

  query('#copy-email')?.addEventListener('click', async () => {
    const email = 'owenchen0408@gmail.com';
    const status = query('#copy-status');
    let copied = false;
    try { await navigator.clipboard.writeText(email); copied = true; } catch {
      const previousFocus = document.activeElement;
      const field = document.createElement('textarea');
      field.value = email;
      field.setAttribute('aria-label', 'Email address to copy');
      field.style.cssText = 'position:fixed;left:-9999px;top:0;';
      document.body.append(field);
      field.select();
      try { copied = document.execCommand('copy'); } catch { /* Manual copy remains available. */ }
      field.remove();
      previousFocus?.focus({ preventScroll: true });
    }
    if (status) status.textContent = copied ? 'Email address copied.' : `Copy this address: ${email}`;
    const button = query('#copy-email');
    button.textContent = copied ? 'Email copied' : 'Select email to copy';
    if (!copied) {
      const emailLink = query('.contact-email');
      if (emailLink) {
        const range = document.createRange();
        range.selectNodeContents(emailLink);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    }
  });

  updateScroll();
  root.classList.add('enhanced');
})();
