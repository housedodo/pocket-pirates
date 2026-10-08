# Pocket Pirates: notes for Claude

A low-poly, PS1-style pirate exploration game (Three.js + Vite) that drifts from cosy Caribbean into
cosmic horror. Everything is procedural: no image or model files.

## Before changing anything
- **Follow `docs/STYLE.md`.** It is the style bible: pixel grid, dithering, no thin lines, grime,
  palette, pixel UI, the book and the chart. Everything new (models, icons, menus) must match it.
  If the user changes the look on purpose, update `docs/STYLE.md` in the same commit.
- **Read `docs/PROGRESS.md`** for what exists and which story threads are open (the lady in the hut,
  the Eye, Mara). Add to it when a feature or story beat lands; never resolve a storyline casually.
- `docs/DESIGN.md` explains how the systems work.

## Working
- Dev server: `npx vite --port 5173 --host 127.0.0.1`; build: `npx vite build`.
- Test headless with Playwright (Chromium at `/opt/pw-browsers/chromium`, swiftshader flags) and the
  `window.__game` hook plus URL flags (`autostart=1&fresh=1&shot=1&nomate=1&dread=&time=&x=&z=`).
- After a change: build, screenshot what changed, rebuild the single-file `pocket-pirates.html`
  with `python3 scripts/single.py` (inlines the dist JS, CSS, fonts, every sound and `public/audio/volumes.json`), then commit and push.
- Keep the HUD text minimal. Keep writing short; horror is implied, never explained.
