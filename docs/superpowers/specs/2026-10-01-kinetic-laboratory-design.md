# Kinetic Laboratory Portfolio Design

## Objective

Remake `owenc.me` as an experimental, spectacle-first engineering portfolio that feels like entering an intelligent machine. The experience must demonstrate Owen Chen's interest in semiconductor research, robotics, embedded control, and measurement systems without hiding the evidence recruiters and collaborators need.

## Audience and primary journey

The primary audience is technical recruiters, engineering managers, research collaborators, and peers. A visitor should be able to identify Owen, understand his focus, enter a memorable interactive system, inspect four substantial projects, review experience and tools, and reach contact or GitHub without navigating an opaque interface.

## Visual thesis

The site is a **Kinetic Laboratory**: an obsidian environment with warm laboratory white typography, tungsten-gold highlights, and electric-cobalt signal paths. Cleanroom and robotics photography appears as illuminated physical evidence rather than conventional card thumbnails. The visual language combines editorial-scale typography with precise instrument-like metadata, controlled bloom, glass, grain, and technical geometry.

The site must not use fake telemetry, decorative numbering, forced loading, autoplay audio, or fabricated scientific claims. Motion should create spatial continuity and explain relationships rather than simply decorate every surface.

## Opening experience

The first viewport is a full-height laboratory stage with:

- Owen's name, role, and concise engineering value proposition immediately readable.
- A decorative canvas signal lattice that responds to pointer position and scroll progress.
- Four real DOM controls: Sensing, Intelligence, Control, and Fabrication.
- A photographic specimen panel and concise status copy that update with the selected domain.
- Direct links to selected work, email, GitHub, and the rest of the page.
- A motion control that pauses canvas and CSS motion and persists locally.

The hero becomes sticky briefly while normal page scrolling changes its composition. It must never hijack scroll, require a pointer, or gate the rest of the site.

## Information architecture

1. **Kinetic Laboratory hero** — identity, domains, specimen imagery, work/contact actions.
2. **Proof strip** — four meaningful, sourced metrics.
3. **Selected systems** — four cinematic project chapters with visible problem, contribution, techniques, and outcome evidence; filters and accessible detail dialogs remain available.
4. **Experience** — four roles with official organization marks and expandable evidence.
5. **Toolchain** — searchable/filterable tool constellation using supplied logos and honest text monograms when no logo exists.
6. **Education and contact** — Purdue credentials, GitHub, LinkedIn, archive, email copy action.

The phrase “Signal Lab” must not appear. The older theme picker, redundant marquees, decorative chips, comparison tray, and excessive ambient scans are removed. Useful keyboard navigation, dialogs, project filters, tool search, copy-email action, and reduced-motion behavior are preserved or rebuilt.

## Project storytelling

Each project chapter contains:

- A readable title and discipline.
- A concise context/problem statement.
- Owen's contribution and named engineering methods.
- At least one defensible result, constraint, or artifact.
- A local image with meaningful alternative text.
- A deeper native dialog for field notes.

The four projects are the bipedal city transport robot, compact bipedal prototype, semiconductor reliability work, and FTC Team 16021 Techno Maniacs.

## Interaction system

- **Signal lattice:** deterministic canvas nodes and links, capped device-pixel ratio, pointer/touch influence, and a still frame when paused or offscreen.
- **Domain selector:** native buttons with `aria-pressed`; changes hero copy, specimen image, accent, and related project link.
- **Scroll choreography:** CSS variables driven by bounded hero progress; no smooth-scroll dependency or forced snapping.
- **Project chapters:** reveal, parallax, spotlight, filter, photo expansion, and native detail dialogs.
- **Experience evidence:** native buttons controlling expandable details.
- **Tool constellation:** text search, category filtering, keyboard-selectable tools, and an explanatory detail panel.
- **Quick navigation:** accessible command dialog opened by a visible control or Cmd/Ctrl+K.

## Responsive and fallback behavior

- Desktop fine-pointer devices receive the full interactive canvas and subtle depth/parallax.
- Coarse-pointer and smaller devices render a lighter, touch-reactive 2D field with reduced particle density and no hover-only content.
- `prefers-reduced-motion` and the site's motion toggle stop animation loops, reveal content immediately, and keep all controls functional.
- Core content remains semantic and readable if JavaScript fails; canvas is always `aria-hidden`.
- Main body copy is at least 16px, recurring controls at least 14px, and focus indicators remain visible.

## Technical architecture

Keep the existing buildless GitHub Pages architecture:

- `index.html` contains complete semantic content and native dialogs/templates.
- `style.css` owns the complete responsive visual system.
- `lab-engine.js` contains deterministic, testable canvas math and domain data helpers, exposed to both Node tests and the browser.
- `app.js` owns DOM state, canvas rendering, motion preferences, dialogs, filtering, search, and scroll behavior.
- `tests/portfolio.test.mjs` uses Node's built-in test runner for source contracts and pure engine behavior.

No framework or heavy runtime dependency is introduced. Existing local photos and official logos remain the primary imagery.

## Verification and release

Before pushing:

- Watch the new contract tests fail against the old experience, then pass after implementation.
- Run the full Node test suite and JavaScript syntax checks.
- Validate local asset paths, unique IDs, ARIA control targets, HTML semantics, CSS balance, and Git whitespace.
- Serve locally and inspect desktop and mobile layouts plus interactive/reduced-motion paths.
- Obtain a fresh whole-change review and resolve critical/important findings.
- Push `main`, confirm the GitHub Pages workflow succeeds, and verify the live HTML/CSS/JS from `https://owenc.me/`.
