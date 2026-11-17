# owenc.me

Personal portfolio of **Owen Chen** — Purdue computer engineering. Robots, PCBs, cleanroom fabrication & metrology, and multi-material rapid prototyping.

Static site, no build step — GitHub Pages serves it straight from the repo root.

## Highlights
- **3D wafer hero** (Three.js) — dies lift toward the cursor, click to send a wave, laser line sweeps the surface.
- **The Bench** — 8 live instruments: LQR biped balance (Riccati solved in-browser), 2-link leg IK, power/CAN board net explorer, Web Audio 3-band EQ, 9-channel foot-pressure ADC, TSV process step-through, 61-point film-thickness map, 3D confocal surface scan.
- **Fab shop** — H2D vs U1 multi-material toolchange simulator, printer troubleshooting playbook, maintenance checklist.
- Case-file modals, filterable gallery + lightbox, skills constellation, poster magnifier, scroll-drawn timeline.
- Terminal (press <kbd>`</kbd>), litho-room lighting (<kbd>L</kbd>), and a Konami code.

## Structure
```
index.html            page
404.html              "die not found"
assets/css/style.css  styles (cleanroom + litho themes)
assets/js/data.js     case-file / skills content — edit text here
assets/js/app.js      UI, modals, gallery, terminal, fab-shop widgets
assets/js/bench.js    interactive instruments
assets/js/hero.js     Three.js wafer
assets/js/profilometry.js  3D surface scan
assets/img, media     optimized photos + equalizer demo video
assets/vendor/three   Three.js r170 (MIT)
assets/fonts          Bricolage Grotesque, Inter, JetBrains Mono (OFL)
```

Preview locally: `python3 -m http.server` then open http://localhost:8000 (ES modules need a server, not `file://`).
