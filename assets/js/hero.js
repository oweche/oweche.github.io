/* Hero: an interactive silicon wafer. Dies lift toward the cursor, a laser
   line sweeps the surface, thin-film interference colors shift with the view. */
import * as THREE from "three";

const canvas = document.getElementById("hero-canvas");
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

function ok() {
  try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch { return false; }
}

if (canvas && ok()) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  const key = new THREE.PointLight(0xffb627, 60, 30); key.position.set(-4, 6, 4); scene.add(key);
  const rim = new THREE.PointLight(0x4de1ff, 50, 30); rim.position.set(5, 3, -3); scene.add(rim);
  const top = new THREE.DirectionalLight(0xffffff, 0.9); top.position.set(0, 10, 2); scene.add(top);

  const wafer = new THREE.Group(); scene.add(wafer);
  const R = 3.0;

  // base disk with flat
  const shape = new THREE.Shape();
  const flatA = 0.35;
  shape.absarc(0, 0, R + 0.12, -Math.PI / 2 + flatA, Math.PI * 1.5 - flatA, false);
  shape.closePath();
  const baseGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.08, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2, curveSegments: 96 });
  baseGeo.rotateX(-Math.PI / 2); baseGeo.translate(0, -0.1, 0);
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x1a2129, metalness: 0.9, roughness: 0.25 });
  wafer.add(new THREE.Mesh(baseGeo, baseMat));

  // dies
  const pitch = 0.3, size = 0.26;
  const positions = [];
  for (let x = -R; x <= R; x += pitch) for (let z = -R; z <= R; z += pitch) {
    const cx = x + pitch / 2, cz = z + pitch / 2;
    const corner = Math.max(Math.hypot(cx - size / 2, cz - size / 2), Math.hypot(cx + size / 2, cz + size / 2), Math.hypot(cx - size / 2, cz + size / 2), Math.hypot(cx + size / 2, cz - size / 2));
    if (corner < R - 0.05 && cz < R * Math.cos(flatA) - 0.1) positions.push([cx, cz]);
  }
  const dieGeo = new THREE.BoxGeometry(size, 0.04, size);
  const dieMat = new THREE.MeshStandardMaterial({ metalness: 0.75, roughness: 0.22, vertexColors: false });
  const dies = new THREE.InstancedMesh(dieGeo, dieMat, positions.length);
  dies.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  wafer.add(dies);
  const lift = new Float32Array(positions.length), glow = new Float32Array(positions.length);
  const m4 = new THREE.Matrix4(), col = new THREE.Color(), tmp = new THREE.Color(), sv = new THREE.Vector3();
  // thin-film color per die (radial interference)
  const baseCols = positions.map(([x, z]) => {
    const r = Math.hypot(x, z) / R;
    return new THREE.Color().setHSL((0.62 + r * 0.55 + Math.sin(x * 1.3) * 0.04) % 1, 0.55, 0.42);
  });

  // laser sweep line
  const laserGeo = new THREE.PlaneGeometry(0.03, R * 2.4);
  const laserMat = new THREE.MeshBasicMaterial({ color: 0x3ff2a0, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
  const laser = new THREE.Mesh(laserGeo, laserMat); laser.rotation.x = -Math.PI / 2; laser.position.y = 0.08; wafer.add(laser);
  const haloMat = new THREE.MeshBasicMaterial({ color: 0x3ff2a0, transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending, depthWrite: false });
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(0.5, R * 2.4), haloMat); halo.rotation.x = -Math.PI / 2; halo.position.y = 0.075; wafer.add(halo);

  // floating particles (cleanroom air)
  const pc = 260, pgeo = new THREE.BufferGeometry(), parr = new Float32Array(pc * 3);
  for (let i = 0; i < pc; i++) { parr[i * 3] = (Math.random() - 0.5) * 14; parr[i * 3 + 1] = Math.random() * 6 - 1; parr[i * 3 + 2] = (Math.random() - 0.5) * 10; }
  pgeo.setAttribute("position", new THREE.BufferAttribute(parr, 3));
  const pmat = new THREE.PointsMaterial({ color: 0xffd27a, size: 0.025, transparent: true, opacity: 0.7, depthWrite: false });
  const particles = new THREE.Points(pgeo, pmat); scene.add(particles);

  // interaction
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(9, 9), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hit = new THREE.Vector3(), local = new THREE.Vector3();
  let mx = 0, my = 0, tmx = 0, tmy = 0, over = false, clickWave = -1, clickPos = new THREE.Vector2();
  const hero = document.getElementById("home");
  hero.addEventListener("pointermove", e => {
    const r = canvas.getBoundingClientRect();
    ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1; ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    tmx = ndc.x; tmy = ndc.y; over = true;
  });
  hero.addEventListener("pointerleave", () => { over = false; ndc.set(9, 9); });
  hero.addEventListener("pointerdown", e => {
    if (e.target.closest("a,button")) return;
    if (local.lengthSq() < R * R) { clickWave = 0; clickPos.set(local.x, local.z); }
  });

  const sx = document.getElementById("stage-x"), sy = document.getElementById("stage-y"), sz = document.getElementById("stage-z");
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    const narrow = w < 800;
    camera.position.set(narrow ? 0 : 1.2, narrow ? 7.6 : 6.2, narrow ? 9 : 7.4);
    wafer.position.set(narrow ? 0 : 2.1, 0, narrow ? -1.2 : 0);
    camera.lookAt(narrow ? 0 : 1.6, 0, 0);
    camera.updateProjectionMatrix();
  }
  addEventListener("resize", resize); resize();

  let running = true, t = 0, last = performance.now(), started = false;
  new IntersectionObserver(([e]) => { running = e.isIntersecting; if (running) { last = performance.now(); loop(); } }).observe(hero);
  addEventListener("hero:start", () => { started = true; });
  setTimeout(() => started = true, 3500);
  let intro = 0;

  addEventListener("theme", e => {
    const litho = e.detail === "litho";
    key.color.set(litho ? 0xffc23d : 0xffb627); rim.color.set(litho ? 0xff9f3d : 0x4de1ff);
    laserMat.color.set(litho ? 0xffe066 : 0x3ff2a0); haloMat.color.set(laserMat.color);
    pmat.color.set(litho ? 0xffc23d : 0xffd27a);
    baseCols.forEach((c, i) => { if (litho) c.setHSL(0.1 + (i % 7) * 0.006, 0.8, 0.35); else { const [x, z] = positions[i]; const r = Math.hypot(x, z) / R; c.setHSL((0.62 + r * 0.55 + Math.sin(x * 1.3) * 0.04) % 1, 0.55, 0.42); } });
  });

  function loop() {
    if (!running) return;
    requestAnimationFrame(loop);
    const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now;
    t += reduce ? dt * 0.2 : dt;
    if (started) intro = Math.min(1, intro + dt * 0.6);
    const ei = 1 - Math.pow(1 - intro, 3);
    mx += (tmx - mx) * 0.06; my += (tmy - my) * 0.06;
    wafer.rotation.y = t * 0.06 + mx * 0.25;
    wafer.rotation.x = -0.1 + my * 0.08 + (1 - ei) * 0.9;
    wafer.position.y = (1 - ei) * -2.5;
    wafer.scale.setScalar(0.6 + ei * 0.4);

    // pointer in wafer local space
    ray.setFromCamera(ndc, camera);
    let has = false;
    if (over && ray.ray.intersectPlane(plane, hit)) { local.copy(hit); wafer.worldToLocal(local); has = local.lengthSq() < (R + 1) ** 2; }
    else local.set(99, 0, 99);

    const sweep = ((t * 0.35) % 1.4) * (2 * R + 1.5) - R - 0.75;
    laser.position.x = halo.position.x = sweep;
    if (clickWave >= 0) clickWave += dt * 4; if (clickWave > 8) clickWave = -1;

    for (let i = 0; i < positions.length; i++) {
      const [x, z] = positions[i];
      const d = has ? Math.hypot(x - local.x, z - local.z) : 99;
      let target = Math.max(0, 1 - d / 1.1); target = target * target * 0.55;
      if (clickWave >= 0) { const wd = Math.abs(Math.hypot(x - clickPos.x, z - clickPos.y) - clickWave); target += Math.max(0, 1 - wd / 0.35) * 0.35 * Math.max(0, 1 - clickWave / 8); }
      lift[i] += (target - lift[i]) * 0.12;
      const sw = Math.max(0, 1 - Math.abs(x - sweep) / 0.25);
      glow[i] = Math.max(glow[i] * 0.96, sw);
      const appear = Math.min(1, Math.max(0, ei * 1.6 - Math.hypot(x, z) / R * 0.6));
      m4.makeTranslation(x, lift[i] + 0.02, z);
      m4.scale(sv.set(Math.max(0.001, appear), 1 + lift[i] * 6, Math.max(0.001, appear)));
      dies.setMatrixAt(i, m4);
      col.copy(baseCols[i]).lerp(tmp.setRGB(1, 0.75, 0.25), Math.min(1, lift[i] * 2.2)).lerp(tmp.setRGB(0.3, 1, 0.7), glow[i] * 0.55);
      dies.setColorAt(i, col);
    }
    dies.instanceMatrix.needsUpdate = true; if (dies.instanceColor) dies.instanceColor.needsUpdate = true;

    const pa = pgeo.attributes.position.array;
    for (let i = 0; i < pc; i++) { pa[i * 3 + 1] += dt * 0.08 * (1 + (i % 5) * 0.3); if (pa[i * 3 + 1] > 5) pa[i * 3 + 1] = -1; }
    pgeo.attributes.position.needsUpdate = true;

    if (has && local.lengthSq() < R * R) {
      sx.textContent = (local.x * 16.7 >= 0 ? "+" : "") + (local.x * 16.7).toFixed(3);
      sy.textContent = (-local.z * 16.7 >= 0 ? "+" : "") + (-local.z * 16.7).toFixed(3);
      const idx = positions.findIndex(([x, z]) => Math.abs(x - local.x) < pitch / 2 && Math.abs(z - local.z) < pitch / 2);
      sz.textContent = idx >= 0 ? (lift[idx] * 100).toFixed(2) : "0.00";
    }
    renderer.render(scene, camera);
  }
  loop();
} else if (canvas) {
  canvas.style.background = "radial-gradient(circle at 70% 50%, rgba(255,182,39,.18), transparent 50%)";
}
