# Architecture: how the code is layered

The game is native ES modules (Vite bundles them; the single-file builds inline the bundle). `index.html` loads `/src/main.js`.

## Layers (imports only point down; no new module imports one at its own level or above)

```
main.js                 orchestrator: builds the world, ship, audio and every system; the frame() loop; story beats, HUD,
                        interaction; registers what it lends the modules below in G; window.__game (dev/test hook)
ui/hud.js               the wind ring and compass, the tracked errand and where it points, the slip, the tracker panel
ui/encounters.js        sea encounter cards and dice, the pig game, Mara's mood, one-time caves, crew who sign on and their wishes
systems/storybeats.js   chapter notes, the fog wall and being lost, sea gates, seams and clues, lamp oil, torn sails, tacking, the hull, the demo end
systems/lullaby.js      the Two Players keep the Free Cays quiet; where they are, for the music
systems/lostsailors.js  the sailors who went mad (deep dread)
systems/edge.js         the Edge sequence
ui/harbour.js           the harbour screens: board, market, tavern, shipwright, greetings, letters, companions, tutorial marks
ui/shiptrade.js         hailing other ships and trading with them
ui/shipyard.js          the shipyard turntable (cosmetics)
ui/pause.js             pause menu, settings (sound, display, fullscreen), dev and abyss panels, mixer, Sound Studio
ui/title.js             title scene and menu, New voyage, dev thread chooser, the opening cinematic (begin)
ui/camera.js            camera input (wheel, drag) and updateCamera() (follow, swell, shake, title/ashore/intro/yard/override)
ui/dom.js               $ helper, the HUD elements written every frame, toast()
systems/calendar.js     weekdays, market/lantern/festival days, the tide, tonight's moon
systems/storyflags.js   marks and keepsakes in state.story
core/engine.js          canvas, renderer, PS1 post pass, scene, camera, ocean, sky, resize()
core/state.js           the voyage's saved state, built once from the save (+ save migrations)
core/runtime.js         rt: everything the game tracks while it runs (modal, dread, tNow, started, camera, screens...)
                        G: services and functions main.js lends the modules (world, ship, audio, openModal, toast...)
core/config.js          URL params, DEV, localStorage (store, keys), the saved voyage, settings, session flags
feature modules         world.js, ship.js, audio.js, objectives.js, ... : below main; given what they need by constructor or
                        callback (dependency injection), never by importing main.js or a ui/ module
```

### The three kinds of shared data
- **`state`** (core/state.js): what is saved. Mutate its fields; never replace the object. New saved field: add it in
  `core/state.js` with a default for old saves, and in `saveNow()` in main.js.
- **`rt`** (core/runtime.js): what the game tracks while it runs and never saves. `rt.modal`, `rt.dread`, `rt.tNow`, `rt.started`,
  the camera (`rt.zoom`, `rt.pitch`, `rt.camYaw`...), the harbour and yard screens, timers of the story beats. Initial values are
  set in main.js (and the ui/ init functions) at the same point in boot as before the split.
- **`G`** (core/runtime.js): services and functions owned by main.js. main.js fills it with getters in one generated block
  (`// G-REGISTRY START ... END`), so a ui/ module reads `G.ship`, `G.audio`, `G.openModal(...)` at call time. Never read `G.x` while
  a module is being imported (top level); only inside functions.

### Boot order
Import order: config, state (which also installs the pixel-UI CSS, as before), engine (materials, post, scene), runtime, then main's
body. Code that used to run at load time inside main.js and now lives in a ui/ module is wrapped in `initX()` functions
(`initTitle1`, `initPause2`, `initHarbour`, `initCamera1`...), and main.js calls each one at exactly the place the code used to be.
Function declarations need no init (they are hoisted).

## Adding things
- **A new screen or panel**: a `ui/<name>.js` module. Import from `core/` (state, rt, G, config, engine) and `ui/dom.js`. Need
  something main.js owns (ship, audio, toast, openModal)? Use `G.x`; if it is not in the registry yet, add a getter there.
  Export an `init<Name>()` for listeners and DOM setup, and call it from main.js where it belongs in boot.
- **A new self-contained system** (rules, timers, simulation): `systems/<name>.js`, the same way; give it an `update(dt)` and call it
  from `frame()`.
- **New run-time values**: `rt.<name>` (set its initial value where the system boots). New saved values: `state` (see above).
- **Never** import main.js, and never import one ui/ module from another: go through `G` (main.js imports them all and lends what
  is shared), so the graph stays one-way and acyclic.

## Player-facing text
`scripts/story_export.py` numbers the writer's lines per source file. The MAIN-xxxx section reads main.js together with the ui/
modules split out of it (`MAIN_PARTS`), and ignores the `rt.`/`G.` prefixes inside `${...}` placeholders, so every existing ID stayed
the same. A new ui/ module with text: add it to `MAIN_PARTS` (or give it its own code in `CODES`, agreed with the writer).

## Order-sensitive spots (keep them)
- The toast layer is appended to `<body>` in main.js after `Places` has added its label layer (toasts stay on top).
- `initTitle1()`, `initPause1()`, `initTitle2()` run in that order in the input section, as the code they hold did.

## Known, not changed
- One older import cycle among feature modules: `world.js -> harbourlife.js -> jobs.js -> world.js`. It works (functions only at
  call time); untangling it would change their evaluation order, so it is left for a separate, tested change.
- main.js (about 1,600 lines) still holds the boot (world, ship, audio, every system), the frame loop (`frame()`), going ashore and
  interaction (`tryInteract`), the hut, the Table, combat helpers, the harbour arrival and `window.__game`. Next candidates, the same
  way: `systems/interact.js` (getInteract, tryInteract, goAshore, digging), `systems/combat.js` glue, and `frame()` split into
  update steps.
