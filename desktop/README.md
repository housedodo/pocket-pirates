# HOIST desktop (Steam build)

An Electron app that wraps the single-file demo, because Steam ships downloadable games, not web pages.

## Run it
```bash
npx vite build && python3 scripts/single.py   # makes pocket-pirates-demo.html
npm run desktop                               # from the repo root (installs Electron the first time)
```
`prepare.js` copies `pocket-pirates-demo.html` to `desktop/game/index.html` and `LICENSES/` next to it on every start/build.
Flags (after `npx electron .` inside `desktop/`): `--windowed` starts in a window, `--dev` lets F12 open dev tools.

## Package it
```bash
npm run desktop:dist            # current OS, from the repo root
cd desktop && npm run dist:win  # or dist:mac / dist:linux
```
Output goes to `desktop/release/<os>-unpacked/`: that folder is what you upload to Steam (SteamPipe, one depot per OS).
Build each OS on that OS (a Mac build needs a Mac; Windows can be built from Linux only with Wine).
About 280 MB unpacked, ~110 MB as Steam's download.

## What the game gets
`preload.js` gives the page `window.hoistDesktop` (`isFullscreen`, `toggleFullscreen`, `onFullscreen`, `quit`).
`src/main.js` uses it when present: the fullscreen toggle drives the window, and the **Quit** items on the title
and in the pause menu appear (they stay hidden in the browser).

- Fullscreen at start; F11 or Alt+Enter toggles it; Esc never leaves it (it pauses).
- Saves are localStorage in Electron's userData folder (`HOIST Demo`). Keep `app.setName` and `appId` the same
  across updates, or players lose their saves.
- Links open in the player's own browser; the window never navigates away from the game.

## Not done yet
- Controller support (Steam Deck players expect it).
- An app icon (`build/icon.png`, 512x512, procedural like the rest).
- Steamworks (achievements, overlay, cloud saves): add `steamworks.js` once the app has a Steam App ID.
- Code signing for Windows/Mac (optional for Steam, but avoids SmartScreen / Gatekeeper warnings when run outside it).
