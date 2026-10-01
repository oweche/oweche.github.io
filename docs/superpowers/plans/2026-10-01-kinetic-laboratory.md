# Kinetic Laboratory Portfolio Implementation Plan

> **Spec:** `docs/superpowers/specs/2026-10-01-kinetic-laboratory-design.md`

## Context

Rebuild the existing static GitHub Pages portfolio in place. Preserve the approved factual content and supplied assets while replacing the page silhouette and motion system. Work directly on `main` because the user explicitly requested that the finished redesign be pushed to the existing repository.

## Global constraints

- Keep the buildless `index.html` / `style.css` / JavaScript architecture.
- Use only supplied local photography and logos; do not fabricate factual imagery or claims.
- Do not use the phrase “Signal Lab,” decorative section numbering, fake telemetry, forced loading, autoplay audio, or scroll hijacking.
- Core content must work without JavaScript. Canvas must be decorative and accessible controls must remain DOM elements.
- Preserve meaningful metrics, official organization marks, project evidence, contact links, keyboard navigation, and reduced-motion behavior.
- Apply test-first development for each new behavior and read every verification result.

## Task 1: Establish source-contract and engine tests

**Files:** `tests/portfolio.test.mjs`

- [ ] Add a Node built-in test suite asserting the approved document structure, content, asset references, accessibility controls, motion fallbacks, and absence of disallowed legacy labels.
- [ ] Add tests for deterministic lab-engine helpers: seeded node generation, clamping, normalized pointer influence, and domain lookup fallback.
- [ ] Run `node --test tests/portfolio.test.mjs` and confirm it fails because the new Kinetic Laboratory structure and engine do not exist.

**Completion command:** `node --test tests/portfolio.test.mjs`

## Task 2: Build semantic Kinetic Laboratory markup

**Files:** `index.html`, `lab-engine.js`

- [ ] Rebuild the HTML around the full-height laboratory stage, four domain controls, specimen panel, proof strip, project chapters, experience evidence, tool constellation, education, contact, and accessible dialogs.
- [ ] Preserve all approved factual content, official logos, photos, external links, titles, and metadata.
- [ ] Add pure deterministic engine helpers required by the tests, exposing them through CommonJS in Node and `window.KineticLab` in browsers.
- [ ] Run the test suite and JavaScript syntax checks; source-contract and engine tests must pass before styling behavior is added.

**Completion command:** `node --test tests/portfolio.test.mjs && node --check lab-engine.js`

## Task 3: Implement the cinematic visual system

**Files:** `style.css`

- [ ] Replace the existing stylesheet with the obsidian, warm-white, tungsten, and cobalt token system.
- [ ] Implement the sticky hero stage, editorial type, layered specimen treatment, project chapters, experience surfaces, tool constellation, dialogs, mobile layout, and graceful no-JS state.
- [ ] Implement motion-paused and `prefers-reduced-motion` rules that remove continuous movement and reveal content immediately.
- [ ] Run the source-contract suite and CSS structural validation.

**Completion command:** `node --test tests/portfolio.test.mjs`

## Task 4: Implement interaction and motion behavior

**Files:** `app.js`

- [ ] Implement persisted motion state and canvas lifecycle with visibility/offscreen pausing.
- [ ] Render the deterministic signal lattice with capped DPR and responsive particle density.
- [ ] Implement domain switching, hero scroll choreography, active navigation, reveal/parallax effects, project filtering/dialogs, experience expansions, photo viewer, quick navigation, tool filtering/detail, and email copy fallback.
- [ ] Ensure pointer, touch, keyboard, JavaScript-off, and motion-off paths remain usable.
- [ ] Run all tests and syntax checks.

**Completion command:** `node --test tests/portfolio.test.mjs && node --check lab-engine.js && node --check app.js`

## Task 5: Perform local browser and accessibility verification

**Files:** implementation files and test fixtures only if a reproducible defect is found

- [ ] Start a local HTTP server and inspect the site at representative desktop and mobile viewport sizes.
- [ ] Exercise domain controls, motion toggle, project filters/dialogs, experience details, tool search/filter, quick navigation, photo dialog, and email copy/fallback.
- [ ] Verify no horizontal overflow, hidden essential content, canvas runtime errors, broken image paths, or keyboard traps.
- [ ] If a defect is found, write a failing regression test where feasible, then fix and rerun the full suite.

**Completion command:** `node --test tests/portfolio.test.mjs && node --check lab-engine.js && node --check app.js`

## Task 6: Validate, review, commit, and publish

- [ ] Validate all local asset references, unique IDs, ARIA control targets, CSS brace balance, and `git diff --check`.
- [ ] Dispatch a fresh whole-change reviewer and resolve critical/important findings with test-first fixes.
- [ ] Run the complete verification set again and commit the finished redesign.
- [ ] Push `main` to `origin`, monitor the GitHub Pages workflow, and verify live HTML/CSS/JS at `https://owenc.me/`.

**Completion command:** `node --test tests/portfolio.test.mjs && node --check lab-engine.js && node --check app.js && git diff --check`

## Review focus

- Whether the site remains immediately understandable despite the spectacle-first direction.
- Whether canvas and scroll work is bounded, paused correctly, and nonessential.
- Whether mobile, keyboard, reduced-motion, and JavaScript-off paths preserve all core content.
- Whether project claims and organization branding stayed accurate.
- Whether any legacy interaction was retained without serving the new experience.
