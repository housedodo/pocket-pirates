# Architecture: how the code is layered

The game is native ES modules (Vite bundles them; the single-file builds inline the bundle). `index.html` loads `/src/main.js`.

## Layers (imports only point down; no module imports one above it)

```
main.js                      orchestrator: builds the world and the systems, wires them, runs frame(); window.__game (dev/test hook)
  ui/dom.js                  $ helper, the HUD elements written every frame, toast()
  systems/calendar.js        weekdays, market/lantern/festival days, the tide, tonight's moon (pure reads of state)
  systems/storyflags.js      marks and keepsakes in state.story (not in the demo)
  core/engine.js             canvas, renderer, PS1 post pass, scene, camera, ocean, sky, resize()
  core/state.js              the voyage's state object, built once from the save (+ save migrations)
  core/config.js             URL params, DEV, localStorage (store, keys), the saved voyage, settings, session flags
feature modules (world.js, ship.js, audio.js, objectives.js, ...)   below main; they get what they need from main by constructor
                                                                      or callback (dependency injection), never by importing main
```

Boot order is the import order: config, state (which also installs the pixel-UI CSS, as before), engine (materials, post, scene),
then main's body builds the world, ship, audio and every system in the same order as before the split.

## Rules
- Shared, saved data lives in `state` (core/state.js). Mutate its fields; never replace the object. New saved fields: add them in
  `core/state.js` (with a default for old saves) and in `saveNow()` in main.js.
- Config and per-browser settings live in `core/config.js`. Session-only flags go in `session` there (not loose `let`s).
- A new self-contained system goes in its own module under `src/systems/` (or an area module at `src/`); it imports from `core/`
  and gets anything from main (toast, audio, objectives...) passed in, the way `Objectives`, `Abyss` and `Threads` do.
- Player-facing text stays where it is: `scripts/story_export.py` numbers lines per file (MAIN-xxxx for main.js), so moving text
  between files renumbers the writer's line IDs. Move text only on purpose and rebuild STORY_MASTER.
- Order-sensitive side effects stay in main.js: e.g. the toast layer is appended to <body> after `Places` adds its label layer.

## What is still in main.js, and why
About 100 module-level `let`s (`modal`, `dread`, `tNow`, `started`, the camera's zoom/pitch/yaw, the title and intro state...) are
read and written across the harbour screens, input, story beats and `frame()`. Splitting those needs a shared runtime-state
module (`core/runtime.js` with one object, e.g. `rt.modal`, `rt.dread`) and every use rewritten. The next safe steps, one per
commit, each checked against the previous build with the same headless script:
1. `core/runtime.js`: move the frame-shared lets (`modal`, `dread`, `dark`, `tNow`, `started`, `introT`) into one object.
2. `ui/camera.js`: zoom/pitch/yaw/drag input and the camera block of `frame()`.
3. `ui/title.js` + `ui/pause.js`: the title screen and the pause menu (they only need runtime + openModal/closeModal).
4. `ui/harbour.js`: `renderHarbour` and its helpers (text stays there under its own story-export prefix, chosen with the writer).
