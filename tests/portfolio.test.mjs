import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const read = file => readFileSync(join(root, file), 'utf8');
const html = read('index.html');
const css = read('style.css');
const app = read('app.js');
const enginePath = join(root, 'lab-engine.js');
const require = createRequire(import.meta.url);
const engine = existsSync(enginePath) ? require(enginePath) : {};

function matches(pattern, source = html) {
  return [...source.matchAll(pattern)];
}

test('ships the semantic Kinetic Laboratory experience', () => {
  assert.match(html, /<canvas[^>]+id="lab-canvas"[^>]+aria-hidden="true"/);
  assert.match(html, /class="[^"]*lab-stage[^"]*"/);
  assert.match(html, /I build at the edge of/);
  assert.match(html, /href="#work"[^>]*>[^<]*(Explore|View) (the )?(work|systems)/i);
  assert.match(html, /href="mailto:owenchen0408@gmail\.com"/);
  assert.doesNotMatch(html, /Signal Lab/i);
});

test('provides four accessible engineering-domain controls', () => {
  const controls = matches(/<button[^>]+data-domain="(sensing|intelligence|control|fabrication)"[^>]*>/g);
  assert.equal(controls.length, 4);
  for (const [, domain] of controls) {
    assert.match(html, new RegExp(`data-domain="${domain}"[^>]+aria-pressed="(?:true|false)"`));
  }
  for (const label of ['Sensing', 'Intelligence', 'Control', 'Fabrication']) {
    assert.match(html, new RegExp(`>${label}<`));
  }
});

test('preserves the factual portfolio evidence and supplied assets', () => {
  for (const phrase of [
    '30 ESP32',
    'five suppliers',
    'nine-channel',
    '25% reduction',
    'MoTeC M150',
    'Team 16021',
    'Expected May 2028',
  ]) assert.match(html, new RegExp(phrase, 'i'));

  for (const asset of [
    'assets/photos/robot-city.jpg',
    'assets/photos/robot-prototype.jpg',
    'assets/photos/cleanroom.jpg',
    'assets/photos/ftc-team.jpg',
    'assets/logos/purdue-official.png',
    'assets/logos/serelix-official.png',
    'assets/logos/city-science-official.png',
  ]) assert.match(html, new RegExp(asset.replaceAll('.', '\\.')));
});

test('keeps core navigation and dialogs accessible without canvas interaction', () => {
  assert.match(html, /<a[^>]+class="skip-link"[^>]+href="#main"/);
  assert.match(html, /<main[^>]+id="main"/);
  assert.match(html, /id="motion-toggle"[^>]+aria-pressed="(?:true|false)"/);
  assert.match(html, /id="command-dialog"[^>]+aria-labelledby="command-title"/);
  assert.match(html, /id="project-dialog"[^>]+aria-labelledby=/);
  assert.match(html, /id="photo-dialog"[^>]+aria-labelledby=/);
  assert.match(html, /rel="icon"[^>]+image\/svg\+xml/);
  assert.match(html, /href="assets\/documents\/Owen-Chen-Resume\.pdf"[^>]*>[^<]*(View )?Résumé/i);
});

test('uses the approved visual tokens and explicit motion fallbacks', () => {
  for (const token of ['--obsidian', '--laboratory-white', '--tungsten', '--cobalt']) {
    assert.match(css, new RegExp(`${token}:`));
  }
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(css, /\.motion-paused/);
  assert.match(css, /\.lab-stage/);
  assert.match(app, /visibilitychange/);
  assert.match(app, /ResizeObserver/);
  assert.match(app, /cancelAnimationFrame/);
  assert.match(app, /document\.hidden/);
  assert.match(app, /devicePixelRatio[\s\S]{0,80}1\.5|1\.5[\s\S]{0,80}devicePixelRatio/);
  assert.match(app, /classList\.add\(['"]js-reveals['"]\)/);
});

test('lab engine clamps values and normalizes pointer coordinates', () => {
  assert.equal(typeof engine.clamp, 'function');
  assert.equal(typeof engine.normalizePointer, 'function');
  assert.equal(engine.clamp(-2, 0, 1), 0);
  assert.equal(engine.clamp(3, 0, 1), 1);
  assert.deepEqual(engine.normalizePointer(50, 25, 100, 50), { x: 0.5, y: 0.5 });
  assert.deepEqual(engine.normalizePointer(-20, 80, 100, 50), { x: 0, y: 1 });
});

test('lab engine generates deterministic normalized nodes', () => {
  assert.equal(typeof engine.seededNodes, 'function');
  const first = engine.seededNodes(7, 42);
  const second = engine.seededNodes(7, 42);
  assert.deepEqual(first, second);
  assert.equal(first.length, 7);
  for (const node of first) {
    assert.ok(node.x >= 0 && node.x <= 1);
    assert.ok(node.y >= 0 && node.y <= 1);
    assert.ok(node.depth >= 0 && node.depth <= 1);
  }
});

test('lab engine resolves domains with a sensing fallback', () => {
  assert.equal(typeof engine.resolveDomain, 'function');
  assert.equal(engine.resolveDomain('control').id, 'control');
  assert.equal(engine.resolveDomain('unknown').id, 'sensing');
  assert.match(engine.resolveDomain('fabrication').status, /prototype|physical|build/i);
});

test('lab domains point to real portfolio evidence with image metadata', () => {
  const expected = {
    sensing: ['#project-semiconductor-story', 'assets/photos/cleanroom.jpg'],
    intelligence: ['#project-bipedal-story', 'assets/photos/robot-city.jpg'],
    control: ['#project-bipedal-story', 'assets/photos/robot-city.jpg'],
    fabrication: ['#project-prototype-story', 'assets/photos/robot-prototype.jpg'],
  };
  for (const [id, [link, image]] of Object.entries(expected)) {
    const domain = engine.resolveDomain(id);
    assert.equal(domain.projectLink, link);
    assert.equal(domain.image, image);
    assert.ok(domain.alt.length > 20);
    assert.ok(domain.caption.length > 4);
    assert.ok(domain.medium.length > 4);
  }
});

test('all local HTML asset references resolve', () => {
  const refs = matches(/(?:src|href)="((?:assets\/|style\.css|app\.js|lab-engine\.js)[^"]*)"/g)
    .map(([, ref]) => ref.split(/[?#]/)[0]);
  assert.ok(refs.length >= 30);
  for (const ref of refs) assert.ok(existsSync(join(root, ref)), `Missing local asset: ${ref}`);
});

test('document IDs are unique and every aria-controls target exists', () => {
  const ids = matches(/\sid="([^"]+)"/g).map(([, id]) => id);
  assert.equal(new Set(ids).size, ids.length, 'Duplicate document ID');
  const controls = matches(/\saria-controls="([^"]+)"/g).map(([, id]) => id);
  for (const id of controls) assert.ok(ids.includes(id), `Missing aria-controls target: ${id}`);
});
