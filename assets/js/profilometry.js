/* Instrument 08 — 3D confocal surface scan (synthetic), with a moving laser
   line and a live line profile. */
import * as THREE from "three";
import { OrbitControls } from "three/addons/OrbitControls.js";

const U = window.BenchUtil;
const host = document.getElementById("profilo-3d");
const prof = document.getElementById("c-profile");

// 5x7 bitmap font for the laser-engraved site
const FONT = {
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"]
};
function textMask(str, u, v, x0, y0, cell) {
  // returns 0..1 coverage of glyph pixel at (u,v)
  const cx = Math.floor((u - x0) / cell), cy = Math.floor((v - y0) / cell);
  if (cy < 0 || cy >= 7 || cx < 0) return 0;
  const ci = Math.floor(cx / 6), px = cx % 6;
  if (ci >= str.length || px >= 5) return 0;
  const g = FONT[str[ci]]; return g && g[cy][px] === "1" ? 1 : 0;
}
const SITES = {
  laser: (u, v) => { // EMC background + engraved "ESP32" with raster ripple
    let z = (U.fbm(u * 18, v * 18, 4) - 0.5) * 1.6;
    const m = textMask("ESP32", u, v, 0.1, 0.3, 0.027);
    if (m) z -= 6 + Math.sin(v * 900) * 0.6 + (U.vnoise(u * 80, v * 80) - 0.5) * 1.2;
    return z;
  },
  shield: (u, v) => { // brushed stamped metal + embossed ring
    let z = Math.sin(u * 420 + U.vnoise(v * 30, 1) * 6) * 0.25 + (U.fbm(u * 6, v * 60, 3) - 0.5) * 0.6;
    const r = Math.hypot(u - 0.5, v - 0.5); z += 5 * Math.exp(-((r - 0.28) ** 2) / 0.0012) + 2.4 * (1 - U.clamp((r - 0.08) / 0.02, 0, 1));
    return z;
  },
  silk: (u, v) => { // flat solder mask + raised ink "U1" and a dot
    let z = (U.fbm(u * 10, v * 10, 3) - 0.5) * 0.4;
    const m = textMask("U1", u, v, 0.22, 0.25, 0.045);
    if (m) z += 9 + (U.vnoise(u * 60, v * 60) - 0.5) * 2;
    const d = Math.hypot(u - 0.78, v - 0.75); if (d < 0.06) z += 9 * Math.sqrt(1 - (d / 0.06) ** 2);
    return z;
  },
  emc: (u, v) => { // rough mold compound with filler pits + laser dot
    let z = (U.fbm(u * 26, v * 26, 5) - 0.5) * 5;
    for (let i = 0; i < 14; i++) { const px = U.vnoise(i * 3.1, 7.7), py = U.vnoise(i * 5.3, 1.9), rr = 0.02 + U.vnoise(i, i) * 0.025; const d = Math.hypot(u - px, v - py); if (d < rr) z -= 4 * (1 - (d / rr) ** 2); }
    const d = Math.hypot(u - 0.3, v - 0.7); if (d < 0.12) z -= 3.5 * (1 - (d / 0.12) ** 4);
    return z;
  }
};

let ready = false, renderer, scene, camera, controls, mesh, geo, scanLine, heights, N = 150, zmag = 40, site = "laser", scanT = 0, mn = 0, mx = 1;

function initGL() {
  if (ready) return; ready = true;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch { host.innerHTML = '<p style="padding:20px;color:var(--muted)">WebGL unavailable.</p>'; return; }
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  host.appendChild(renderer.domElement);
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(38, 1, 0.01, 50);
  camera.position.set(0.0, 1.05, 1.15);
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.autoRotate = true; controls.autoRotateSpeed = 0.6; controls.enablePan = false;
  controls.minDistance = 0.6; controls.maxDistance = 3; controls.target.set(0, 0, 0);
  renderer.domElement.addEventListener("pointerdown", () => controls.autoRotate = false);
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const d = new THREE.DirectionalLight(0xffffff, 1.4); d.position.set(1, 2, 1); scene.add(d);
  geo = new THREE.PlaneGeometry(1, 1, N - 1, N - 1); geo.rotateX(-Math.PI / 2);
  geo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(N * N * 3), 3));
  mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.1, side: THREE.DoubleSide }));
  scene.add(mesh);
  // frame
  const box = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 0.001, 1)), new THREE.LineBasicMaterial({ color: 0x56616d }));
  box.position.y = -0.12; scene.add(box);
  scanLine = new THREE.Mesh(new THREE.PlaneGeometry(0.006, 1.02), new THREE.MeshBasicMaterial({ color: 0x3ff2a0, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthTest: false }));
  scanLine.rotation.x = -Math.PI / 2; scanLine.rotation.z = Math.PI / 2; scene.add(scanLine);
  build();
  resize();
}

