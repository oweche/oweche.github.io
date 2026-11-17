/* The Bench — eight interactive instruments + the fab-shop toolchange simulator. */
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  /* theme colors (refreshed on theme change) */
  const C = {};
  function readColors() {
    const cs = getComputedStyle(document.documentElement);
    ["bg", "bg2", "bg3", "text", "muted", "dim", "line", "line2", "accent", "accent2", "accent3", "ok", "warn"].forEach(k => C[k] = cs.getPropertyValue("--" + k).trim());
  }
  readColors();
  addEventListener("theme", () => setTimeout(() => { readColors(); Object.values(insts).forEach(i => i.onTheme && i.onTheme()); }, 30));

  function fit(cv) {
    const dpr = Math.min(2, devicePixelRatio || 1);
    const r = cv.getBoundingClientRect();
    const W = Math.max(10, r.width), H = Math.max(10, r.height);
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    const ctx = cv.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, W, H };
  }
  // value noise
  function hash(x, y) { let h = x * 374761393 + y * 668265263; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
  function vnoise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    return lerp(lerp(hash(xi, yi), hash(xi + 1, yi), u), lerp(hash(xi, yi + 1), hash(xi + 1, yi + 1), u), v);
  }
  function fbm(x, y, o = 4) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { s += a * vnoise(x * f, y * f); a *= 0.5; f *= 2; } return s; }
  // rainbow colormap (VK / Filmetrics style)
  function cmap(t) {
    t = clamp(t, 0, 1);
    const r = clamp(1.5 - Math.abs(4 * t - 3), 0, 1), g = clamp(1.5 - Math.abs(4 * t - 2), 0, 1), b = clamp(1.5 - Math.abs(4 * t - 1), 0, 1);
    return [r, g, b];
  }
  window.BenchUtil = { fbm, vnoise, cmap, clamp, lerp };

  /* ================= framework ================= */
  const insts = {};
  let active = "balance", visible = false, last = performance.now();
  const Bench = window.Bench = {
    register(id, obj) { insts[id] = obj; if (id === active && visible) ensure(id); },
    open(id, scroll) {
      if (scroll) document.getElementById("bench").scrollIntoView({ behavior: "smooth" });
      select(id);
    },
    get active() { return active; }
  };
  function ensure(id) { const i = insts[id]; if (i && !i._ready) { i._ready = true; i.init && i.init(); } return i; }
  function select(id) {
    if (!document.querySelector(`[data-panel="${id}"]`)) return;
    const prev = insts[active]; prev && prev.stop && prev.stop();
    active = id;
    $$(".tab").forEach(t => t.setAttribute("aria-selected", t.dataset.inst === id));
    $$(".inst").forEach(p => p.classList.toggle("active", p.dataset.panel === id));
    $("#inst-title").textContent = window.SITE.demoNames[id];
    const owner = Object.entries(window.SITE.projects).find(([, p]) => p.demos.includes(id));
    $("#inst-link").innerHTML = owner ? `<button data-p="${owner[0]}">From case file ${owner[1].n} ↗</button>` : "";
    const b = $("#inst-link button"); if (b) b.onclick = () => UI.openProject(b.dataset.p);
    requestAnimationFrame(() => { const i = ensure(id); i && i.resize && i.resize(); i && i.start && i.start(); });
  }
  $$(".tab").forEach(t => t.addEventListener("click", () => select(t.dataset.inst)));
  $(".console-tabs").addEventListener("keydown", e => {
    if (!["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight"].includes(e.key)) return;
    const tabs = $$(".tab"), i = tabs.findIndex(t => t.dataset.inst === active);
    const n = tabs[(i + (e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length];
    n.focus(); select(n.dataset.inst); e.preventDefault();
  });
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) { const i = ensure(active); i && i.resize && i.resize(); } }, { threshold: 0.05 }).observe($(".console"));
  addEventListener("resize", () => { const i = insts[active]; i && i._ready && i.resize && i.resize(); shop.resize(); });
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (visible) { const i = insts[active]; if (i && i._ready && i.frame) i.frame(dt, now / 1000); }
    shop.frame(dt);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  function seg(id, cb) {
    const el = document.getElementById(id);
    el.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; $$("button", el).forEach(x => x.classList.toggle("on", x === b)); cb(b.dataset.v); });
    return () => $("button.on", el).dataset.v;
  }
  let pointerOverConsole = false;
  $(".console").addEventListener("pointerenter", () => pointerOverConsole = true);
  $(".console").addEventListener("pointerleave", () => pointerOverConsole = false);

  /* ================= 01 BALANCE (LQR) ================= */
  (function balance() {
    const cv = $("#c-balance");
    let ctx, W, H;
    const M = 1.0, m = 1.6, g = 9.81, dt = 0.004;
    let l = 0.55, qth = 120, mode = "lqr", K = [0, 0, 0, 0];
    let s = [0, 0, 0.08, 0], xref = 0, camX = 0, fallen = 0, u = 0, push = null, hist = [], keys = {};
    // ---- tiny matrix helpers ----
    const mm = (A, B) => A.map(r => B[0].map((_, j) => r.reduce((acc, v, k) => acc + v * B[k][j], 0)));
    const tr = A => A[0].map((_, j) => A.map(r => r[j]));
    const madd = (A, B) => A.map((r, i) => r.map((v, j) => v + B[i][j]));
    const msub = (A, B) => A.map((r, i) => r.map((v, j) => v - B[i][j]));
    function solveK() {
      const A = [[0, 1, 0, 0], [0, 0, -m * g / M, 0], [0, 0, 0, 1], [0, 0, (M + m) * g / (M * l), 0]];
      const B = [[0], [1 / M], [0], [-1 / (M * l)]];
      const Ad = A.map((r, i) => r.map((v, j) => (i === j ? 1 : 0) + v * dt));
      const Bd = B.map(r => [r[0] * dt]);
      const Q = [[4, 0, 0, 0], [0, 1, 0, 0], [0, 0, qth, 0], [0, 0, 0, 2]], R = 0.02;
      let P = Q.map(r => r.slice());
      const AdT = tr(Ad), BdT = tr(Bd);
      let Kd = [[0, 0, 0, 0]];
      for (let it = 0; it < 9000; it++) {
        const BtP = mm(BdT, P);                  // 1x4
        const Sx = R + mm(BtP, Bd)[0][0];         // scalar
        Kd = mm(BtP, Ad).map(r => r.map(v => v / Sx)); // 1x4
        const AtP = mm(AdT, P);
        const Pn = madd(Q, msub(mm(AtP, Ad), mm(mm(AtP, Bd), Kd)));
        let diff = 0; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) diff = Math.max(diff, Math.abs(Pn[i][j] - P[i][j]));
        P = Pn; if (diff < 1e-7 * (1 + Math.abs(P[2][2]))) break;
      }
      K = Kd[0];
      $("#bal-k").textContent = "[" + K.map(v => v.toFixed(1)).join(", ") + "]";
    }
    function reset() { s = [xref, 0, (Math.random() - 0.5) * 0.2, 0]; fallen = 0; hist = []; }
    function physics(h) {
      const [x, xd, th, thd] = s;
      if (mode === "lqr") u = -(K[0] * (x - xref) + K[1] * xd + K[2] * th + K[3] * thd);
      else if (mode === "pd") u = 70 * th + 14 * thd;
      else u = 0;
      u = clamp(u, -80, 80);
      let F = u;
      if (push && push.t > 0) { push.t -= h; }
      const sn = Math.sin(th), cs = Math.cos(th);
      const xdd = (F + m * sn * (l * thd * thd - g * cs)) / (M + m * sn * sn) - 0.15 * xd;
      const thdd = (g * sn - xdd * cs) / l - 0.05 * thd;
      s = [x + xd * h, xd + xdd * h, th + thd * h, thd + thdd * h];
    }
    const B = {
      init() {
        $("#bal-h").addEventListener("input", e => { l = +e.target.value; $("#bal-h-o").textContent = l.toFixed(2) + " m"; solveK(); });
        $("#bal-q").addEventListener("input", e => { qth = +e.target.value; $("#bal-q-o").textContent = qth; solveK(); });
        seg("bal-mode", v => { mode = v; if (fallen) reset(); });
        $("#bal-reset").addEventListener("click", () => { xref = 0; reset(); });
        cv.addEventListener("pointerdown", e => {
          const r = cv.getBoundingClientRect(), px = e.clientX - r.left;
          const rx = W / 2 + (s[0] - camX) * scale();
          const dir = px < rx ? 1 : -1;
          s[3] += dir * (1.4 + Math.random() * 0.6) * (0.55 / l) ** 0.5;
          s[1] += dir * 0.3;
          push = { t: 0.35, dir, y: e.clientY - r.top };
        });
        addEventListener("keydown", e => { if (active === "balance" && pointerOverConsole && e.key.startsWith("Arrow")) { keys[e.key] = 1; e.preventDefault(); } });
        addEventListener("keyup", e => { delete keys[e.key]; });
        solveK(); B.resize();
      },
      resize() { ({ ctx, W, H } = fit(cv)); },
      frame(d) {
        if (keys.ArrowLeft) xref -= 1.2 * d; if (keys.ArrowRight) xref += 1.2 * d;
        if (!fallen) {
          for (let t = 0; t < d; t += dt) physics(dt);
          if (Math.abs(s[2]) > 1.3) { fallen = 1.6; }
        } else { fallen -= d; s[2] = clamp(s[2] + Math.sign(s[2]) * d * 2, -1.5, 1.5); if (fallen <= 0) reset(); }
        camX += (s[0] - camX) * Math.min(1, d * 3);
        hist.push(s[2]); if (hist.length > 260) hist.shift();
        $("#bal-theta").textContent = (s[2] * 180 / Math.PI).toFixed(1) + "°";
        $("#bal-x").textContent = s[0].toFixed(2) + " m";
        $("#bal-u").textContent = u.toFixed(1) + " N";
        draw();
      }
    };
    const scale = () => Math.min(H * 0.62 / 0.95, W * 0.7);
    function draw() {
      const sc = scale(), gy = H * 0.84;
      ctx.clearRect(0, 0, W, H);
      // ground grid
      ctx.strokeStyle = C.line2; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
      const step = 0.2 * sc, off = ((-camX * sc) % step + step) % step;
      ctx.strokeStyle = C.line; ctx.font = "10px JBM, monospace"; ctx.fillStyle = C.dim;
      for (let x = off - step; x < W + step; x += step) {
        ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x - 14, gy + 14); ctx.stroke();
      }
      // xref flag
      const fx = W / 2 + (xref - camX) * sc;
      ctx.setLineDash([4, 4]); ctx.strokeStyle = C.accent2; ctx.beginPath(); ctx.moveTo(fx, gy); ctx.lineTo(fx, gy - 60); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = C.accent2; ctx.beginPath(); ctx.moveTo(fx, gy - 60); ctx.lineTo(fx + 14, gy - 54); ctx.lineTo(fx, gy - 48); ctx.fill();
      ctx.fillText("x_ref", fx + 4, gy - 66);
      // robot
      const rx = W / 2 + (s[0] - camX) * sc, wr = 0.09 * sc, ay = gy - wr;
      // shadow
      ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.beginPath(); ctx.ellipse(rx + Math.sin(s[2]) * l * sc * 0.3, gy + 4, wr * 1.6, 5, 0, 0, TAU); ctx.fill();
      ctx.save(); ctx.translate(rx, ay); ctx.rotate(s[2]);
      // leg: two links from axle (0,0) to hip (0,-l)
      const L = l * sc, Lk = 0.5 * Math.max(L, 0.62 * sc) * 1.0; const half = L / 2;
      const kx = Math.sqrt(Math.max(0, Lk * Lk - half * half));
      ctx.lineCap = "round";
      ctx.strokeStyle = C.muted; ctx.lineWidth = 9;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-kx, -half); ctx.lineTo(0, -L); ctx.stroke();
      ctx.strokeStyle = C.text; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-kx, -half); ctx.lineTo(0, -L); ctx.stroke();
      [[0, 0], [-kx, -half], [0, -L]].forEach(([x, y]) => { ctx.fillStyle = C.bg; ctx.strokeStyle = C.accent; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 5, 0, TAU); ctx.fill(); ctx.stroke(); });
      // body
      const bw = 0.36 * sc, bh = 0.15 * sc;
      ctx.fillStyle = C.bg3; ctx.strokeStyle = C.accent; ctx.lineWidth = 2;
      rr(ctx, -bw / 2, -L - bh, bw, bh, 10); ctx.fill(); ctx.stroke();
      ctx.fillStyle = fallen ? C.warn : C.accent2;
      ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(bw * 0.18, -L - bh * 0.55, 4, 0, TAU); ctx.arc(bw * 0.34, -L - bh * 0.55, 4, 0, TAU); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = C.dim; ctx.font = "9px JBM, monospace"; ctx.fillText("CAN · PWR", -bw / 2 + 8, -L - bh + 14);
      ctx.restore();
      // wheel
      ctx.save(); ctx.translate(rx, ay); ctx.rotate(s[0] / 0.09);
      ctx.fillStyle = C.bg2; ctx.strokeStyle = C.text; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, wr, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = C.accent; ctx.lineWidth = 2; for (let i = 0; i < 3; i++) { ctx.rotate(TAU / 3); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(wr * 0.8, 0); ctx.stroke(); }
      ctx.restore();
      // push arrow
      if (push && push.t > 0) {
        const a = push.t / 0.35, hx = rx - push.dir * (70 + (1 - a) * 30), hy = ay - l * sc * 0.8;
        ctx.globalAlpha = a; ctx.strokeStyle = C.warn; ctx.fillStyle = C.warn; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(hx - push.dir * 40, hy); ctx.lineTo(hx, hy); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(hx + push.dir * 10, hy); ctx.lineTo(hx - push.dir * 2, hy - 8); ctx.lineTo(hx - push.dir * 2, hy + 8); ctx.fill();
        ctx.globalAlpha = 1;
      }
      // theta strip
      const sx = 16, sy = 16, sw = Math.min(260, W * 0.4), sh = 64;
      ctx.fillStyle = C.bg; ctx.globalAlpha = 0.8; rr(ctx, sx, sy, sw, sh, 8); ctx.fill(); ctx.globalAlpha = 1;
      ctx.strokeStyle = C.line2; ctx.lineWidth = 1; rr(ctx, sx, sy, sw, sh, 8); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(sx, sy + sh / 2); ctx.lineTo(sx + sw, sy + sh / 2); ctx.stroke();
      ctx.strokeStyle = C.accent; ctx.lineWidth = 1.6; ctx.beginPath();
      hist.forEach((v, i) => { const x = sx + i / 260 * sw, y = sy + sh / 2 - clamp(v / 0.5, -1, 1) * (sh / 2 - 4); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.stroke();
      ctx.fillStyle = C.dim; ctx.font = "10px JBM, monospace"; ctx.fillText("θ(t)  ±29°", sx + 8, sy + 13);
      ctx.fillStyle = mode === "lqr" ? C.ok : mode === "pd" ? C.accent : C.warn;
      ctx.fillText(mode === "lqr" ? "LQR · full state" : mode === "pd" ? "PD · angle only (drifts!)" : "controller OFF", sx + 8, sy + sh - 8);
      if (fallen) { ctx.fillStyle = C.warn; ctx.font = "700 22px Bricolage, sans-serif"; ctx.textAlign = "center"; ctx.fillText("FALLEN — resetting", W / 2, H * 0.22); ctx.textAlign = "left"; }
    }
    Bench.register("balance", B);
  })();

  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  /* ================= 02 IK ================= */
  (function ik() {
    const cv = $("#c-ik"); let ctx, W, H, mode = "follow", knee = 1, tx = 0, ty = 0, gx = 0, gy = 0, t = 0, spin = 0;
    const I = {
      init() {
        seg("ik-mode", v => mode = v); seg("ik-knee", v => knee = +v);
        cv.addEventListener("pointermove", e => { const r = cv.getBoundingClientRect(); gx = e.clientX - r.left; gy = e.clientY - r.top; if (mode !== "follow") { mode = "follow"; $$("#ik-mode button").forEach(b => b.classList.toggle("on", b.dataset.v === "follow")); } });
        I.resize(); gx = W / 2 + 40; gy = H * 0.7; tx = gx; ty = gy;
      },
      resize() { ({ ctx, W, H } = fit(cv)); },
      frame(d) {
        t += d;
        const hx = W / 2, hy = H * 0.24, L1 = Math.min(W, H) * 0.29, L2 = L1;
        if (mode === "squat") { gx = hx + Math.sin(t * 1.3) * L1 * 0.35; gy = hy + L1 * (1.25 + 0.6 * Math.sin(t * 0.9)); }
        const px = tx, py = ty; tx += (gx - tx) * Math.min(1, d * 10); ty += (gy - ty) * Math.min(1, d * 10);
        spin += (tx - px) / 22;
        let dx = tx - hx, dy = ty - hy, dist = Math.hypot(dx, dy);
        const reach = L1 + L2 - 0.5, dd = clamp(dist, 8, reach);
        const ux = dx / (dist || 1), uy = dy / (dist || 1), fx = hx + ux * dd, fy = hy + uy * dd;
        const c2 = clamp((dd * dd - L1 * L1 - L2 * L2) / (2 * L1 * L2), -1, 1);
        const a2 = knee * Math.acos(c2);
        const a1 = Math.atan2(fy - hy, fx - hx) - Math.atan2(L2 * Math.sin(a2), L1 + L2 * Math.cos(a2));
        const kx = hx + L1 * Math.cos(a1), ky = hy + L1 * Math.sin(a1);
        ctx.clearRect(0, 0, W, H);
        // workspace
        ctx.setLineDash([5, 6]); ctx.strokeStyle = C.line2; ctx.beginPath(); ctx.arc(hx, hy, L1 + L2, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = C.dim; ctx.font = "10px JBM, monospace"; ctx.fillText("reachable workspace", hx + (L1 + L2) * 0.72, hy + (L1 + L2) * 0.72);
        // target
        ctx.strokeStyle = dist > reach ? C.warn : C.accent2; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(gx, gy, 10, 0, TAU); ctx.moveTo(gx - 16, gy); ctx.lineTo(gx + 16, gy); ctx.moveTo(gx, gy - 16); ctx.lineTo(gx, gy + 16); ctx.stroke();
        // body
        ctx.fillStyle = C.bg3; ctx.strokeStyle = C.accent; ctx.lineWidth = 2; rr(ctx, hx - 70, hy - 46, 140, 40, 10); ctx.fill(); ctx.stroke();
        ctx.fillStyle = C.dim; ctx.fillText("BODY", hx - 60, hy - 22);
        // links
        ctx.lineCap = "round";
        const grad = ctx.createLinearGradient(hx, hy, fx, fy); grad.addColorStop(0, C.accent); grad.addColorStop(1, C.accent3);
        ctx.strokeStyle = grad; ctx.lineWidth = 14;
        ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
        ctx.strokeStyle = C.bg; ctx.lineWidth = 3; ctx.setLineDash([2, 10]);
        ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke(); ctx.setLineDash([]);
        // angle arcs
        ctx.strokeStyle = C.accent2; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(hx, hy, 34, Math.PI / 2, a1, a1 < Math.PI / 2); ctx.stroke();
        const kneeRel = Math.atan2(fy - ky, fx - kx);
        ctx.beginPath(); ctx.arc(kx, ky, 28, a1, kneeRel, knee < 0); ctx.stroke();
        // joints
        [[hx, hy], [kx, ky]].forEach(([x, y]) => { ctx.fillStyle = C.bg; ctx.strokeStyle = C.text; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 9, 0, TAU); ctx.fill(); ctx.stroke(); });
        // wheel
        ctx.save(); ctx.translate(fx, fy); ctx.rotate(spin);
        ctx.fillStyle = C.bg2; ctx.strokeStyle = C.text; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 26, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = C.accent; for (let i = 0; i < 4; i++) { ctx.rotate(TAU / 4); ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(22, 0); ctx.stroke(); }
        ctx.restore();
        const hipDeg = (a1 - Math.PI / 2) * 180 / Math.PI, kneeDeg = a2 * 180 / Math.PI;
        ctx.fillStyle = C.accent2; ctx.font = "11px JBM, monospace";
        ctx.fillText(`θ₁ ${hipDeg.toFixed(0)}°`, hx + 40, hy + 16); ctx.fillText(`θ₂ ${kneeDeg.toFixed(0)}°`, kx + 16, ky - 10);
        $("#ik-a1").textContent = hipDeg.toFixed(1) + "°"; $("#ik-a2").textContent = kneeDeg.toFixed(1) + "°";
        $("#ik-r").textContent = Math.round(dd / (L1 + L2) * 100) + "%";
      }
    };
    Bench.register("ik", I);
  })();

  /* ================= 03 PCB ================= */
  (function pcb() {
    const svg = $("#svg-pcb"); const NS = "http://www.w3.org/2000/svg";
    let mode = "after", t = 0, flows = [];
    const ports = [140, 200, 260, 320];
    const NETS = [
      { id: "VBAT", c: () => C.warn, w: 9, layer: "B.Cu",
        d: ["M165 230 H195", "M235 230 H255 V345 H605 V130", ...ports.map(p => `M605 ${p - 10} H630`)] },
      { id: "+5V", c: () => C.accent, w: 5, layer: "F.Cu", d: ["M255 230 V178 H290", "M350 178 H392", "M370 178 V125 H352"] },
      { id: "+3V3", c: () => C.accent3, w: 3.5, layer: "F.Cu", d: ["M448 178 H500 V118 H368 V108"] },
      { id: "CANH", c: () => C.accent2, w: 2.4, layer: "F.Cu", d: ["M328 104 V112", "M328 112 H560 V" + (ports[3]), ...ports.map(p => `M560 ${p} H630`)] },
      { id: "CANL", c: () => C.ok, w: 2.4, layer: "F.Cu", d: ["M340 104 V100 H572 V" + (ports[3] + 8), ...ports.map(p => `M572 ${p + 8} H630`)] },
      { id: "GND", c: () => C.muted, w: 0, layer: "pour", d: [] }
    ];
    const el = (tag, attrs, parent = svg) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent.appendChild(e); return e; };
    function comp(g, x, y, w, h, label, sub) {
      el("rect", { x, y, width: w, height: h, rx: 4, fill: "#0a0f12", stroke: "rgba(255,255,255,.35)", "stroke-width": 1 }, g);
      const tx = el("text", { x: x + w / 2, y: y + h / 2 + (sub ? -2 : 4), "text-anchor": "middle", fill: "#e9eef3", "font-size": 11, "font-family": "JBM, monospace" }, g); tx.textContent = label;
      if (sub) { const s = el("text", { x: x + w / 2, y: y + h / 2 + 11, "text-anchor": "middle", fill: "#8a96a3", "font-size": 8.5, "font-family": "JBM, monospace" }, g); s.textContent = sub; }
    }
    function build() {
      svg.innerHTML = ""; flows = [];
      const defs = el("defs", {});
      const pat = el("pattern", { id: "pour", width: 8, height: 8, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" }, defs);
      el("line", { x1: 0, y1: 0, x2: 0, y2: 8, stroke: "rgba(255,255,255,.06)", "stroke-width": 3 }, pat);
      // off-board devices
      const off = el("g", {});
      comp(off, 30, 200, 80, 60, "BATTERY", "6S Li-ion");
      comp(off, 290, 14, 110, 40, "CONTROLLER", "CAN master");
      ports.forEach((p, i) => comp(off, 712, p - 22, 70, 44, "ACT " + (i + 1), "motor + CAN"));
      const wires = el("g", {});
      const wire = (d, net) => { const p = el("path", { d, fill: "none", stroke: NETS.find(n => n.id === net).c(), "stroke-width": 3, "stroke-linecap": "round", opacity: .9, "data-net": net, class: "wire" }, wires); flows.push(p); p.setAttribute("stroke-dasharray", "6 8"); return p; };
      let count = 0;
      if (mode === "before") {
        ports.forEach((p, i) => { wire(`M110 ${222 + i * 6} C 300 ${240 + i * 40}, 520 ${p + 60}, 712 ${p + 6}`, "VBAT"); count++; });
        let prev = [345, 54];
        ports.forEach((p, i) => { wire(`M${prev[0]} ${prev[1]} C ${prev[0] + 120} ${prev[1] + 40}, 640 ${p - 50}, 747 ${p - 22}`, "CANH"); prev = [747, p + 22]; count++; });
        const t1 = el("text", { x: 400, y: 420, "text-anchor": "middle", fill: "#8a96a3", "font-size": 12, "font-family": "JBM, monospace" }); t1.textContent = "every actuator gets its own battery run + daisy-chained CAN";
      } else {
        // board
        const board = el("g", {});
        el("rect", { x: 150, y: 80, width: 510, height: 300, rx: 16, fill: "#0b2b22", stroke: "#2fbf8a", "stroke-width": 1.5 }, board);
        el("rect", { x: 160, y: 90, width: 490, height: 280, rx: 10, fill: "url(#pour)", "data-net": "GND", class: "pour" }, board);
        [[166, 96], [644, 96], [166, 364], [644, 364]].forEach(([x, y]) => el("circle", { cx: x, cy: y, r: 6, fill: "none", stroke: "#c9a35c", "stroke-width": 2 }, board));
        const lbl = el("text", { x: 170, y: 372, fill: "#2fbf8a", "font-size": 10, "font-family": "JBM, monospace" }, board); lbl.textContent = "PWR-CAN DIST · 2-LAYER · KiCad";
        // traces
        NETS.forEach(n => n.d.forEach(d => {
          const p = el("path", { d, fill: "none", stroke: n.c(), "stroke-width": n.w, "stroke-linecap": "round", "stroke-linejoin": "round", opacity: n.layer === "B.Cu" ? .55 : 1, "data-net": n.id, class: "trace" }, board);
          const f = el("path", { d, fill: "none", stroke: "#fff", "stroke-width": Math.max(1, n.w * 0.35), "stroke-linecap": "round", "stroke-dasharray": "2 14", opacity: .7, "data-net": n.id, class: "trace" }, board);
          flows.push(f);
        }));
        // vias
        ports.forEach(p => el("circle", { cx: 605, cy: p - 10, r: 5, fill: "#c9a35c" }, board));
        el("circle", { cx: 255, cy: 230, r: 5, fill: "#c9a35c" }, board);
        comp(board, 150, 212, 30, 36, "J1", "");
        comp(board, 195, 218, 40, 24, "F1", "fuse");
        comp(board, 290, 158, 60, 40, "U1", "buck 5V");
        comp(board, 392, 158, 56, 40, "U2", "LDO 3V3");
        comp(board, 312, 82, 44, 22, "J_CAN", "");
        ports.forEach((p, i) => comp(board, 630, p - 18, 32, 36, "J" + (i + 2), ""));
        // harness
        wire("M110 230 H150", "VBAT"); count++;
        wire("M345 54 V82", "CANH"); count++;
        ports.forEach(p => { wire(`M662 ${p} H712`, "CANH"); count++; });
      }
      $("#pcb-wires").textContent = `${count} cable runs ${mode === "after" ? "(−25%)" : ""} · illustrative`;
      hl(null);
    }
    function hl(net) {
      $$("[data-net]", svg).forEach(p => { p.style.opacity = !net || p.dataset.net === net ? "" : "0.12"; });
      $$("#pcb-legend button").forEach(b => b.classList.toggle("on", b.dataset.net === net));
      $$(".pour", svg).forEach(p => p.setAttribute("fill", net === "GND" ? "rgba(140,160,180,.18)" : "url(#pour)"));
    }
    const P = {
      init() {
        const lg = $("#pcb-legend");
        NETS.forEach(n => { const b = document.createElement("button"); b.dataset.net = n.id; b.style.setProperty("--c", n.c()); b.innerHTML = `<i></i>${n.id}<small style="opacity:.6">${n.layer === "pour" ? "pour" : n.layer}</small>`; lg.appendChild(b); });
        lg.addEventListener("pointerover", e => { const b = e.target.closest("button"); if (b) hl(b.dataset.net); });
        lg.addEventListener("pointerleave", () => hl(null));
        svg.addEventListener("pointerover", e => { const n = e.target.dataset && e.target.dataset.net; hl(n || null); });
        svg.addEventListener("pointerleave", () => hl(null));
        seg("pcb-mode", v => { mode = v; build(); });
        build();
      },
      onTheme() { if (this._ready) { $$("#pcb-legend button").forEach(b => b.style.setProperty("--c", NETS.find(n => n.id === b.dataset.net).c())); build(); } },
      frame(d) { t += d; flows.forEach(f => f.setAttribute("stroke-dashoffset", -t * 40)); }
    };
    Bench.register("pcb", P);
  })();

  /* ================= 04 EQUALIZER ================= */
  (function eq() {
    const cv = $("#c-eq"); let ctx, W, H, ac = null, src = [], an, filt = {}, master, playing = false, srcType = "chord", t = 0, chordT = 0, chordI = 0;
    const gains = { lo: 0, mid: 0, hi: 0 };
    const BANDS = { lo: ["lowshelf", 250], mid: ["peaking", 1000], hi: ["highshelf", 4000] };
    let off = null; // offline filters for response curve
    function makeFilters(ctxA) {
      const f = {};
      for (const k in BANDS) { const b = ctxA.createBiquadFilter(); b.type = BANDS[k][0]; b.frequency.value = BANDS[k][1]; b.Q.value = 0.9; b.gain.value = gains[k]; f[k] = b; }
      return f;
    }
    try { off = makeFilters(new OfflineAudioContext(1, 128, 44100)); } catch {}
    const NF = 160, freqs = new Float32Array(NF), mags = new Float32Array(NF), ph = new Float32Array(NF), tot = new Float32Array(NF);
    for (let i = 0; i < NF; i++) freqs[i] = 20 * Math.pow(1000, i / (NF - 1));
    function response() {
      tot.fill(0);
      if (!off) return;
      for (const k in off) { off[k].gain.value = gains[k]; off[k].getFrequencyResponse(freqs, mags, ph); for (let i = 0; i < NF; i++) tot[i] += 20 * Math.log10(mags[i] || 1e-6); }
    }
    const CHORDS = [[220, 277.18, 329.63], [196, 246.94, 293.66], [174.61, 220, 261.63], [196, 246.94, 329.63]];
    function start() {
      if (!ac) {
        const AC = window.AudioContext || window.webkitAudioContext; if (!AC) { UI.toast("Web Audio not supported here"); return; }
        ac = new AC(); filt = makeFilters(ac); an = ac.createAnalyser(); an.fftSize = 4096; an.smoothingTimeConstant = 0.78;
        master = ac.createGain(); master.gain.value = 0.0;
        filt.lo.connect(filt.mid); filt.mid.connect(filt.hi); filt.hi.connect(an); an.connect(master); master.connect(ac.destination);
      }
      ac.resume();
      stopSrc();
      if (srcType === "chord") {
        CHORDS[0].forEach((f, i) => { const o = ac.createOscillator(); o.type = i === 0 ? "sawtooth" : "square"; o.frequency.value = f; const g = ac.createGain(); g.gain.value = i === 0 ? 0.5 : 0.18; o.connect(g); g.connect(filt.lo); o.start(); src.push(o, g); });
        const sub = ac.createOscillator(); sub.type = "sine"; sub.frequency.value = 55; const sg = ac.createGain(); sg.gain.value = 0.7; sub.connect(sg); sg.connect(filt.lo); sub.start(); src.push(sub, sg);
        const hat = noiseNode(); const hp = ac.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 7000; const hg = ac.createGain(); hg.gain.value = 0.0; hat.connect(hp); hp.connect(hg); hg.connect(filt.lo); hat.start(); src.push(hat, hp, hg); src.hat = hg;
      } else if (srcType === "noise") {
        const n = noiseNode(); const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 9000; const g = ac.createGain(); g.gain.value = 0.35; n.connect(lp); lp.connect(g); g.connect(filt.lo); n.start(); src.push(n, lp, g);
      } else {
        const o = ac.createOscillator(); o.type = "sine"; const g = ac.createGain(); g.gain.value = 0.6; o.connect(g); g.connect(filt.lo); o.start();
        const now = ac.currentTime; for (let k = 0; k < 40; k++) { o.frequency.setValueAtTime(40, now + k * 5); o.frequency.exponentialRampToValueAtTime(12000, now + k * 5 + 5); }
        src.push(o, g);
      }
      master.gain.cancelScheduledValues(ac.currentTime); master.gain.setTargetAtTime(0.16, ac.currentTime, 0.05);
      playing = true; $("#eq-play").textContent = "■ Stop audio";
    }
    function noiseNode() {
      const len = ac.sampleRate * 2, buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0; for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; b0 = 0.99765 * b0 + w * 0.099; b1 = 0.963 * b1 + w * 0.2965; b2 = 0.57 * b2 + w * 1.0526; d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2; }
      const n = ac.createBufferSource(); n.buffer = buf; n.loop = true; return n;
    }
    function stopSrc() { src.forEach(n => { try { n.stop && n.stop(); } catch {} try { n.disconnect(); } catch {} }); src = []; }
    function stop() { if (!ac) return; master.gain.setTargetAtTime(0, ac.currentTime, 0.04); setTimeout(stopSrc, 200); playing = false; $("#eq-play").textContent = "▶ Play audio"; }
    const E = {
      init() {
        $("#eq-play").addEventListener("click", () => playing ? stop() : start());
        seg("eq-src", v => { srcType = v; if (playing) start(); });
        [["lo", "eq-lo"], ["mid", "eq-mid"], ["hi", "eq-hi"]].forEach(([k, id]) => {
          const inp = document.getElementById(id), out = inp.nextElementSibling;
          inp.addEventListener("input", () => { gains[k] = +inp.value; out.textContent = (gains[k] > 0 ? "+" : "") + gains[k] + " dB"; if (ac) filt[k].gain.setTargetAtTime(gains[k], ac.currentTime, 0.02); response(); });
        });
        response(); E.resize();
      },
      resize() { ({ ctx, W, H } = fit(cv)); },
      start() { const v = $(".eq-video"); if (v.preload === "none") { v.preload = "metadata"; } v.play().catch(() => {}); },
      stop() { stop(); $(".eq-video").pause(); },
      frame(d) {
        t += d;
        if (playing && srcType === "chord" && ac) {
          chordT += d;
          if (chordT > 1.6) { chordT = 0; chordI = (chordI + 1) % CHORDS.length; const osc = src.filter(n => n instanceof OscillatorNode); CHORDS[chordI].forEach((f, i) => osc[i] && osc[i].frequency.setTargetAtTime(f, ac.currentTime, 0.03)); osc[3] && osc[3].frequency.setTargetAtTime(CHORDS[chordI][0] / 4, ac.currentTime, 0.03); }
          if (src.hat) src.hat.gain.setValueAtTime(((chordT * 4) % 1) < 0.08 ? 0.25 : 0.0, ac.currentTime);
        }
        draw();
      }
    };
    function draw() {
      ctx.clearRect(0, 0, W, H);
      const pad = 18, sh = H * 0.42, top = pad, by = top + sh + 28;
      // scope frame
      ctx.strokeStyle = C.line2; ctx.lineWidth = 1; rr(ctx, pad, top, W - pad * 2, sh, 10); ctx.stroke();
      ctx.strokeStyle = C.line; for (let i = 1; i < 10; i++) { const x = pad + (W - pad * 2) * i / 10; ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, top + sh); ctx.stroke(); }
      for (let i = 1; i < 6; i++) { const y = top + sh * i / 6; ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(W - pad, y); ctx.stroke(); }
      ctx.fillStyle = C.dim; ctx.font = "10px JBM, monospace"; ctx.fillText("CH1  scope · time domain", pad + 8, top + 14);
      ctx.strokeStyle = C.ok; ctx.lineWidth = 1.8; ctx.shadowColor = C.ok; ctx.shadowBlur = 8; ctx.beginPath();
      const n = 512;
      if (playing && an) {
        const buf = new Float32Array(an.fftSize); an.getFloatTimeDomainData(buf);
        let s0 = 0; for (let i = 1; i < buf.length / 2; i++) if (buf[i - 1] < 0 && buf[i] >= 0) { s0 = i; break; }
        for (let i = 0; i < n; i++) { const x = pad + (W - pad * 2) * i / n, y = top + sh / 2 - clamp(buf[s0 + i] * 2.2, -1, 1) * (sh / 2 - 6); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      } else {
        const gl = Math.pow(10, gains.lo / 20), gm = Math.pow(10, gains.mid / 20), gh = Math.pow(10, gains.hi / 20);
        for (let i = 0; i < n; i++) { const k = i / n, x = pad + (W - pad * 2) * k; const v = 0.45 * gl * Math.sin(k * TAU * 2 + t * 2) + 0.25 * gm * Math.sin(k * TAU * 9 + t * 5) + 0.12 * gh * Math.sin(k * TAU * 37 + t * 9); const y = top + sh / 2 - clamp(v * 0.7, -1, 1) * (sh / 2 - 6); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      }
      ctx.stroke(); ctx.shadowBlur = 0;
      if (!playing) { ctx.fillStyle = C.dim; ctx.fillText("idle preview — press ▶ Play audio to hear it", pad + 8, top + sh - 10); }
      // spectrum
      const bh = H - by - pad, bw = W - pad * 2;
      ctx.strokeStyle = C.line2; rr(ctx, pad, by, bw, bh, 10); ctx.stroke();
      const fx = f => pad + bw * Math.log(f / 20) / Math.log(1000);
      // band regions
      [["LOW", 20, 250, C.accent], ["MID", 250, 4000, C.accent3], ["HIGH", 4000, 20000, C.accent2]].forEach(([lab, a, b, c]) => {
        ctx.fillStyle = c; ctx.globalAlpha = 0.06; ctx.fillRect(fx(a), by, fx(b) - fx(a), bh); ctx.globalAlpha = 1;
        ctx.fillStyle = c; ctx.fillText(lab, fx(a) + 6, by + 30);
      });
      [100, 1000, 10000].forEach(f => { ctx.fillStyle = C.dim; ctx.fillText(f >= 1000 ? f / 1000 + "k" : f, fx(f) - 8, by + bh - 6); ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(fx(f), by); ctx.lineTo(fx(f), by + bh - 16); ctx.stroke(); });
      if (playing && an) {
        const fb = new Uint8Array(an.frequencyBinCount); an.getByteFrequencyData(fb);
        const bars = 96, sr = ac.sampleRate;
        for (let i = 0; i < bars; i++) {
          const f0 = 20 * Math.pow(1000, i / bars), f1 = 20 * Math.pow(1000, (i + 1) / bars);
          const b0 = Math.floor(f0 / (sr / 2) * fb.length), b1 = Math.max(b0 + 1, Math.floor(f1 / (sr / 2) * fb.length));
          let m = 0; for (let b = b0; b < b1 && b < fb.length; b++) m = Math.max(m, fb[b]);
          const h = (m / 255) * (bh - 30);
          const g = ctx.createLinearGradient(0, by + bh, 0, by + bh - h); g.addColorStop(0, C.accent); g.addColorStop(1, C.accent3);
          ctx.fillStyle = g; ctx.fillRect(fx(f0) + 1, by + bh - 18 - h, Math.max(1, fx(f1) - fx(f0) - 2), h);
        }
      }
      // response curve
      ctx.strokeStyle = C.text; ctx.lineWidth = 2; ctx.beginPath();
      const mid = by + bh / 2;
      for (let i = 0; i < NF; i++) { const x = fx(freqs[i]), y = mid - tot[i] / 15 * (bh / 2 - 20); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke();
      ctx.setLineDash([3, 5]); ctx.strokeStyle = C.line2; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad, mid); ctx.lineTo(pad + bw, mid); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = C.dim; ctx.fillText("spectrum + EQ response (0 dB dashed)", pad + bw - 236, by + 14);
    }
    Bench.register("eq", E);
  })();

  /* ================= 05 FOOT ================= */
  (function foot() {
    const svg = $("#svg-foot"), cv = $("#c-foot"); const NS = "http://www.w3.org/2000/svg";
    let ctx, W, H, mode = "gait", size = 10, phase = 0, cop = { x: 150, y: 420 }, load = 0, manual = { x: 150, y: 260, on: false }, trail = [], loadHist = [];
    const PADS = [[118, 92, "T1"], [178, 118, "T2"], [104, 172, "M1"], [152, 166, "M3"], [200, 182, "M5"], [196, 290, "LM"], [120, 300, "AR"], [126, 432, "HM"], [172, 432, "HL"]];
    const vals = new Array(9).fill(0);
    const OUT = "M150 20 C 95 20 80 70 78 120 C 76 170 92 210 100 250 C 108 300 96 350 98 400 C 100 470 130 505 155 505 C 190 505 210 470 208 420 C 206 360 222 320 226 260 C 230 200 232 160 226 120 C 220 60 200 20 150 20 Z";
    let padEls = [], copEl, trailEl, g;
    const sc = { 8: 0.88, 9: 0.93, 10: 1, 12: 1.09 };
    function build() {
      svg.innerHTML = "";
      const defs = document.createElementNS(NS, "defs");
      defs.innerHTML = `<radialGradient id="heat"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="${C.accent}"/><stop offset="1" stop-color="${C.accent}" stop-opacity="0"/></radialGradient>`;
      svg.appendChild(defs);
      g = document.createElementNS(NS, "g"); svg.appendChild(g);
      const s = sc[size]; g.setAttribute("transform", `translate(${150 - 150 * s} ${262 - 262 * s}) scale(${s})`);
      const o = document.createElementNS(NS, "path"); o.setAttribute("d", OUT); o.setAttribute("fill", C.bg3); o.setAttribute("stroke", C.line2); o.setAttribute("stroke-width", 2); g.appendChild(o);
      // lattice hint
      for (let y = 40; y < 500; y += 18) { const l = document.createElementNS(NS, "path"); l.setAttribute("d", `M60 ${y} Q 150 ${y + (y % 36 ? 8 : -8)} 240 ${y}`); l.setAttribute("stroke", C.line); l.setAttribute("fill", "none"); g.appendChild(l); }
      const clip = document.createElementNS(NS, "clipPath"); clip.id = "footclip"; const cp = document.createElementNS(NS, "path"); cp.setAttribute("d", OUT); clip.appendChild(cp); defs.appendChild(clip);
      [...g.querySelectorAll("path")].slice(1).forEach(p => p.setAttribute("clip-path", "url(#footclip)"));
      padEls = PADS.map(([x, y, lab]) => {
        const glow = document.createElementNS(NS, "circle"); glow.setAttribute("cx", x); glow.setAttribute("cy", y); glow.setAttribute("r", 34); glow.setAttribute("fill", "url(#heat)"); glow.setAttribute("opacity", 0); g.appendChild(glow);
        const c = document.createElementNS(NS, "circle"); c.setAttribute("cx", x); c.setAttribute("cy", y); c.setAttribute("r", 13); c.setAttribute("fill", C.bg); c.setAttribute("stroke", C.accent); c.setAttribute("stroke-width", 1.5); g.appendChild(c);
        const t = document.createElementNS(NS, "text"); t.setAttribute("x", x); t.setAttribute("y", y + 3.5); t.setAttribute("text-anchor", "middle"); t.setAttribute("font-size", 9); t.setAttribute("font-family", "JBM, monospace"); t.setAttribute("fill", C.muted); t.textContent = lab; g.appendChild(t);
        return { glow, c };
      });
      trailEl = document.createElementNS(NS, "polyline"); trailEl.setAttribute("fill", "none"); trailEl.setAttribute("stroke", C.accent2); trailEl.setAttribute("stroke-width", 2); trailEl.setAttribute("stroke-dasharray", "3 4"); g.appendChild(trailEl);
      copEl = document.createElementNS(NS, "circle"); copEl.setAttribute("r", 7); copEl.setAttribute("fill", C.accent2); copEl.setAttribute("stroke", "#fff"); copEl.setAttribute("stroke-width", 2); g.appendChild(copEl);
      const lab = document.createElementNS(NS, "text"); lab.setAttribute("x", 150); lab.setAttribute("y", 516); lab.setAttribute("text-anchor", "middle"); lab.setAttribute("font-size", 10); lab.setAttribute("font-family", "JBM, monospace"); lab.setAttribute("fill", C.dim); lab.textContent = `US ${size} · scale ×${sc[size].toFixed(2)}`; svg.appendChild(lab);
    }
    function toLocal(e) {
      const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
      const p = pt.matrixTransform(g.getScreenCTM().inverse()); return p;
    }
    const F = {
      init() {
        seg("foot-mode", v => { mode = v; trail = []; });
        seg("foot-size", v => { size = +v; build(); });
        svg.addEventListener("pointermove", e => { const p = toLocal(e); manual.x = p.x; manual.y = p.y; if (mode === "gait") { mode = "manual"; $$("#foot-mode button").forEach(b => b.classList.toggle("on", b.dataset.v === "manual")); } });
        svg.addEventListener("pointerdown", () => manual.on = true);
        addEventListener("pointerup", () => manual.on = false);
        build(); F.resize();
      },
      onTheme() { if (this._ready) build(); },
      resize() { ({ ctx, W, H } = fit(cv)); },
      frame(d) {
        if (mode === "gait") {
          phase = (phase + d / 1.8) % 1;
          const st = 0.66;
          if (phase < st) {
            const p = phase / st;
            const y = 440 - p * 360, x = 150 + Math.sin(p * Math.PI) * 38 - (p > 0.75 ? (p - 0.75) * 120 : 0);
            cop = { x, y };
            load = (Math.sin(p * Math.PI) * 0.55 + 0.45 * (Math.exp(-((p - 0.18) ** 2) / 0.01) + Math.exp(-((p - 0.8) ** 2) / 0.012))) * 1.05;
          } else { load = Math.max(0, load - d * 6); }
        } else {
          cop = { x: manual.x, y: manual.y };
          const inside = manual.x > 70 && manual.x < 235 && manual.y > 20 && manual.y < 505;
          load = inside ? (manual.on ? 1.15 : 0.7) : 0;
        }
        trail.push([cop.x, cop.y]); if (trail.length > 70) trail.shift();
        loadHist.push(load); if (loadHist.length > 200) loadHist.shift();
        PADS.forEach(([x, y], i) => {
          const dd = (x - cop.x) ** 2 + (y - cop.y) ** 2;
          const target = load * Math.exp(-dd / (2 * 58 * 58));
          vals[i] += (target - vals[i]) * Math.min(1, d * 14);
          padEls[i].glow.setAttribute("opacity", clamp(vals[i] * 1.3, 0, 1).toFixed(3));
          padEls[i].glow.setAttribute("r", (20 + vals[i] * 30).toFixed(1));
          padEls[i].c.setAttribute("fill", vals[i] > 0.35 ? C.accent : C.bg);
        });
        copEl.setAttribute("cx", cop.x); copEl.setAttribute("cy", cop.y); copEl.setAttribute("opacity", load > 0.05 ? 1 : 0.2);
        trailEl.setAttribute("points", load > 0.05 ? trail.map(p => p.join(",")).join(" ") : "");
        $("#foot-cop").textContent = load > 0.05 ? `${((cop.x - 150) / 3).toFixed(0)}, ${((440 - cop.y) / 3).toFixed(0)} mm` : "swing";
        $("#foot-load").textContent = (load * 100).toFixed(0) + "% BW";
        drawBars();
      }
    };
    function drawBars() {
      ctx.clearRect(0, 0, W, H);
      const pad = 16, top = 26, rows = 9, rh = Math.min(34, (H * 0.68 - top) / rows);
      ctx.font = "10px JBM, monospace"; ctx.fillStyle = C.dim; ctx.fillText("ADS124S08 · AIN0–AIN8 · 24-bit codes", pad, 16);
      PADS.forEach(([, , lab], i) => {
        const y = top + i * rh, v = clamp(vals[i], 0, 1.2), bw = W - pad * 2 - 120;
        ctx.fillStyle = C.muted; ctx.fillText(`CH${i} ${lab}`, pad, y + rh * 0.62);
        ctx.fillStyle = C.line; rr(ctx, pad + 56, y + 5, bw, rh - 10, 4); ctx.fill();
        const g = ctx.createLinearGradient(pad + 56, 0, pad + 56 + bw, 0); g.addColorStop(0, C.accent2); g.addColorStop(0.6, C.accent); g.addColorStop(1, C.warn);
        ctx.fillStyle = g; rr(ctx, pad + 56, y + 5, Math.max(2, bw * v / 1.2), rh - 10, 4); ctx.fill();
        const code = Math.round(v / 1.2 * 8388607);
        ctx.fillStyle = C.text; ctx.fillText("0x" + code.toString(16).toUpperCase().padStart(6, "0"), pad + 62 + bw, y + rh * 0.62);
      });
      const gy = top + rows * rh + 20, gh = H - gy - pad;
      if (gh > 30) {
        ctx.strokeStyle = C.line2; rr(ctx, pad, gy, W - pad * 2, gh, 8); ctx.stroke();
        ctx.fillStyle = C.dim; ctx.fillText("total load", pad + 8, gy + 14);
        ctx.strokeStyle = C.accent; ctx.lineWidth = 1.6; ctx.beginPath();
        loadHist.forEach((v, i) => { const x = pad + i / 200 * (W - pad * 2), y = gy + gh - 6 - clamp(v / 1.2, 0, 1) * (gh - 22); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
        ctx.stroke(); ctx.lineWidth = 1;
      }
    }
    Bench.register("foot", F);
  })();

  /* ================= 06 TSV ================= */
  (function tsv() {
    const cv = $("#c-tsv"); let ctx, W, H, step = 0, t = 1, auto = false, autoT = 0, time = 0;
    const STEPS = [
      ["Solvent clean", "Acetone / IPA / DI rinse — particles and organics off the wafer.", "Wet bench", 1],
      ["Spin-coat resist", "Thick photoresist spun to thickness; soft-baked.", "Laurell WS-650-23B", 1],
      ["Align & expose", "UV through the mask defines the via openings.", "SÜSS MA6/BA6", 1],
      ["Develop", "Exposed resist dissolves — the soft mask is ready.", "Develop + inspect", 1],
      ["Deep silicon etch", "Cyclic etch/passivate (Bosch-style) drives vias deep; wider openings etch faster.", "ICP-RIE", 0],
      ["Strip & measure", "Resist removed; via depth and profile measured.", "Keyence VK-X3000 · Filmetrics F40", 1],
      ["Sputter liner / seed", "Conformal dielectric + metal seed layer.", "DC/RF sputtering", 1],
      ["Copper fill", "Electroplated copper fills the vias bottom-up.", "Electroplating", 0],
      ["Planarize", "Overburden removed; vias ready for reveal.", "CMP (planned)", 0]
    ];
    const VIAS = [[0.25, 0.05, 1.0], [0.5, 0.075, 1.18], [0.75, 0.11, 1.32]]; // x, half-width frac, relative etch rate
    const T = {
      init() {
        const ol = $("#tsv-steps");
        ol.innerHTML = STEPS.map((s, i) => `<li data-i="${i}">${s[0]}${s[3] ? '<span class="hands">hands-on</span>' : ""}</li>`).join("");
        ol.addEventListener("click", e => { const li = e.target.closest("li"); if (li) go(+li.dataset.i); });
        $("#tsv-prev").onclick = () => go(Math.max(0, step - 1));
        $("#tsv-next").onclick = () => go(Math.min(STEPS.length - 1, step + 1));
        $("#tsv-play").onclick = () => { auto = !auto; $("#tsv-play").textContent = auto ? "❚❚ Pause" : "▶ Auto"; if (auto && step === STEPS.length - 1) go(0); };
        go(0); T.resize();
      },
      resize() { ({ ctx, W, H } = fit(cv)); },
      frame(d) {
        time += d; t = Math.min(1, t + d / 1.6);
        if (auto && t >= 1) { autoT += d; if (autoT > 1.4) { autoT = 0; go(step < STEPS.length - 1 ? step + 1 : 0); } }
        draw();
      }
    };
    function go(i) { step = i; t = 0; autoT = 0; $$("#tsv-steps li").forEach((li, k) => { li.classList.toggle("on", k === i); li.classList.toggle("done", k < i); }); }
    function draw() {
      ctx.clearRect(0, 0, W, H);
      const L = 30, R = W - 30, surf = H * 0.36, depth = H * 0.42, bottom = H - 24;
      const e = t < 1 ? 1 - Math.pow(1 - t, 3) : 1;
      const at = (k) => step > k ? 1 : step === k ? e : 0; // progress of step k
      const resistT = 22;
      const si = "#5d6a7a", siDark = "#3b4552", resistC = C.accent, cu = "#d9874a", liner = C.accent2;
      // substrate
      const sg = ctx.createLinearGradient(0, surf, 0, bottom); sg.addColorStop(0, si); sg.addColorStop(1, siDark);
      ctx.fillStyle = sg; ctx.fillRect(L, surf, R - L, bottom - surf);
      ctx.fillStyle = "rgba(255,255,255,.04)"; for (let y = surf + 8; y < bottom; y += 10) ctx.fillRect(L, y, R - L, 1);
      // via cavities
      const etchP = at(4), viaDepth = depth;
      VIAS.forEach(([fx, hw, rate]) => {
        const cx = L + (R - L) * fx, w = (R - L) * hw, dpt = Math.min(viaDepth, viaDepth * 0.72 * rate) * etchP;
        if (dpt <= 0) return;
        // scalloped cavity
        ctx.fillStyle = C.bg; ctx.beginPath(); ctx.moveTo(cx - w, surf);
        const sc = 9; for (let y = 0; y < dpt; y += sc) { ctx.quadraticCurveTo(cx - w - 4, surf + y + sc / 2, cx - w, surf + Math.min(dpt, y + sc)); }
        ctx.lineTo(cx + w, surf + dpt);
        for (let y = dpt; y > 0; y -= sc) { ctx.quadraticCurveTo(cx + w + 4, surf + y - sc / 2, cx + w, surf + Math.max(0, y - sc)); }
        ctx.closePath(); ctx.fill();
        // liner
        const ln = at(6);
        if (ln > 0) { ctx.strokeStyle = liner; ctx.globalAlpha = ln; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx - w, surf); ctx.lineTo(cx - w, surf + dpt); ctx.lineTo(cx + w, surf + dpt); ctx.lineTo(cx + w, surf); ctx.stroke(); ctx.globalAlpha = 1; }
        // copper
        const fillP = at(7);
        if (fillP > 0) { const fh = dpt * fillP; ctx.fillStyle = cu; ctx.fillRect(cx - w + 1.5, surf + dpt - fh, w * 2 - 3, fh); if (fillP > 0.95 && step < 8) { ctx.beginPath(); ctx.ellipse(cx, surf, w * 1.6, 10 * (1 - at(8)), 0, Math.PI, TAU); ctx.fill(); } }
        // depth label (after measure)
        if (step >= 5) { ctx.fillStyle = C.text; ctx.font = "10px JBM, monospace"; ctx.textAlign = "center"; ctx.fillText(`d=${(dpt / viaDepth * 100).toFixed(0)}%`, cx, surf + dpt + 16); ctx.textAlign = "left"; }
      });
      // liner top surface
      if (at(6) > 0) { ctx.fillStyle = liner; ctx.globalAlpha = at(6) * (1 - at(8)); ctx.fillRect(L, surf - 3, R - L, 3); ctx.globalAlpha = 1; }
      if (at(7) > 0 && step < 8) { ctx.fillStyle = cu; ctx.globalAlpha = at(7); ctx.fillRect(L, surf - 3 - 6 * at(7), R - L, 6 * at(7)); ctx.globalAlpha = 1; }
      // resist
      const rs = at(1), stripP = at(5);
      if (rs > 0 && stripP < 1) {
        const span = (R - L) * rs, cx = (L + R) / 2;
        ctx.globalAlpha = 1 - stripP;
        ctx.fillStyle = resistC;
        ctx.fillRect(cx - span / 2, surf - resistT, span, resistT);
        // exposed regions
        const ex = at(2), dev = at(3);
        VIAS.forEach(([fx, hw]) => {
          const vx = L + (R - L) * fx, w = (R - L) * hw;
          if (ex > 0 && dev < 1) { ctx.fillStyle = `rgba(255,255,255,${0.55 * ex * (1 - dev)})`; ctx.fillRect(vx - w, surf - resistT, w * 2, resistT); }
          if (dev > 0) { ctx.fillStyle = C.bg; ctx.globalAlpha = (1 - stripP) * dev; ctx.fillRect(vx - w, surf - resistT, w * 2, resistT); ctx.globalAlpha = 1 - stripP; }
        });
        ctx.globalAlpha = 1;
      }
      // step-specific effects
      ctx.font = "11px JBM, monospace";
      if (step === 0) { for (let i = 0; i < 26; i++) { const x = L + ((i * 97 + time * 60) % (R - L)), y = surf - 10 - ((time * 40 + i * 37) % 80); ctx.strokeStyle = C.accent2; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.arc(x, y, 3 + (i % 3), 0, TAU); ctx.stroke(); } ctx.globalAlpha = 1; }
      if (step === 1 && t < 1) { ctx.strokeStyle = C.accent; ctx.globalAlpha = .6; for (let i = 0; i < 6; i++) { const a = time * 12 + i; ctx.beginPath(); ctx.arc((L + R) / 2, surf - 40, 30 + i * 8, a, a + 0.8); ctx.stroke(); } ctx.globalAlpha = 1; ctx.fillStyle = C.muted; ctx.fillText("3000 rpm", (L + R) / 2 - 28, surf - 90); }
      if (step === 2) {
        const my = surf - resistT - 44;
        ctx.fillStyle = "#1a1f26"; ctx.fillRect(L, my, R - L, 12);
        VIAS.forEach(([fx, hw]) => { const vx = L + (R - L) * fx, w = (R - L) * hw; ctx.clearRect(vx - w, my, w * 2, 12); ctx.fillStyle = C.bg; ctx.fillRect(vx - w, my, w * 2, 12);
          ctx.strokeStyle = "#b18cff"; ctx.globalAlpha = 0.8 * (1 - e * 0.3); for (let k = 0; k < 5; k++) { const yy = (time * 160 + k * 18) % 40; ctx.beginPath(); ctx.moveTo(vx - w + 4 + k * (w * 2 - 8) / 4, my - 40 + yy); ctx.lineTo(vx - w + 4 + k * (w * 2 - 8) / 4, my - 30 + yy); ctx.stroke(); } ctx.globalAlpha = 1; });
        ctx.fillStyle = C.muted; ctx.fillText("chrome mask", L, my - 8);
      }
      if (step === 4 && t < 1) { for (let i = 0; i < 40; i++) { const x = L + ((i * 53) % (R - L)), y = surf - 70 + ((time * 120 + i * 29) % 70); ctx.fillStyle = i % 2 ? "#ff7a45" : "#b18cff"; ctx.globalAlpha = 0.6; ctx.fillRect(x, y, 2, 6); } ctx.globalAlpha = 1; ctx.fillStyle = C.muted; ctx.fillText("SF₆ etch ⇄ C₄F₈ passivate", L, surf - 80); }
      if (step === 5) { const sx = L + ((time * 0.35) % 1) * (R - L); ctx.strokeStyle = C.ok; ctx.shadowColor = C.ok; ctx.shadowBlur = 10; ctx.beginPath(); ctx.moveTo(sx, 30); ctx.lineTo(sx, surf + depth); ctx.stroke(); ctx.shadowBlur = 0; ctx.fillStyle = C.ok; ctx.fillText("confocal z-scan", sx + 6, 46); }
      if (step === 6 && t < 1) { for (let i = 0; i < 50; i++) { const x = L + ((i * 41) % (R - L)), y = 40 + ((time * 200 + i * 23) % (surf - 50)); ctx.fillStyle = liner; ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.arc(x, y, 1.6, 0, TAU); ctx.fill(); } ctx.globalAlpha = 1; }
      if (step === 8) { const px = L + (R - L) * (0.5 + 0.4 * Math.sin(time * 2)); ctx.fillStyle = C.dim; rr(ctx, px - 90, surf - 34 + 20 * (1 - e), 180, 22, 8); ctx.fill(); ctx.fillStyle = C.muted; ctx.fillText("polish pad", px - 32, surf - 19 + 20 * (1 - e)); }
      // labels
      ctx.fillStyle = C.dim; ctx.fillText("Si substrate", L + 8, bottom - 8);
      const s = STEPS[step];
      ctx.fillStyle = C.accent; ctx.font = "11px JBM, monospace"; ctx.fillText(`STEP ${step + 1}/${STEPS.length} · ${s[2].toUpperCase()}`, 22, 24);
      ctx.fillStyle = C.text; ctx.font = "700 20px Bricolage, sans-serif"; ctx.fillText(s[0], 22, 50);
      ctx.fillStyle = C.muted; ctx.font = "13px Inter, sans-serif"; wrap(s[1], 22, 72, Math.min(W - 44, 520), 18);
    }
    function wrap(txt, x, y, mw, lh) { const words = txt.split(" "); let line = ""; for (const w of words) { const test = line + w + " "; if (ctx.measureText(test).width > mw && line) { ctx.fillText(line, x, y); line = w + " "; y += lh; } else line = test; } ctx.fillText(line, x, y); }
    Bench.register("tsv", T);
  })();

  /* ================= 07 FILM THICKNESS ================= */
  (function film() {
    const cv = $("#c-film"); let ctx, W, H, pts = [], meas = 0, mapImg = null, mapReady = 0, pat = 61, params, probe = null, revealT = 0, cx, cy, R;
    function newWafer() { params = { t0: 900 + Math.random() * 600, a: (Math.random() - 0.3) * 60, bx: (Math.random() - 0.5) * 40, by: (Math.random() - 0.5) * 40, s: Math.random() * 100 }; }
    const thick = (x, y) => params.t0 + params.a * (x * x + y * y) + params.bx * x + params.by * y + (fbm(x * 2 + params.s, y * 2 + params.s, 3) - 0.5) * 30;
    function pattern(n) {
      const rings = n === 61 ? [6, 12, 18, 24] : n === 25 ? [8, 16] : [8];
      const out = [[0, 0]]; rings.forEach((k, ri) => { const r = (ri + 1) / rings.length * 0.92; for (let i = 0; i < k; i++) { const a = i / k * TAU + ri * 0.2; out.push([Math.cos(a) * r, Math.sin(a) * r]); } });
      return out;
    }
    function run() { newWafer(); pts = pattern(pat).map(([x, y]) => ({ x, y, v: thick(x, y) })); meas = 0; mapReady = 0; revealT = 0; mapImg = null; ["mean", "sd", "nu"].forEach(k => $("#film-" + k).textContent = "measuring…"); }
    function idw(x, y, n = pts.length) {
      let sw = 0, sv = 0; for (let i = 0; i < n; i++) { const p = pts[i]; const d2 = (p.x - x) ** 2 + (p.y - y) ** 2; if (d2 < 1e-6) return p.v; const w = 1 / (d2 * d2); sw += w; sv += w * p.v; } return sv / sw;
    }
    function buildMap() {
      const N = 180; const img = new ImageData(N, N);
      const vs = pts.map(p => p.v), mn = Math.min(...vs), mx = Math.max(...vs);
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
        const x = (i / (N - 1)) * 2 - 1, y = (j / (N - 1)) * 2 - 1, k = (j * N + i) * 4;
        if (x * x + y * y > 1 || y > 0.94) { img.data[k + 3] = 0; continue; }
        const c = cmap((idw(x, y) - mn) / (mx - mn || 1)); img.data[k] = c[0] * 255; img.data[k + 1] = c[1] * 255; img.data[k + 2] = c[2] * 255; img.data[k + 3] = 255;
      }
      const oc = document.createElement("canvas"); oc.width = oc.height = N; oc.getContext("2d").putImageData(img, 0, 0); mapImg = oc;
      const mean = vs.reduce((a, b) => a + b, 0) / vs.length, sd = Math.sqrt(vs.reduce((a, b) => a + (b - mean) ** 2, 0) / vs.length);
      $("#film-mean").textContent = mean.toFixed(1) + " nm"; $("#film-sd").textContent = sd.toFixed(1) + " nm"; $("#film-nu").textContent = ((mx - mn) / (2 * mean) * 100).toFixed(2) + "%";
      FILM.range = [mn, mx];
    }
    const FILM = {
      init() {
        seg("film-pat", v => { pat = +v; run(); });
        $("#film-run").onclick = run;
        cv.addEventListener("pointermove", e => { const r = cv.getBoundingClientRect(); const x = (e.clientX - r.left - cx) / R, y = (e.clientY - r.top - cy) / R; probe = x * x + y * y <= 1 ? { x, y } : null; });
        cv.addEventListener("pointerleave", () => probe = null);
        FILM.resize(); run();
      },
      resize() { ({ ctx, W, H } = fit(cv)); R = Math.min(W * 0.36, H * 0.4); cx = W * 0.42; cy = H / 2; },
      frame(d) {
        if (meas < pts.length) { meas = Math.min(pts.length, meas + d * (pts.length / 2.6)); if (meas >= pts.length) buildMap(); }
        else revealT = Math.min(1, revealT + d * 1.2);
        draw();
      }
    };
    function draw() {
      ctx.clearRect(0, 0, W, H);
      // wafer
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, -Math.PI / 2 + 0.33, Math.PI * 1.5 - 0.33); ctx.closePath();
      ctx.fillStyle = "#1c232c"; ctx.fill(); ctx.strokeStyle = C.line2; ctx.lineWidth = 1.5; ctx.stroke(); ctx.clip();
      if (mapImg) { ctx.globalAlpha = revealT; ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R * revealT * 1.05, 0, TAU); ctx.clip(); ctx.drawImage(mapImg, cx - R, cy - R, R * 2, R * 2); ctx.restore(); ctx.globalAlpha = 1; }
      else { const g = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.3, 10, cx, cy, R); g.addColorStop(0, "rgba(180,140,255,.25)"); g.addColorStop(0.5, "rgba(77,225,255,.15)"); g.addColorStop(1, "rgba(255,182,39,.12)"); ctx.fillStyle = g; ctx.fillRect(cx - R, cy - R, R * 2, R * 2); }
      ctx.restore();
      // flat label
      ctx.fillStyle = C.dim; ctx.font = "10px JBM, monospace"; ctx.textAlign = "center"; ctx.fillText("flat", cx, cy - R - 6); ctx.textAlign = "left";
      // points
      const n = Math.floor(meas);
      pts.forEach((p, i) => {
        const x = cx + p.x * R, y = cy + p.y * R;
        ctx.fillStyle = i < n ? "#fff" : "rgba(255,255,255,.2)"; ctx.beginPath(); ctx.arc(x, y, i < n ? 2.6 : 1.8, 0, TAU); ctx.fill();
      });
      if (n < pts.length) { const p = pts[n]; const x = cx + p.x * R, y = cy + p.y * R; ctx.strokeStyle = C.ok; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 9, 0, TAU); ctx.stroke(); ctx.fillStyle = C.ok; ctx.fillText(p.v.toFixed(1) + " nm", x + 12, y - 8); }
      // colorbar
      const bx = cx + R + 40, by = cy - R, bh = R * 2;
      if (bx + 70 < W) {
        for (let i = 0; i < bh; i++) { const c = cmap(1 - i / bh); ctx.fillStyle = `rgb(${c[0] * 255 | 0},${c[1] * 255 | 0},${c[2] * 255 | 0})`; ctx.fillRect(bx, by + i, 14, 1); }
        ctx.strokeStyle = C.line2; ctx.strokeRect(bx, by, 14, bh);
        if (FILM.range) { ctx.fillStyle = C.muted; ctx.fillText(FILM.range[1].toFixed(0) + " nm", bx + 20, by + 8); ctx.fillText(FILM.range[0].toFixed(0) + " nm", bx + 20, by + bh); }
      }
      ctx.fillStyle = C.dim; ctx.fillText(`${pat}-POINT POLAR MAP · 100 mm WAFER`, 18, 22);
      // probe
      if (probe && n >= pts.length) {
        const v = idw(probe.x, probe.y), x = cx + probe.x * R, y = cy + probe.y * R;
        ctx.strokeStyle = "#fff"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - 12, y); ctx.lineTo(x + 12, y); ctx.moveTo(x, y - 12); ctx.lineTo(x, y + 12); ctx.stroke();
        $("#film-probe").textContent = `(${(probe.x * 50).toFixed(1)}, ${(-probe.y * 50).toFixed(1)}) mm → ${v.toFixed(1)} nm`;
      } else if (n >= pts.length) $("#film-probe").textContent = "hover the wafer";
    }
    Bench.register("film", FILM);
  })();

  /* ================= FAB SHOP: multi-material toolchange simulator ================= */
  const shop = (() => {
    const cv = $("#c-mm"); if (!cv) return { frame() {}, resize() {} };
    let ctx, W, H, printer = "h2d", running = false, visibleShop = false;
    const MATS = [["PLA", "#ffb627"], ["PETG", "#4de1ff"], ["TPU", "#b18cff"], ["SUP", "#e9eef3"]];
    const LAYERS = 36;
    // composition per layer: list of material ids in the layer
    const comp = l => l < 10 ? [0, 3] : l < 22 ? [0, 1, 3] : [0, 1, 2, 3];
    const colRange = { 0: [0.08, 0.42], 1: [0.42, 0.62], 2: [0.62, 0.8], 3: [0.8, 0.92] };
    let layer = 0, segI = 0, segT = 0, done = [], tc = 0, purge = 0, nozzles, activeTool = 0, headX = 0.1, tower = 0, plan = [];
    function reset() {
      layer = 0; segI = 0; segT = 0; done = []; tc = 0; purge = 0; tower = 0; headX = 0.1; running = false;
      nozzles = printer === "h2d" ? [{ mat: 0, last: 0 }, { mat: 3, last: 0 }] : [0, 1, 2, 3].map(m => ({ mat: m, last: 0 }));
      activeTool = 0; planLayer(); updRead();
      $("#mm-run").textContent = "▶ Print 4-material part";
    }
    function planLayer() {
      const mats = comp(layer).slice();
      const cur = nozzles[activeTool].mat; mats.sort((a, b) => (a === cur ? -1 : b === cur ? 1 : 0));
      plan = mats;
    }
    function switchTo(m, step) {
      let idx = nozzles.findIndex(n => n.mat === m);
      if (idx === activeTool) return;
      if (idx < 0) { // need filament swap in a nozzle (H2D only)
        idx = nozzles.reduce((best, n, i) => (n.last < nozzles[best].last ? i : best), 0);
        nozzles[idx].mat = m; purge++; tower += 1;
      }
      if (idx !== activeTool) tc++;
      activeTool = idx; nozzles[idx].last = step;
    }
    function updRead() { $("#mm-layer").textContent = `${Math.min(layer, LAYERS)} / ${LAYERS}`; $("#mm-tc").textContent = tc; $("#mm-purge").textContent = purge; }
    let stepCount = 0;
    function tick(d) {
      if (!running) return;
      if (layer >= LAYERS) { running = false; $("#mm-run").textContent = "▶ Print again"; UI.toast(printer === "h2d" ? `H2D: ${purge} filament swaps purged` : `U1: ${tc} head swaps, zero purge`); return; }
      const m = plan[segI];
      if (segT === 0) switchTo(m, ++stepCount);
      segT += d * 3.2;
      const [a, b] = colRange[m]; headX = lerp(a, b, Math.min(1, segT));
      if (segT >= 1) {
        done.push([layer, m]); segT = 0; segI++;
        if (segI >= plan.length) { segI = 0; layer++; if (layer < LAYERS) planLayer(); }
        updRead();
      }
    }
    function draw() {
      ({ ctx, W, H } = fit(cv));
      ctx.clearRect(0, 0, W, H);
      const px = 30, pw = W - 60, plateY = H - 36, lh = Math.min(5.2, (H - 150) / LAYERS);
      // plate
      ctx.fillStyle = C.line2; ctx.fillRect(px - 10, plateY, pw + 20, 6);
      ctx.fillStyle = C.dim; ctx.font = "10px JBM, monospace"; ctx.fillText("build plate", px - 10, plateY + 20);
      // printed layers
      done.forEach(([l, m]) => { const [a, b] = colRange[m]; ctx.fillStyle = MATS[m][1]; ctx.globalAlpha = m === 3 ? 0.5 : 0.95; ctx.fillRect(px + a * pw, plateY - (l + 1) * lh, (b - a) * pw, lh - 0.6); });
      ctx.globalAlpha = 1;
      // current partial segment
      if (running && plan[segI] !== undefined) { const m = plan[segI]; const [a] = colRange[m]; ctx.fillStyle = MATS[m][1]; ctx.fillRect(px + a * pw, plateY - (layer + 1) * lh, (headX - a) * pw, lh - 0.6); }
      // purge tower
      if (printer === "h2d") {
        const tx = px + 0.955 * pw, th = Math.min(tower * 2.4, plateY - 70);
        ctx.fillStyle = C.warn; ctx.globalAlpha = 0.75; ctx.fillRect(tx - 9, plateY - th, 18, th); ctx.globalAlpha = 1;
        ctx.fillStyle = C.warn; ctx.save(); ctx.translate(tx + 16, plateY - 4); ctx.rotate(-Math.PI / 2); ctx.fillText("purge waste", 0, 0); ctx.restore();
      }
      // gantry + heads
      const gy = Math.max(46, plateY - (layer + 1) * lh - 56);
      ctx.fillStyle = C.line2; ctx.fillRect(px - 10, gy, pw + 20, 4);
      const hx = px + headX * pw;
      if (printer === "h2d") {
        [0, 1].forEach(i => {
          const x = hx + (i === activeTool ? 0 : (i - activeTool) * 34), on = i === activeTool;
          ctx.fillStyle = on ? C.bg3 : C.bg2; ctx.strokeStyle = on ? MATS[nozzles[i].mat][1] : C.line2; ctx.lineWidth = 2;
          rr(ctx, x - 14, gy + 6, 28, 34, 5); ctx.fill(); ctx.stroke();
          ctx.fillStyle = MATS[nozzles[i].mat][1]; ctx.beginPath(); ctx.moveTo(x - 4, gy + 40 + (on ? 6 : 0)); ctx.lineTo(x + 4, gy + 40 + (on ? 6 : 0)); ctx.lineTo(x, gy + 48 + (on ? 6 : 0)); ctx.fill();
          ctx.fillStyle = C.text; ctx.font = "9px JBM, monospace"; ctx.textAlign = "center"; ctx.fillText(MATS[nozzles[i].mat][0], x, gy + 27); ctx.textAlign = "left";
        });
      } else {
        // dock
        ctx.fillStyle = C.dim; ctx.fillText("tool dock", px, 18);
        nozzles.forEach((n, i) => {
          const parked = i !== activeTool, x = parked ? px + 40 + i * 50 : hx, y = parked ? 26 : gy + 6;
          ctx.fillStyle = C.bg3; ctx.strokeStyle = MATS[n.mat][1]; ctx.lineWidth = parked ? 1 : 2.5; ctx.globalAlpha = parked ? 0.6 : 1;
          rr(ctx, x - 14, y, 28, 30, 5); ctx.fill(); ctx.stroke();
          ctx.fillStyle = C.text; ctx.font = "9px JBM, monospace"; ctx.textAlign = "center"; ctx.fillText(MATS[n.mat][0], x, y + 19); ctx.textAlign = "left"; ctx.globalAlpha = 1;
        });
      }
      // legend
      MATS.forEach(([n, c], i) => { ctx.fillStyle = c; ctx.fillRect(W - 210 + i * 50, 12, 10, 10); ctx.fillStyle = C.muted; ctx.font = "10px JBM, monospace"; ctx.fillText(n, W - 196 + i * 50, 21); });
    }
    new IntersectionObserver(([e]) => { visibleShop = e.isIntersecting; }).observe(cv);
    const segEl = document.getElementById("mm-printer");
    segEl.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; $$("button", segEl).forEach(x => x.classList.toggle("on", x === b)); printer = b.dataset.v; reset(); });
    $("#mm-run").onclick = () => { if (layer >= LAYERS) reset(); running = !running; $("#mm-run").textContent = running ? "❚❚ Pause" : "▶ Resume"; };
    $("#mm-reset").onclick = reset;
    reset();
    return {
      frame(d) { if (!visibleShop) return; for (let i = 0; i < 2; i++) tick(d / 2); draw(); },
      resize() {}
    };
  })();

  // initialize the first tab label
  requestAnimationFrame(() => select("balance"));
})();
