# Pocket Pirates (the game is called HOIST): notes for Claude

A low-poly, PS1-style pirate exploration game (Three.js + Vite) that is played as a cosy Caribbean game and turns,
unexpectedly, into cosmic horror. Everything is procedural: no image or model files.

## Read these first, in this order
1. `docs/CANON.md`: what is true in the story, every dated decision, what is still open. One page.
2. `docs/RULES.md`: the standing rules every change must keep (story, interface, look, sound, code, working).
3. `docs/AREAS.md`: which docs and files belong to design, gameplay and audio. Load only your area's docs; read another
   area only when the task needs it. Specialist agents live in `.claude/agents/` (`design`, `gameplay`, `audio`): use one when
   a task sits inside one area; the main session coordinates tasks that cross areas.

## Always
- Horror is implied, never explained. Keep the HUD wordless and the writing short. Never resolve a storyline casually.
- Only the owner decides canon. If `CANON.md` section 8 lists it as open, ask; never fill it in.
- When something lands: add to `docs/PROGRESS.md`; a decision goes in `docs/CANON.md` with its date; a new rule goes in `docs/RULES.md`.
- When player-facing text changes: `python3 scripts/story_export.py` (rebuilds `docs/STORY_MASTER.txt` from the code).
- The demo build (`window.__BUILD === 'demo'`) is a different game: no dread, nothing from after the hut. Check for leaks.

## Working
- Dev server: `npx vite --port 5173 --host 127.0.0.1`; build: `npx vite build`.
- Test headless with Playwright (Chromium at `/opt/pw-browsers/chromium`, swiftshader flags) and the
  `window.__game` hook plus URL flags (`autostart=1&fresh=1&shot=1&nomate=1&dread=&time=&x=&z=`). It runs at about a tenth
  of real speed: wait on game state, not on the clock, and do not judge feel or sound from it.
- After a change: build, screenshot what changed, commit and push. Say what was verified and what was not.
- Single-file games (`npx vite build && python3 scripts/single.py`: `pocket-pirates-demo.html` for sharing,
  `pocket-pirates-demo-silent.html`, `pocket-pirates-dev.html` with mixer F8, Sound Studio F9, test tools) only when asked.