function build() {
  heights = new Float32Array(N * N);
  const f = SITES[site];
  mn = Infinity; mx = -Infinity; let sum = 0;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const h = f(i / (N - 1), j / (N - 1)); heights[j * N + i] = h; mn = Math.min(mn, h); mx = Math.max(mx, h); sum += h; }
  const mean = sum / heights.length; let sa = 0, sq = 0;
  for (const h of heights) { sa += Math.abs(h - mean); sq += (h - mean) ** 2; }
  document.getElementById("pro-sa").textContent = (sa / heights.length).toFixed(2) + " µm";
  document.getElementById("pro-sq").textContent = Math.sqrt(sq / heights.length).toFixed(2) + " µm";
  document.getElementById("pro-sz").textContent = (mx - mn).toFixed(1) + " µm";
  apply();
}
function apply() {
  if (!geo) return;
  const pos = geo.attributes.position.array, colA = geo.attributes.color.array;
  const s = zmag / 4000; // µm -> scene units with magnification
  for (let k = 0; k < N * N; k++) {
    const h = heights[k]; pos[k * 3 + 1] = h * s;
    const c = U.cmap((h - mn) / (mx - mn || 1)); colA[k * 3] = c[0]; colA[k * 3 + 1] = c[1]; colA[k * 3 + 2] = c[2];
  }
  geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true; geo.computeVertexNormals();
}
function resize() {
  if (!renderer) return;
  const w = host.clientWidth, h = host.clientHeight;
  renderer.setSize(w, h, false); renderer.domElement.style.width = "100%"; renderer.domElement.style.height = "100%";
  camera.aspect = w / Math.max(1, h); camera.updateProjectionMatrix();
}
function drawProfile(row) {
  const dpr = Math.min(2, devicePixelRatio || 1), W = prof.clientWidth, H = prof.clientHeight;
  if (prof.width !== Math.round(W * dpr)) { prof.width = Math.round(W * dpr); prof.height = Math.round(H * dpr); }
  const ctx = prof.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
  const cs = getComputedStyle(document.documentElement);
  ctx.strokeStyle = cs.getPropertyValue("--ok").trim(); ctx.lineWidth = 1.5; ctx.beginPath();
  for (let i = 0; i < N; i++) { const x = 12 + (W - 24) * i / (N - 1), y = H - 14 - (heights[row * N + i] - mn) / (mx - mn || 1) * (H - 30); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
  ctx.stroke();
  ctx.fillStyle = cs.getPropertyValue("--dim").trim(); ctx.font = "10px JBM, monospace";
  ctx.fillText(`LINE PROFILE · row ${row} · ${(mx - mn).toFixed(1)} µm span`, 12, 12);
}

const inst = {
  init() {
    initGL();
    document.getElementById("pro-site").addEventListener("change", e => { site = e.target.value; build(); });
    document.getElementById("pro-z").addEventListener("input", e => { zmag = +e.target.value; document.getElementById("pro-z-o").textContent = "×" + zmag; apply(); });
  },
  resize,
  frame(dt) {
    if (!renderer) return;
    scanT = (scanT + dt * 0.12) % 1;
    const row = Math.floor(scanT * (N - 1));
    scanLine.position.set(0, (mx * zmag / 4000) + 0.01, scanT - 0.5);
    controls.update();
    renderer.render(scene, camera);
    drawProfile(row);
  }
};
(function reg() { if (window.Bench) window.Bench.register("profilo", inst); else setTimeout(reg, 50); })();
