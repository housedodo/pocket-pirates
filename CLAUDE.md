# Pocket Pirates: notes for Claude

A low-poly, PS1-style pirate exploration game (Three.js + Vite) that drifts from cosy Caribbean into
cosmic horror. Everything is procedural: no image or model files.

## Work is split in three areas: design, gameplay, audio
**Read `docs/AREAS.md` first.** It lists which docs and files belong to each area. Load only your area's docs; read another
area only when the task needs it. Specialist agents live in `.claude/agents/` (`design`, `gameplay`, `audio`): use one when a
task sits inside one area; the main session coordinates tasks that cross areas.

## Always
- Style bible `docs/STYLE.md` (look), `docs/PROGRESS.md` (what exists, open story threads), `docs/DESIGN.md` (systems), `docs/AUDIO.md` (sound).
- Add to PROGRESS.md when a feature or story beat lands; never resolve a storyline casually. Keep the HUD text minimal, writing short; horror is implied, never explained.

## Working
- Dev server: `npx vite --port 5173 --host 127.0.0.1`; build: `npx vite build`.
- Test headless with Playwright (Chromium at `/opt/pw-browsers/chromium`, swiftshader flags) and the
  `window.__game` hook plus URL flags (`autostart=1&fresh=1&shot=1&nomate=1&dread=&time=&x=&z=`).
- After a change: build, screenshot what changed, commit and push. Single-file games (`python3 scripts/single.py`:
  `pocket-pirates-demo.html` for sharing, `pocket-pirates-dev.html` with mixer F8, Sound Studio F9, test tools) only when asked.
