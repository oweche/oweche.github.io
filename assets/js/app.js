/* Core UI: boot, cursor, nav, reveal, counters, tilt, modal, lightbox, gallery,
   timeline, magnifier, constellation, fab-shop widgets, terminal, theme, easter eggs. */
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(pointer: fine)").matches;
  const S = window.SITE;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} }
  };
  window.UI = {};

  /* ---------------- toast ---------------- */
  let toastT;
  function toast(msg) {
    const t = $("#toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 2200);
  }
  UI.toast = toast;

  /* ---------------- boot ---------------- */
  const boot = $("#boot");
  const lines = [
    ["BENCH OS v2.0 — owen chen", "hl"],
    ["POST ............................................ ", "", "OK"],
    ["mounting /cleanroom (yellow light: safe) ........ ", "", "OK"],
    ["spinning up wafer @ 3000 rpm .................... ", "", "OK"],
    ["calibrating VK-X3000 z-stage .................... ", "", "OK"],
    ["solving riccati for biped balance ............... ", "", "OK"],
    ["loading 8 instruments + case files .............. ", "", "OK"],
    ["ready. welcome.", "hl"]
  ];
  let booted = false;
  function finishBoot() {
    if (booted) return; booted = true;
    boot.classList.add("done");
    document.body.classList.remove("locked");
    setTimeout(() => boot.remove(), 900);
    startHero();
  }
  const ss = { get(k) { try { return window.sessionStorage.getItem(k); } catch { return null; } }, set(k, v) { try { window.sessionStorage.setItem(k, v); } catch {} } };
  if (ss.get("booted") || reduce) {
    boot.remove(); booted = true; requestAnimationFrame(startHero);
  } else {
    document.body.classList.add("locked");
    const log = $("#boot-log"), fill = $("#boot-fill");
    let i = 0;
    const step = () => {
      if (booted) return;
      if (i >= lines.length) { setTimeout(finishBoot, 350); return; }
      const [txt, cls, ok] = lines[i];
      const row = document.createElement("div");
      row.innerHTML = `<span class="${cls}">${txt}</span>${ok ? `<span class="ok">${ok}</span>` : ""}`;
      log.appendChild(row);
      i++; fill.style.width = (i / lines.length * 100) + "%";
      setTimeout(step, 120 + Math.random() * 120);
    };
    setTimeout(step, 200);
    const skip = () => finishBoot();
    $("#boot-skip").addEventListener("click", skip);
    addEventListener("keydown", skip, { once: true });
    boot.addEventListener("click", skip);
    ss.set("booted", "1");
  }

  /* ---------------- hero text ---------------- */
  const GLYPHS = "!<>-_\\/[]{}—=+*^?#01ABCDEFXYZ";
  function scramble(el, final, dur = 1200) {
    const start = performance.now();
    const len = final.length;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / dur);
      let out = "";
      for (let i = 0; i < len; i++) {
        const reveal = p * len * 1.2 - i * 0.6;
        out += reveal >= 1 ? final[i] : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      el.textContent = out;
      if (p < 1) requestAnimationFrame(tick); else el.textContent = final;
    };
    requestAnimationFrame(tick);
  }
  UI.scramble = scramble;
  const roles = [
    "build wheeled bipedal robots", "pattern wafers under yellow light", "route power & CAN PCBs",
    "measure surfaces to the micron", "machine parts on a CNC router", "tune analog filters by ear & scope",
    "keep multi-material printers alive", "design compliant TPU lattices"
  ];
  function rotateRoles() {
    const el = $("#role"); let ri = 0;
    const type = async () => {
      while (true) {
        await wait(2600);
        const cur = el.textContent;
        for (let k = cur.length; k >= 0; k--) { el.textContent = cur.slice(0, k); await wait(18); }
        ri = (ri + 1) % roles.length;
        const nxt = roles[ri];
        for (let k = 1; k <= nxt.length; k++) { el.textContent = nxt.slice(0, k); await wait(38); }
      }
    };
    if (!reduce) type();
  }
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  function startHero() {
    $$(".hero .scramble").forEach((el, i) => setTimeout(() => scramble(el, el.dataset.text, 1100), i * 220));
    $$(".hero .reveal").forEach((el, i) => setTimeout(() => el.classList.add("in"), 300 + i * 120));
    rotateRoles();
    window.dispatchEvent(new Event("hero:start"));
  }

  /* clock */
  const clock = $("#clock");
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone: "America/Indiana/Indianapolis", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  setInterval(() => { clock.textContent = fmt.format(new Date()) + " EST"; }, 1000);
  $("#year").textContent = new Date().getFullYear();

  /* ---------------- cursor ---------------- */
  if (fine && !reduce) {
    document.documentElement.classList.add("has-cursor");
    const dot = $(".cursor-dot"), ring = $(".cursor-ring"), label = $(".cursor-label");
    let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
    addEventListener("pointermove", e => { mx = e.clientX; my = e.clientY; dot.style.transform = `translate(${mx}px,${my}px)`; }, { passive: true });
    (function loop() { rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18; ring.style.transform = `translate(${rx}px,${ry}px)`; requestAnimationFrame(loop); })();
    document.addEventListener("pointerover", e => {
      const t = e.target.closest("[data-cursor], a, button, input, select, figure");
      ring.classList.remove("big", "hover");
      if (!t) return;
      if (t.dataset.cursor && t.matches(".card, figure, [data-cursor=view], [data-cursor=play], [data-cursor=copy], [data-cursor=open]")) {
        ring.classList.add("big"); label.textContent = t.dataset.cursor;
      } else if (t.dataset.cursor && !t.matches("a,button")) {
        ring.classList.add("hover"); label.textContent = "";
      } else { ring.classList.add("hover"); label.textContent = ""; }
      if (t.matches(".masonry figure, .shop-photo")) { ring.classList.add("big"); label.textContent = "zoom"; }
    });
    // magnetic
    $$(".magnetic").forEach(el => {
      el.addEventListener("pointermove", e => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2;
        el.style.transform = `translate(${x * 0.25}px,${y * 0.3}px)`;
      });
      el.addEventListener("pointerleave", () => { el.style.transform = ""; });
    });
  }

  /* ---------------- nav ---------------- */
  const nav = $("#nav"), burger = $("#burger"), links = $("#nav-links");
  burger.addEventListener("click", () => {
    const open = links.classList.toggle("open"); burger.setAttribute("aria-expanded", open);
  });
  links.addEventListener("click", e => { if (e.target.matches("a")) { links.classList.remove("open"); burger.setAttribute("aria-expanded", false); } });
  let lastY = scrollY;
  const sections = $$("[data-section]");
  const navLinks = $$("[data-nav]");
  const wave = $("#progress-wave");
  function onScroll() {
    const y = scrollY;
    nav.classList.toggle("hide", y > lastY && y > 400 && !links.classList.contains("open"));
    lastY = y;
    // progress as oscilloscope trace
    const p = y / Math.max(1, document.documentElement.scrollHeight - innerHeight);
    const W = 1000 * p; let d = "M0 6";
    for (let x = 0; x <= W; x += 8) d += ` L${x} ${6 + Math.sin(x * 0.08 + y * 0.01) * 3.5 * (x > W - 80 ? (W - x) / 80 : 1)}`;
    wave.setAttribute("d", d);
    // active section
    let cur = sections[0];
    for (const s of sections) if (s.getBoundingClientRect().top < innerHeight * 0.4) cur = s;
    const idx = sections.indexOf(cur);
    $("#hud-idx").textContent = String(idx).padStart(2, "0");
    $("#hud-name").textContent = cur.dataset.section.toUpperCase();
    navLinks.forEach(a => a.classList.toggle("active", a.getAttribute("href") === "#" + cur.id));
    timelineProgress();
  }
  addEventListener("scroll", onScroll, { passive: true });

  /* ---------------- reveal + counters ---------------- */
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add("in");
    $$("[data-count]", e.target).forEach(countUp);
    io.unobserve(e.target);
  }), { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
  $$(".reveal").forEach(el => { if (!el.closest(".hero")) io.observe(el); });
  function countUp(el) {
    if (el.dataset.done) return; el.dataset.done = 1;
    const to = +el.dataset.count, t0 = performance.now(), dur = 1600;
    const step = now => {
      const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 4);
      el.textContent = Math.round(to * e);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* ---------------- tilt + glare ---------------- */
  $$("[data-tilt]").forEach(el => {
    if (el.classList.contains("card")) el.insertAdjacentHTML("beforeend", '<span class="glare"></span>');
    if (!fine || reduce) return;
    const max = el.classList.contains("card") ? 7 : 4;
    el.addEventListener("pointermove", e => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      el.style.transform = `perspective(900px) rotateX(${(0.5 - py) * max}deg) rotateY(${(px - 0.5) * max}deg)`;
      el.style.setProperty("--mx", px * 100 + "%"); el.style.setProperty("--my", py * 100 + "%");
    });
    el.addEventListener("pointerleave", () => { el.style.transition = "transform .6s var(--ease)"; el.style.transform = ""; setTimeout(() => el.style.transition = "", 600); });
  });

  /* ---------------- lightbox ---------------- */
  const lb = $("#lightbox"), lbImg = $("#lb-img"), lbCap = $("#lb-cap");
  let lbList = [], lbI = 0;
  function openLB(list, i) { lbList = list; lbI = i; showLB(); lb.hidden = false; document.body.classList.add("locked"); }
  function showLB() { const [src, cap] = lbList[lbI]; lbImg.src = src; lbImg.alt = cap || ""; lbCap.textContent = cap || ""; lbImg.style.animation = "none"; void lbImg.offsetWidth; lbImg.style.animation = ""; }
  function closeLB() { lb.hidden = true; if ($("#modal").hidden) document.body.classList.remove("locked"); }
  $(".lb-prev").onclick = () => { lbI = (lbI - 1 + lbList.length) % lbList.length; showLB(); };
  $(".lb-next").onclick = () => { lbI = (lbI + 1) % lbList.length; showLB(); };
  $(".lb-close").onclick = closeLB;
  lb.addEventListener("click", e => { if (e.target === lb) closeLB(); });
  UI.openLB = openLB;

  /* gallery */
  const masonry = $("#masonry");
  $$("figure[data-remote] img", masonry).forEach(img => img.addEventListener("error", () => img.closest("figure").remove()));
  masonry.addEventListener("click", e => {
    const f = e.target.closest("figure"); if (!f) return;
    const vis = $$("figure:not(.hidden)", masonry);
    openLB(vis.map(x => [$("img", x).src, $("figcaption", x)?.textContent]), vis.indexOf(f));
  });
  $("#gal-filters").addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    $$("#gal-filters button").forEach(x => x.classList.toggle("on", x === b));
    const f = b.dataset.f;
    $$("figure", masonry).forEach(fig => fig.classList.toggle("hidden", f !== "all" && !fig.dataset.cat.split(" ").includes(f)));
  });
  $$(".mini-gallery button").forEach((b, i, all) => b.addEventListener("click", () => openLB(all.map(x => [x.dataset.lb, x.dataset.cap]), i)));
  $$(".shop-photo").forEach((f, i, all) => f.addEventListener("click", () => openLB(all.map(x => [x.dataset.lbSrc, x.dataset.cap]), i)));

  /* ---------------- case-file modal ---------------- */
  const modal = $("#modal"), mBody = $("#modal-body");
  let lastFocus = null;
  function openProject(id) {
    const p = S.projects[id]; if (!p) return;
    lastFocus = document.activeElement;
    const imgs = p.images;
    mBody.innerHTML = `
      <div class="m-hero"><div class="m-slides">${imgs.map((im, i) => `<img src="${im[0]}" alt="${im[1]}" data-i="${i}">`).join("")}</div>
        ${imgs.length > 1 ? `<div class="m-nav"><span id="m-count">1 / ${imgs.length}</span><button data-dir="-1" aria-label="Previous image">‹</button><button data-dir="1" aria-label="Next image">›</button></div>` : ""}</div>
      <div class="m-content">
        <p class="m-kicker">Case file ${p.n} · ${p.org}</p>
        <h2 class="m-title" id="m-title">${p.title}</h2>
        <p class="m-lede">${p.lede}</p>
        <div class="m-grid">
          <div class="m-sec">
            ${p.sections.map(s => `<h4>${s[0]}</h4>${s[1]}`).join("")}
            ${p.pivot ? `<div class="m-pivot">${p.pivot}</div>` : ""}
            ${p.video ? `<h4>Bench demo</h4><video src="${p.video}" controls playsinline muted loop style="max-width:320px;width:100%;border-radius:14px;border:1px solid var(--line2)"></video>` : ""}
          </div>
          <aside class="m-aside">
            <div class="m-stat"><span>Role</span><b style="font-size:20px;color:var(--text)">${p.role}</b><span>${p.when}</span></div>
            ${p.stats.map(s => `<div class="m-stat"><b>${s[0]}</b><span>${s[1]}</span></div>`).join("")}
            <ul class="tags">${p.skills.map(s => `<li>${s}</li>`).join("")}</ul>
            <div class="m-links">
              ${p.demos.map(d => `<button data-demo="${d}">▶ Try: ${S.demoNames[d]}</button>`).join("")}
              ${p.links.map(l => `<a href="${l[1]}" target="_blank" rel="noopener">${l[0]}</a>`).join("")}
            </div>
          </aside>
        </div>
      </div>`;
    let si = 0;
    const slides = $(".m-slides", mBody);
    const go = d => { si = (si + d + imgs.length) % imgs.length; slides.style.transform = `translateX(${-si * 100}%)`; const c = $("#m-count"); if (c) c.textContent = `${si + 1} / ${imgs.length}`; };
    $$(".m-nav button", mBody).forEach(b => b.onclick = () => go(+b.dataset.dir));
    slides.addEventListener("click", e => { if (e.target.dataset.i) openLB(imgs, +e.target.dataset.i); });
    $$("[data-demo]", mBody).forEach(b => b.onclick = () => { closeModal(); setTimeout(() => window.Bench && Bench.open(b.dataset.demo, true), 250); });
    modal.hidden = false; document.body.classList.add("locked");
    $(".modal-close", modal).focus();
    modal._go = go;
  }
  function closeModal() { modal.hidden = true; document.body.classList.remove("locked"); mBody.innerHTML = ""; lastFocus && lastFocus.focus(); }
  UI.openProject = openProject;
  $$("[data-close]", modal).forEach(b => b.addEventListener("click", closeModal));
  $$("[data-project]").forEach(c => {
    c.addEventListener("click", () => openProject(c.dataset.project));
    c.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openProject(c.dataset.project); } });
  });

  /* ---------------- timeline ---------------- */
  const tl = $("#timeline"), tlp = $("#tl-progress"), tlItems = $$(".tl-item");
  function timelineProgress() {
    const r = tl.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (innerHeight * 0.6 - r.top) / r.height));
    tlp.setAttribute("y2", (p * r.height) + "px");
    tlItems.forEach(it => it.classList.toggle("lit", it.getBoundingClientRect().top < innerHeight * 0.6));
  }

  /* ---------------- poster magnifier ---------------- */
  $$(".magnifier").forEach(m => {
    const img = $("img", m), lens = $(".lens", m), Z = 2.6;
    m.addEventListener("pointermove", e => {
      const r = m.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      const L = lens.offsetWidth / 2;
      lens.style.left = (x - L) + "px"; lens.style.top = (y - L) + "px";
      lens.style.backgroundImage = `url(${img.currentSrc || img.src})`;
      lens.style.backgroundSize = `${r.width * Z}px ${r.height * Z}px`;
      lens.style.backgroundPosition = `${-(x * Z - L)}px ${-(y * Z - L)}px`;
    });
    m.addEventListener("click", () => openLB([[img.src, img.alt]], 0));
  });

  /* ---------------- constellation ---------------- */
  (function constellation() {
    const cv = $("#c-constellation"); if (!cv) return;
    const ctx = cv.getContext("2d");
    const G = S.graph, nodes = [], edges = [];
    const pIdx = {};
    G.projects.forEach(([id, label], i) => { pIdx[id] = nodes.length; nodes.push({ id, label, type: "p", x: 0, y: 0, vx: 0, vy: 0, i }); });
    Object.entries(G.skills).forEach(([sk, ps]) => {
      const n = nodes.length; nodes.push({ id: sk, label: sk, type: "s", x: 0, y: 0, vx: 0, vy: 0 });
      ps.forEach(p => edges.push([pIdx[p], n]));
    });
    let W, H, dpr, hover = -1, drag = -1, mouse = { x: -1e4, y: -1e4 }, running = false;
    function size() {
      dpr = Math.min(2, devicePixelRatio || 1); const r = cv.getBoundingClientRect();
      W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function place() {
      const np = G.projects.length;
      nodes.forEach(n => { if (n.type === "p") { const a = (n.i / np) * Math.PI * 2; n.x = W / 2 + Math.cos(a) * W * 0.26; n.y = H / 2 + Math.sin(a) * H * 0.3; } });
      nodes.forEach((n, i) => {
        if (n.type === "p") return;
        const ps = edges.filter(e => e[1] === i).map(e => nodes[e[0]]);
        const cx = ps.reduce((a, p) => a + p.x, 0) / ps.length, cy = ps.reduce((a, p) => a + p.y, 0) / ps.length;
        const a = Math.random() * Math.PI * 2; n.x = cx + Math.cos(a) * 60; n.y = cy + Math.sin(a) * 60;
      });
    }
    const neighbors = i => { const s = new Set([i]); edges.forEach(([a, b]) => { if (a === i) s.add(b); if (b === i) s.add(a); }); return s; };
    let temp = 40;
    function step() {
      const n = nodes.length, k = Math.sqrt((W - 160) * (H - 60) / n) * 0.62;
      nodes.forEach(a => { a.dx = 0; a.dy = 0; });
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
        const a = nodes[i], b = nodes[j]; let dx = a.x - b.x, dy = a.y - b.y; const d = Math.max(8, Math.hypot(dx, dy));
        let f = (k * k / d) * (a.type === "p" && b.type === "p" ? 2.2 : 1); if (d < 80 && (a.type === "p" || b.type === "p")) f *= 3; if (Math.abs(a.y - b.y) < 16 && Math.abs(a.x - b.x) < 120) f *= 1.8;
        dx /= d; dy /= d; a.dx += dx * f; a.dy += dy * f; b.dx -= dx * f; b.dy -= dy * f;
      }
      edges.forEach(([i, j]) => {
        const a = nodes[i], b = nodes[j]; let dx = a.x - b.x, dy = a.y - b.y; const d = Math.max(1, Math.hypot(dx, dy));
        const f = d * d / k; dx /= d; dy /= d; a.dx -= dx * f * 0.5; a.dy -= dy * f * 0.5; b.dx += dx * f; b.dy += dy * f;
      });
      nodes.forEach((a, i) => {
        a.dx += (W / 2 - a.x) * 0.12 * k / 40; a.dy += (H / 2 - a.y) * 0.2 * k / 40;
        if (i === drag) { a.x = mouse.x; a.y = mouse.y; return; }
        const d = Math.hypot(a.dx, a.dy) || 1, m = Math.min(d, temp);
        a.x += a.dx / d * m; a.y += a.dy / d * m;
        a.x = Math.max(a.type === "p" ? 90 : 50, Math.min(W - (a.type === "s" ? 140 : 90), a.x)); a.y = Math.max(a.type === "p" ? 44 : 26, Math.min(H - (a.type === "p" ? 44 : 26), a.y));
      });
      temp = Math.max(drag >= 0 ? 6 : 0.6, temp * 0.985);
    }
    function draw() {
      const cs = getComputedStyle(document.documentElement);
      const acc = cs.getPropertyValue("--accent").trim(), acc2 = cs.getPropertyValue("--accent2").trim(), txt = cs.getPropertyValue("--text").trim(), mut = cs.getPropertyValue("--muted").trim(), line = cs.getPropertyValue("--line2").trim();
      ctx.clearRect(0, 0, W, H);
      const hl = hover >= 0 ? neighbors(hover) : null;
      edges.forEach(([i, j]) => {
        const a = nodes[i], b = nodes[j], on = hl && hl.has(i) && hl.has(j);
        ctx.strokeStyle = on ? acc : line; ctx.globalAlpha = hl && !on ? 0.25 : 1; ctx.lineWidth = on ? 1.6 : 1;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      });
      ctx.globalAlpha = 1;
      nodes.forEach((n, i) => {
        const on = !hl || hl.has(i);
        ctx.globalAlpha = on ? 1 : 0.25;
        if (n.type === "p") {
          ctx.font = "600 13px Inter, sans-serif";
          const w = ctx.measureText(n.label).width + 22;
          ctx.fillStyle = i === hover ? acc : "rgba(0,0,0,0)"; ctx.strokeStyle = acc; ctx.lineWidth = 1.4;
          roundRect(n.x - w / 2, n.y - 15, w, 30, 15); ctx.fill(); ctx.stroke();
          ctx.fillStyle = i === hover ? "#120b00" : txt; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(n.label, n.x, n.y + 1);
        } else {
          ctx.fillStyle = hl && hl.has(i) && hover !== i ? acc2 : (i === hover ? acc2 : mut);
          ctx.beginPath(); ctx.arc(n.x, n.y, i === hover ? 6 : 4, 0, 7); ctx.fill();
          ctx.font = "11.5px JBM, monospace"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
          ctx.fillStyle = hl && hl.has(i) ? txt : mut; ctx.fillText(n.label, n.x + 9, n.y);
        }
      });
      ctx.globalAlpha = 1;
    }
    function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
    function pick(x, y) { let best = -1, bd = 26 * 26; nodes.forEach((n, i) => { const d = (n.x - x) ** 2 + (n.y - y) ** 2; if (d < bd) { bd = d; best = i; } }); return best; }
    cv.addEventListener("pointermove", e => { const r = cv.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; if (drag < 0) hover = pick(mouse.x, mouse.y); });
    cv.addEventListener("pointerleave", () => { hover = -1; drag = -1; });
    cv.addEventListener("pointerdown", e => { const r = cv.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; drag = pick(mouse.x, mouse.y); hover = drag; if (drag >= 0) { cv.setPointerCapture(e.pointerId); temp = 8; } });
    cv.addEventListener("pointerup", () => { if (drag >= 0 && nodes[drag].type === "p") { const id = nodes[drag].id; if (id === "shop") location.hash = "#shop"; } drag = -1; });
    cv.addEventListener("dblclick", () => { if (hover >= 0 && nodes[hover].type === "p" && S.projects[nodes[hover].id]) openProject(nodes[hover].id); });
    function loop() { if (!running) return; if (drag >= 0) { step(); } else if (temp > 0.61) { step(); if (temp <= 0.62) declutter(); } draw(); requestAnimationFrame(loop); }
    new IntersectionObserver(([e]) => { running = e.isIntersecting; if (running) loop(); }).observe(cv);
    function declutter() {
      ctx.font = "11.5px JBM, monospace";
      const box = n => n.type === "p" ? { x0: n.x - 70, x1: n.x + 70, y0: n.y - 17, y1: n.y + 17 } : { x0: n.x - 6, x1: n.x + 14 + ctx.measureText(n.label).width, y0: n.y - 9, y1: n.y + 9 };
      for (let it = 0; it < 80; it++) {
        let moved = false;
        for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
          const a = box(nodes[i]), b = box(nodes[j]);
          const ox = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0), oy = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
          if (ox > 0 && oy > 0) {
            moved = true; const A = nodes[i], B = nodes[j];
            const s = A.y <= B.y ? -1 : 1, push = Math.min(oy, 10) / 2 + 0.5;
            if (A.type === "s") A.y += s * push; if (B.type === "s") B.y -= s * push;
            if (A.type === "p" && B.type === "p") { A.y += s * push; B.y -= s * push; }
            [A, B].forEach(n => n.y = Math.max(20, Math.min(H - 20, n.y)));
          }
        }
        if (!moved) break;
      }
    }
    const warm = () => { temp = 40; for (let k = 0; k < 500; k++) step(); temp = 0.6; declutter(); };
    size(); place(); warm(); addEventListener("resize", () => { size(); place(); warm(); });
  })();

  /* ---------------- fab shop: troubleshooting playbook ---------------- */
  const DIAG = {
    "Under-extrusion / clicking extruder": [
      ["Check the filament first", "Wet or tangled spool? Dry it (TPU and support materials are the usual suspects) and check the spool turns freely."],
      ["Walk the filament path", "Inspect PTFE tubes, feeder and hub for kinks, wear or grinding dust."],
      ["Partial clog test", "Manual extrude at temp; if flow is thin or curls, cold-pull or swap the nozzle."],
      ["Extruder gears & tension", "Clean ground filament out of the drive gears; check idler tension."],
      ["Fix & verify", "Replace the worn part, re-run flow calibration, log it.", 1]
    ],
    "Layer shift": [
      ["Re-create it", "Note where it shifts: same height every print points to the model/slicer, random points to mechanics."],
      ["Mechanical drag", "Move the toolhead by hand power-off — feel for binding, check rods and rails are clean & lubed."],
      ["Belts & pulleys", "Check belt tension and pulley set screws; look for a frayed belt."],
      ["Collisions", "Curled-up corners or a toolhead knocking parts? Tune cooling / z-hop."],
      ["Fix & verify", "Re-tension or replace, run a test cube, record settings.", 1]
    ],
    "Poor bed adhesion": [
      ["Clean the plate", "Wash with dish soap & water or IPA — fingerprints are the #1 cause."],
      ["First layer", "Re-run bed leveling / Z-offset; watch the first layer go down."],
      ["Right plate, right temp", "Match plate surface and bed temperature to the material."],
      ["Geometry & environment", "Add brim, close the enclosure, kill drafts."],
      ["Fix & verify", "Print an adhesion test, keep the profile that works.", 1]
    ],
    "Heater / thermistor fault": [
      ["Read the error", "Which sensor? Heating too slowly vs reading out of range are different failures."],
      ["Power down, then harness", "Reseat connectors and FFC / ribbon cables; look for crushed or chafed wires at the toolhead."],
      ["Measure", "Multimeter on thermistor and heater resistance against spec."],
      ["Isolate the part", "Swap with a known-good thermistor / heater / cable to find the culprit."],
      ["Replace & verify", "Install the new part, PID-tune, confirm stable temps through a full print.", 1]
    ],
    "Toolchange / multi-material errors": [
      ["Which stage fails?", "Load, cut, retract, park or pick — the log or the noise usually tells you."],
      ["Filament tip & cutter", "Inspect for stringy tips or a dull cutter blade that jams the swap."],
      ["Offsets & docking", "Re-run nozzle / tool offset calibration; check docks and heads seat cleanly."],
      ["Purge & profiles", "Confirm purge/prime settings and material profiles per tool."],
      ["Fix & verify", "Run a multi-material calibration print, then a real part.", 1]
    ],
    "Stringing & blobs": [
      ["Dry the filament", "Moisture boils in the nozzle — the most common cause."],
      ["Temperature tower", "Print one to find the lowest clean temperature."],
      ["Retraction & travel", "Tune retraction length/speed and enable wipe / avoid crossing walls."],
      ["Fix & verify", "Save the tuned profile per material.", 1]
    ]
  };
  (function diag() {
    const wrap = $("#diag-symptoms"), steps = $("#diag-steps"); if (!wrap) return;
    Object.keys(DIAG).forEach(k => { const b = document.createElement("button"); b.textContent = k; wrap.appendChild(b); });
    wrap.addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return;
      $$("button", wrap).forEach(x => x.classList.toggle("on", x === b));
      steps.innerHTML = DIAG[b.textContent].map((s, i) => `<li class="${s[2] ? "fix" : ""}" style="animation-delay:${i * 90}ms"><b>${s[0]}</b>${s[1]}</li>`).join("");
    });
  })();

  /* maintenance checklist */
  (function checks() {
    const boxes = $$("#checks input"); if (!boxes.length) return;
    let saved = []; try { saved = JSON.parse(store.get("printer-checks") || "[]"); } catch {}
    boxes.forEach((b, i) => b.checked = !!saved[i]);
    const upd = () => {
      const n = boxes.filter(b => b.checked).length;
      $("#check-fill").style.width = (n / boxes.length * 100) + "%";
      $("#check-count").textContent = `${n} / ${boxes.length}`;
      store.set("printer-checks", JSON.stringify(boxes.map(b => b.checked)));
      if (n === boxes.length) { toast("Printer fleet: all green ✓"); confetti(); }
    };
    boxes.forEach(b => b.addEventListener("change", upd));
    const n = boxes.filter(b => b.checked).length;
    $("#check-fill").style.width = (n / boxes.length * 100) + "%"; $("#check-count").textContent = `${n} / ${boxes.length}`;
  })();

  /* ---------------- contact scope ---------------- */
  (function scope() {
    const cv = $("#c-scope"); const ctx = cv.getContext("2d");
    let W, H, t = 0, fx = 0.5, fy = 0.5, run = false;
    const size = () => { const d = Math.min(2, devicePixelRatio || 1); W = cv.offsetWidth; H = cv.offsetHeight; cv.width = W * d; cv.height = H * d; ctx.setTransform(d, 0, 0, d, 0, 0); };
    cv.parentElement.addEventListener("pointermove", e => { const r = cv.getBoundingClientRect(); fx = (e.clientX - r.left) / r.width; fy = (e.clientY - r.top) / r.height; });
    function loop() {
      if (!run) return;
      t += 0.016;
      const cs = getComputedStyle(document.documentElement);
      ctx.clearRect(0, 0, W, H);
      const traces = [[cs.getPropertyValue("--accent"), 1, 0], [cs.getPropertyValue("--accent2"), 1.5, 1.3], [cs.getPropertyValue("--accent3"), 2.2, 2.1]];
      traces.forEach(([c, m, ph]) => {
        ctx.strokeStyle = c.trim(); ctx.lineWidth = 1.5; ctx.shadowColor = c.trim(); ctx.shadowBlur = 10; ctx.beginPath();
        for (let x = 0; x <= W; x += 4) {
          const k = x / W;
          const y = H / 2 + Math.sin(k * (4 + fx * 18) * m + t * 2 + ph) * H * (0.06 + fy * 0.18) * Math.sin(k * Math.PI) + Math.sin(k * 40 + t * 5) * 3;
          x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.stroke();
      });
      ctx.shadowBlur = 0;
      requestAnimationFrame(loop);
    }
    new IntersectionObserver(([e]) => { run = e.isIntersecting; if (run) { size(); loop(); } }).observe(cv);
    addEventListener("resize", size);
  })();

  /* ---------------- copy email ---------------- */
  $("#copy-email").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(S.email); toast("Email copied — talk soon!"); }
    catch { toast(S.email); }
  });

  /* ---------------- theme ---------------- */
  function setTheme(t) {
    document.documentElement.dataset.theme = t; store.set("theme", t);
    document.querySelector('meta[name=theme-color]').content = t === "litho" ? "#130d03" : "#06080b";
    window.dispatchEvent(new CustomEvent("theme", { detail: t }));
  }
  const toggleTheme = () => { const n = document.documentElement.dataset.theme === "litho" ? "clean" : "litho"; setTheme(n); toast(n === "litho" ? "Litho-room lights on — UV-safe amber" : "Cleanroom lights restored"); };
  if (store.get("theme") === "litho") setTheme("litho");
  $("#theme-toggle").addEventListener("click", toggleTheme);
  UI.toggleTheme = toggleTheme;

  /* ---------------- confetti (wafer dies) ---------------- */
  function confetti() {
    if (reduce) return;
    const cv = $("#confetti"), ctx = cv.getContext("2d");
    cv.width = innerWidth; cv.height = innerHeight;
    const cols = ["#ffb627", "#4de1ff", "#b18cff", "#3ff2a0", "#ff7a45"];
    const ps = Array.from({ length: 160 }, () => ({ x: innerWidth / 2, y: innerHeight * 0.6, vx: (Math.random() - 0.5) * 18, vy: -Math.random() * 18 - 6, s: 4 + Math.random() * 8, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, c: cols[(Math.random() * cols.length) | 0] }));
    let f = 0;
    (function loop() {
      ctx.clearRect(0, 0, cv.width, cv.height);
      ps.forEach(p => { p.vy += 0.45; p.x += p.vx; p.y += p.vy; p.r += p.vr; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s); ctx.restore(); });
      if (++f < 200) requestAnimationFrame(loop); else ctx.clearRect(0, 0, cv.width, cv.height);
    })();
  }
  UI.confetti = confetti;

  /* ---------------- terminal ---------------- */
  const term = $("#terminal"), tBody = $("#term-body"), tIn = $("#term-in");
  const hist = []; let hi = 0;
  const print = (html) => { tBody.insertAdjacentHTML("beforeend", html + "\n"); tBody.scrollTop = tBody.scrollHeight; };
  const CMDS = {
    help: () => `<span class="c">commands</span>
  <span class="g">about</span>        who is owen
  <span class="g">projects</span>     list case files      <span class="g">open &lt;n|name&gt;</span>  open one
  <span class="g">bench</span>        list instruments     <span class="g">run &lt;name&gt;</span>     launch one
  <span class="g">skills</span>       toolbox              <span class="g">experience</span>   timeline
  <span class="g">contact</span>      get in touch         <span class="g">goto &lt;section&gt;</span>
  <span class="g">lights</span>       toggle litho room    <span class="g">clear</span>, <span class="g">exit</span>
  <span class="d">(there may be a few hidden ones)</span>`,
    about: () => `Owen Chen — Computer Engineering @ Purdue (exp. May 2028).
I build electromechanical prototypes and the measurement workflows
needed to evaluate them: robot mechanisms & controls, custom PCBs,
CNC machining, and semiconductor fabrication & metrology.`,
    whoami: () => "guest — but owen would love to meet you. try `contact`.",
    projects: () => Object.entries(S.projects).map(([k, p]) => `  <span class="c">${p.n}</span>  ${p.title.padEnd(52)} <span class="d">${k}</span>`).join("\n") + `\n<span class="d">→ open 01  or  open biped</span>`,
    ls: () => CMDS.projects(),
    open: (a) => {
      const q = (a[0] || "").toLowerCase();
      const hit = Object.entries(S.projects).find(([k, p]) => k === q || p.n === q.padStart(2, "0") || p.title.toLowerCase().includes(q));
      if (!q || !hit) return "usage: open &lt;01-08 | name&gt;";
      closeTerm(); openProject(hit[0]); return `opening ${hit[1].title}…`;
    },
    cat: (a) => CMDS.open(a),
    bench: () => Object.entries(S.demoNames).map(([k, v]) => `  <span class="g">${k.padEnd(9)}</span> ${v}`).join("\n") + `\n<span class="d">→ run balance</span>`,
    run: (a) => { const k = (a[0] || "").toLowerCase(); if (!S.demoNames[k]) return "usage: run &lt;" + Object.keys(S.demoNames).join("|") + "&gt;"; closeTerm(); Bench.open(k, true); return `launching ${S.demoNames[k]}…`; },
    skills: () => `<span class="b">electrical</span>  KiCad · CAN · ROS 2 · microcontrollers · scopes · Keithley SMUs
<span class="b">mechanical</span>  SolidWorks · Siemens NX · Fusion 360 CAM · Rhino/GH · CNC · MIG
<span class="b">fab/metro</span>   SÜSS MA6 · sputtering · F40-UV · VK-X3000 · Park NX20 AFM · UV-Vis-NIR
<span class="b">printing</span>    Bambu Lab H2D · Snapmaker U1 · multi-material FDM · printer repair
<span class="b">code</span>        Python · C/C++ · Java · MATLAB · MuJoCo`,
    experience: () => `2026–    Birck Nanotechnology Center — UG Research Fellow
2026–    Purdue Semiconductor VIP — Junior Fabrication Technician
2025–    Purdue Formula SAE — Electronics
2025     Serelix Robotics — Engineering Intern
2024–25  Taipei Tech × MIT City Science Lab — UROP Researcher
2022–25  Techno Maniacs FTC 16021 — Drone & Scoring Lead`,
    contact: () => `email     <a href="mailto:${S.email}">${S.email}</a>
github    <a href="${S.github}" target="_blank" rel="noopener">github.com/oweche</a>
linkedin  <a href="${S.linkedin}" target="_blank" rel="noopener">linkedin.com/in/owen-chen</a>`,
    email: () => { navigator.clipboard?.writeText(S.email).catch(() => {}); return "copied " + S.email; },
    goto: (a) => { const el = document.getElementById((a[0] || "").toLowerCase()); if (!el) return "sections: home work bench research experience toolbox gallery shop contact"; closeTerm(); el.scrollIntoView({ behavior: "smooth" }); return "→ " + a[0]; },
    lights: () => { toggleTheme(); return "toggled."; },
    theme: () => CMDS.lights(),
    clear: () => { tBody.innerHTML = ""; return null; },
    exit: () => { closeTerm(); return null; },
    sudo: (a) => a.join(" ").includes("make") ? "🛠  building something real… (hire owen to finish)" : "owen is not in the sudoers file. this incident will be reported to the cleanroom manager.",
    coffee: () => "☕ brewing… error: coffee is not cleanroom-compatible.",
    rm: () => "nice try. the wafer is safe.",
    hire: () => { confetti(); return `<span class="g">excellent choice.</span> → ${S.email}`; },
    date: () => new Date().toString(),
    echo: (a) => a.join(" ").replace(/</g, "&lt;")
  };
  function exec(line) {
    const [cmd, ...args] = line.trim().split(/\s+/);
    print(`<span class="g">owen@bench:~$</span> ${line.replace(/</g, "&lt;")}`);
    if (!cmd) return;
    const fn = CMDS[cmd.toLowerCase()];
    const out = fn ? fn(args) : `command not found: ${cmd.replace(/</g, "&lt;")} — try <span class="c">help</span>`;
    if (out) print(out);
  }
  function openTerm() {
    term.hidden = false;
    if (!tBody.childElementCount && !tBody.textContent) print(`<span class="c">BENCH OS</span> — interactive shell. type <span class="g">help</span> to begin.`);
    setTimeout(() => tIn.focus(), 30);
  }
  function closeTerm() { term.hidden = true; }
  $("#term-toggle").addEventListener("click", () => term.hidden ? openTerm() : closeTerm());
  $("#term-close").addEventListener("click", closeTerm);
  $("#term-form").addEventListener("submit", e => { e.preventDefault(); const v = tIn.value; if (v.trim()) { hist.push(v); hi = hist.length; } exec(v); tIn.value = ""; });
  tIn.addEventListener("keydown", e => {
    if (e.key === "ArrowUp") { hi = Math.max(0, hi - 1); tIn.value = hist[hi] || ""; e.preventDefault(); }
    if (e.key === "ArrowDown") { hi = Math.min(hist.length, hi + 1); tIn.value = hist[hi] || ""; e.preventDefault(); }
    if (e.key === "Tab") { e.preventDefault(); const m = Object.keys(CMDS).filter(c => c.startsWith(tIn.value)); if (m.length === 1) tIn.value = m[0] + " "; else if (m.length) print(m.join("  ")); }
    if (e.key === "Escape") closeTerm();
  });
  UI.openTerm = openTerm;

  /* ---------------- global keys ---------------- */
  const konami = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
  let kseq = [];
  addEventListener("keydown", e => {
    const typing = e.target.matches("input, textarea, select");
    if (e.key === "Escape") { if (!lb.hidden) closeLB(); else if (!modal.hidden) closeModal(); else if (!term.hidden) closeTerm(); }
    if (!lb.hidden) { if (e.key === "ArrowLeft") $(".lb-prev").click(); if (e.key === "ArrowRight") $(".lb-next").click(); }
    else if (!modal.hidden && modal._go) { if (e.key === "ArrowLeft") modal._go(-1); if (e.key === "ArrowRight") modal._go(1); }
    if (typing) return;
    if (e.key === "`" || e.key === "~") { e.preventDefault(); term.hidden ? openTerm() : closeTerm(); }
    if ((e.key === "l" || e.key === "L") && !e.metaKey && !e.ctrlKey) toggleTheme();
    kseq.push(e.key.length === 1 ? e.key.toLowerCase() : e.key); kseq = kseq.slice(-10);
    if (kseq.join() === konami.join()) { confetti(); toast("↑↑↓↓←→←→BA — 100% yield achieved!"); }
  });

  onScroll();
})();
