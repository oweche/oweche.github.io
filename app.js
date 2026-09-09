(() => {
  'use strict';

  const root = document.documentElement;
  const motionButton = document.querySelector('#motion-toggle');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const motionListeners = new Set();
  const motionStorageKey = 'owen-portfolio-motion';
  let savedMotion = null;
  try {
    savedMotion = window.localStorage.getItem(motionStorageKey);
  } catch {
    // Storage can be disabled without affecting any interaction.
  }
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
      try {
        window.localStorage.setItem(motionStorageKey, savedMotion);
      } catch {
        // The current choice still applies for this visit.
      }
    }
    motionListeners.forEach(listener => listener(paused));
  }

  setMotionPaused(motionPaused);
  motionButton?.addEventListener('click', () => setMotionPaused(!motionPaused, true));
  const syncMotionPreference = () => setMotionPaused(reducedMotion.matches || savedMotion === 'paused');
  if (reducedMotion.addEventListener) {
    reducedMotion.addEventListener('change', syncMotionPreference);
  } else {
    reducedMotion.addListener(syncMotionPreference);
  }

  function setupReveals() {
    const elements = [...document.querySelectorAll('[data-reveal]')];
    const showAll = () => elements.forEach(element => element.classList.add('is-visible'));
    if (!('IntersectionObserver' in window) || motionPaused) {
      showAll();
      return;
    }
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
    const running = new Map();
    const finished = new WeakSet();
    let frame = 0;

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
      running.delete(element);
    }

    function tick(now) {
      frame = 0;
      running.forEach((state, element) => {
        const progress = Math.min((now - state.started) / 1100, 1);
        if (progress >= 1) {
          finish(element);
        } else {
          const eased = 1 - Math.pow(1 - progress, 3);
          element.textContent = format(element, state.target * eased);
        }
      });
      if (running.size) frame = window.requestAnimationFrame(tick);
    }

    function start(element) {
      if (finished.has(element) || running.has(element)) return;
      const target = Number(element.getAttribute('data-counter'));
      if (!Number.isFinite(target)) return;
      if (motionPaused || document.hidden) {
        finish(element);
        return;
      }
      running.set(element, { target, started: performance.now() });
      if (!frame) frame = window.requestAnimationFrame(tick);
    }

    function finishRunning() {
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      [...running.keys()].forEach(finish);
    }

    if ('IntersectionObserver' in window && !motionPaused) {
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          start(entry.target);
          observer.unobserve(entry.target);
        });
      }, { threshold: 0.3 });
      counters.forEach(element => observer.observe(element));
      motionListeners.add(paused => {
        if (!paused) return;
        observer.disconnect();
        finishRunning();
        counters.forEach(finish);
      });
    } else {
      counters.forEach(finish);
    }
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) finishRunning();
    });
  }

  function setupSignal() {
    const canvas = document.querySelector('#signal-canvas');
    if (!(canvas instanceof HTMLCanvasElement)) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const frequencyInput = document.querySelector('#frequency');
    const amplitudeInput = document.querySelector('#amplitude');
    const waveformInput = document.querySelector('#waveform');
    const frequencyOutput = document.querySelector('#frequency-value');
    const amplitudeOutput = document.querySelector('#amplitude-value');
    let frequency = 2;
    let amplitude = 48;
    let waveform = 'sine';
    let width = 0;
    let height = 0;
    let frame = 0;
    let previousTime = null;
    let elapsed = 0;
    let isVisible = true;

    function readControls() {
      const inputFrequency = Number(frequencyInput?.value ?? 2);
      const inputAmplitude = Number(amplitudeInput?.value ?? 48);
      frequency = Number.isFinite(inputFrequency) ? Math.min(8, Math.max(1, inputFrequency)) : 2;
      amplitude = Number.isFinite(inputAmplitude) ? Math.min(90, Math.max(10, inputAmplitude)) : 48;
      waveform = ['sine', 'square', 'triangle'].includes(waveformInput?.value) ? waveformInput.value : 'sine';
      if (frequencyOutput) frequencyOutput.textContent = `${frequency.toFixed(1)} Hz`;
      if (amplitudeOutput) amplitudeOutput.textContent = `${Math.round(amplitude)}%`;
      frequencyInput?.setAttribute('aria-valuetext', `${frequency.toFixed(1)} hertz`);
      amplitudeInput?.setAttribute('aria-valuetext', `${Math.round(amplitude)} percent`);
      canvas.setAttribute('aria-label', `Illustrative ${waveform} wave at ${frequency.toFixed(1)} hertz and ${Math.round(amplitude)} percent amplitude.`);
    }

    function signalAt(x) {
      const cycles = ((x / width) * 2 - elapsed * 0.35) * frequency;
      let signal;
      if (waveform === 'square') signal = Math.sin(cycles * Math.PI * 2) >= 0 ? 1 : -1;
      else if (waveform === 'triangle') signal = (2 / Math.PI) * Math.asin(Math.sin(cycles * Math.PI * 2));
      else signal = Math.sin(cycles * Math.PI * 2);
      return height / 2 - signal * (height * 0.39) * (amplitude / 100);
    }

    function draw() {
      if (width <= 0 || height <= 0) return;
      context.clearRect(0, 0, width, height);
      context.fillStyle = '#07171d';
      context.fillRect(0, 0, width, height);

      const cell = Math.max(28, Math.min(48, width / 14));
      context.lineWidth = 1;
      context.strokeStyle = 'rgba(122, 193, 190, 0.09)';
      context.beginPath();
      for (let x = 0.5; x <= width; x += cell) {
        context.moveTo(x, 0);
        context.lineTo(x, height);
      }
      for (let y = height / 2 % cell; y <= height; y += cell) {
        context.moveTo(0, y + 0.5);
        context.lineTo(width, y + 0.5);
      }
      context.stroke();
      context.strokeStyle = 'rgba(122, 193, 190, 0.24)';
      context.setLineDash([4, 5]);
      context.beginPath();
      context.moveTo(0, height / 2);
      context.lineTo(width, height / 2);
      context.stroke();
      context.setLineDash([]);

      const line = new Path2D();
      line.moveTo(0, signalAt(0));
      for (let x = 1; x <= width; x += 1) line.lineTo(x, signalAt(x));
      context.lineJoin = 'round';
      context.lineCap = 'round';
      context.strokeStyle = 'rgba(101, 235, 204, 0.10)';
      context.lineWidth = 10;
      context.stroke(line);
      context.strokeStyle = 'rgba(101, 235, 204, 0.20)';
      context.lineWidth = 5;
      context.stroke(line);
      context.strokeStyle = '#75e9cb';
      context.lineWidth = 2;
      context.stroke(line);

      const markerX = width * 0.78;
      const markerY = signalAt(markerX);
      context.fillStyle = 'rgba(196, 255, 231, 0.13)';
      context.beginPath();
      context.arc(markerX, markerY, 11, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#dcfff1';
      context.beginPath();
      context.arc(markerX, markerY, 3.5, 0, Math.PI * 2);
      context.fill();
    }

    function canAnimate() {
      return !motionPaused && !document.hidden && isVisible && width > 0 && height > 0;
    }

    function tick(now) {
      frame = 0;
      if (!canAnimate()) {
        previousTime = null;
        return;
      }
      if (previousTime !== null) elapsed += Math.min((now - previousTime) / 1000, 0.05);
      previousTime = now;
      draw();
      frame = window.requestAnimationFrame(tick);
    }

    function syncAnimation() {
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      previousTime = null;
      draw();
      if (canAnimate()) frame = window.requestAnimationFrame(tick);
    }

    function resize() {
      const bounds = canvas.getBoundingClientRect();
      width = bounds.width;
      height = bounds.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      syncAnimation();
    }

    [frequencyInput, amplitudeInput, waveformInput].forEach(input => {
      input?.addEventListener('input', () => {
        readControls();
        draw();
      });
    });
    document.querySelector('#signal-reset')?.addEventListener('click', () => {
      if (frequencyInput) frequencyInput.value = '2';
      if (amplitudeInput) amplitudeInput.value = '48';
      if (waveformInput) waveformInput.value = 'sine';
      elapsed = 0;
      readControls();
      syncAnimation();
    });
    motionListeners.add(syncAnimation);
    document.addEventListener('visibilitychange', syncAnimation);
    window.addEventListener('resize', resize, { passive: true });
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        isVisible = entries[0].isIntersecting;
        syncAnimation();
      }, { threshold: 0 });
      observer.observe(canvas);
    }
    readControls();
    resize();
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
        if (matches) {
          visible += 1;
          project.classList.add('is-visible');
        }
      });
      filters.forEach(button => {
        const selected = button.getAttribute('data-filter') === filter;
        button.setAttribute('aria-pressed', String(selected));
        button.classList.toggle('is-active', selected);
      });
      if (count) count.textContent = `${visible} ${visible === 1 ? 'project' : 'projects'}`;
    }
    filters.forEach(button => button.addEventListener('click', () => applyFilter(button.getAttribute('data-filter') || 'all')));
    const selected = filters.find(button => button.getAttribute('aria-pressed') === 'true');
    applyFilter(selected?.getAttribute('data-filter') || 'all');
  }

  function setupProjectDialog() {
    const dialog = document.querySelector('#project-dialog');
    const content = document.querySelector('#dialog-content');
    const closeButton = document.querySelector('#dialog-close');
    if (!(dialog instanceof HTMLDialogElement) || !content) return;
    let trigger = null;
    document.querySelectorAll('[data-project]').forEach(button => {
      button.addEventListener('click', () => {
        const template = document.getElementById(`project-${button.getAttribute('data-project')}`);
        if (!(template instanceof HTMLTemplateElement)) return;
        trigger = button;
        content.replaceChildren(template.content.cloneNode(true));
        const heading = content.querySelector('h1, h2, h3');
        if (heading) {
          if (!heading.id) heading.id = 'project-dialog-title';
          dialog.setAttribute('aria-labelledby', heading.id);
        } else {
          dialog.removeAttribute('aria-labelledby');
          dialog.setAttribute('aria-label', 'Project details');
        }
        if (!dialog.open) dialog.showModal();
        closeButton?.focus({ preventScroll: true });
      });
    });
    closeButton?.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const bounds = dialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) {
        dialog.close();
      }
    });
    dialog.addEventListener('close', () => {
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    });
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
    const destinations = links.map(link => {
      const id = link.getAttribute('href')?.slice(1);
      return { link, section: id ? document.getElementById(id) : null };
    }).filter(item => item.section);
    if (!destinations.length || !('IntersectionObserver' in window)) return;
    const visible = new Map();
    function activate(link) {
      destinations.forEach(item => {
        const active = item.link === link;
        item.link.classList.toggle('is-active', active);
        if (active) item.link.setAttribute('aria-current', 'location');
        else item.link.removeAttribute('aria-current');
      });
    }
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) visible.set(entry.target, entry);
        else visible.delete(entry.target);
      });
      const nearest = [...visible.values()].sort((a, b) => Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top))[0];
      if (nearest) activate(destinations.find(item => item.section === nearest.target)?.link);
    }, { rootMargin: '-10% 0px -60% 0px', threshold: 0 });
    destinations.forEach(({ link, section }) => {
      observer.observe(section);
      link.addEventListener('click', () => activate(link));
    });
  }

  setupReveals();
  setupCounters();
  setupSignal();
  setupProjectFilters();
  setupProjectDialog();
  setupEmailCopy();
  setupNavigation();
  root.classList.add('enhanced');
})();
