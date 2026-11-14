# HOIST: architecture and lore guide

A standing manual for the agent that builds this game. Read it before every task, after the four files it sits under.
Written 2026-11-14 from a four-part audit (architecture, look and sound, lore, how the mechanics carry the lore).
The evidence behind every claim here is in `docs/AUDIT_2026-11-14.md`.

**Where this file ranks.** `docs/CANON.md` (what is true) beats `docs/RULES.md` (what every change keeps) beats
`docs/STYLE.md` (the look) beats this guide. This guide adds a map, contracts and a backlog; it never overrides those three.
If it disagrees with one of them, they are right and this file has a bug: fix it in the same commit.

**Three things that will get a change rejected:**
1. Inventing story. Only the owner decides canon (RULES 4). A mechanic may embody a fact already in `CANON.md`; it may never assert a new one.
2. Explaining. If a line, an effect or an interface element tells the player what a strange thing means, cut it (RULES 1).
3. Leaking the full game into the demo (RULES 29).

---

## 1. North star and tone guardrails

### The game in one breath
You sail the Merry Gull with your first mate Mara through a cosy, sunlit, PS1-style Caribbean: sail, fish, dig, deliver, chat.
The further from home, the more the world goes wrong. A woman in a black hut throws a twenty-sided die and writes the numbers
down; you throw too. Nothing is ever explained. What you noticed on the way decides what you can do at the end.

### The core loop
| Layer | What the player does | What it feeds |
|---|---|---|
| Seconds | Trim, tack, read the wind ring, ride the swell | The joy of sailing; this must stay the best part |
| Minutes | E under way: fish, dig, salvage, pick fruit, hail a ship; harbours: board, market, tavern, shipwright | Gold |
| Hours | Gold buys ship upgrades; upgrades open the strata (S0 to S5) | Reach, and reach is dread |
| The voyage | Seeing things fills a hidden clue ledger; the ledger opens capabilities and choices at the Table | The ending |

The truth under the game is in `docs/CANON.md` section 2. Read it there; it is deliberately not repeated here, and none of it
is ever said to the player in those words.

### Aesthetic pillars
1. **Bright reading first.** Every strange thing is first a cosy thing: a baker, a tune, a lamp. The second look is the horror.
2. **Wrongness is repetition and absence**, never a new monster: one more than there should be, one fewer, already done, laid for two.
3. **Horror by removing and bending.** Music loses instruments; colour drains; the wind drops; people repeat themselves. Nothing is added to scare.
4. **Chunky, dithered, a little dirty.** Low-res 3D and pixel UI on one grid; flat facets; grime; things lean.
5. **The world is polite.** It is patient and kind and it has already written you down. Nothing here is angry.

### The shape of a wrong thing (copy this shape)
An ordinary statement, one flat wrong detail, a shrug. Two to four short sentences. No adjective of fear.
> "We stopped counting the boats that come back. It was always one more than went out." (LORE-0018)
> "Berth three is free. Berth four is free. Do not use berth five." (GRT-0039)
> "Do you hear that? No? Good. Me neither." (Mara, OBJ-0095)

It happens **once**, sets one flag in `state.story`, has an ordinary reading, and is never named, logged as an event, or rewarded.

### Do
- Let a mechanic carry a fact that `CANON.md` already holds; let the player join two facts themselves.
- Give every strange place a bright reading and a silhouette that reads from far off.
- Keep lines to one idea. Mara: one or two short lines, warm, a little cheeky, says "Captain".
- Give every sound that carries story a silent twin the player can see (RULES 28).
- Use the vocabulary the game uses: someone, somebody, nobody, a hand that is not ours, the book, the table, throw (never "roll" in player text), units.
- Ask when `CANON.md` section 8 or `docs/WRITER_TODO.txt` lists it as open. Leave drafts as drafts.

### Do not
- No words from the banned list in anything the player reads: **lid, eye, sleeper, Lady, "kept soft", "Mara is from"** (RULES 6). Before the hut is known: no "she", "the hut", or a number about it.
- No explaining lines, lore dumps, diaries that conclude, or a narrator. Mara never explains and never confirms.
- No sanity meter, dread gauge, "clue found" popup, quest marker to a clue, achievement, or "new" badge. Dread shows as colour, sound and behaviour only.
- No tentacles, cultists, rituals, named monsters, gore, jump-scare stingers, chosen-one framing or a villain with a motive. The words "Lovecraft" and "cosmic" never appear in the game.
- No generic creepypasta ("TURN BACK", "it is behind you", glitch glyphs). The audit found some in `src/abyss.js`; do not add more, and see task P1.
- No second happy ending. Only the tune is gentle (CANON 2026-11-11).
- No emoji or symbol glyphs, no bold or italic, no third typeface, no image or model files.
- Never write the name of Mara's village anywhere: code, text, docs, commit messages (RULES 10).
- Never let Mara act on the world where others would see it, and never let anyone answer her (CANON 2026-11-12).
- Never repeat a wrong thing, and never make dread depend on time. Dread follows where you are.

### Never fill these in (open, owner or writer only)
The six ending texts and six epilogue lines (`src/table.js`); Perrin's five letters after the hut (`perrin_*` in `src/objectives.js`);
the seven thread clue lines (`CL-T-*` in `src/clues.js`); the credits; what her book says at the very end; whether the hut changes
on later visits; whether any ending touches what Mara is; every `[IDEA]` slot in `docs/STORY_MASTER.txt`.

---

## 2. Codebase map and architectural contracts

Three.js 0.186 + Vite 8, native ES modules, no framework, one smoke test (`npm run smoke`), one bundle (about 1.4 MB). 72 source files, 1.44 MB of
source. Many lines are several hundred characters long with trailing `//` comments: **never put code after a `//` on the same
line** (it caused three bugs, fixed 2026-11-14 in task R1).

### Layers (imports point down only)
| Layer | Files | Owns |
|---|---|---|
| Orchestrator | `src/main.js` (118 KB) | Boot, the `G` registry, `frame()`, hut and Table glue, `window.__game` |
| Screens | `src/ui/*.js` (hud, harbour, encounters, pause, title, camera, shiptrade, shipyard, dom) | DOM, input, camera |
| Systems | `src/systems/*.js` (interact, storybeats, lullaby, lostsailors, edge, regionlook, reef, drowned, calendar, storyflags) | Rules and timers with a tick |
| Core | `src/core/config.js`, `state.js`, `runtime.js`, `engine.js` | URL flags and storage; the saved state; `rt` and `G`; renderer, post pass, scene, camera, ocean, sky |
| Features | everything else in `src/` | Given what they need by constructor or callback |

`docs/AREAS.md` says which area (design, gameplay, audio) owns each file. `docs/ARCHITECTURE.md` describes the layering in more
detail and is accurate except where the audit lists it as stale.

### The three kinds of shared data
| | Where | Lifetime | Rule |
|---|---|---|---|
| `state` | `src/core/state.js` | Saved (`pocket-pirates-save-v1`) | Mutate fields, never replace the object. A new saved field gets a default in `state.js` **and** a line in `saveNow()` in `main.js`. |
| `state.story` | inside `state` | Saved | A free bag of about 90 keys. Its containers (objects and lists) get their empty shape in `STORY_SHAPE` (`core/state.js`); a plain flag that is absent means "not yet". A new container goes in `STORY_SHAPE`; never rename a saved key without a migration (RULES 31). A list that grows with play gets a limit in `KEEP` (`trimState`, run by `saveNow`). |
| `rt` | `src/core/runtime.js` | This run only | `rt.dread`, `rt.modal`, `rt.tNow`, camera, timers. Initialise where the system boots. |
| `G` | `src/core/runtime.js` | This run only | Getters main.js lends to modules (`G.ship`, `G.audio`, `G.toast`). Add one inside the `// G-REGISTRY START ... END` block. Read `G.x` only inside functions, never at import time. |

There is **no event bus**. Modules talk by direct import (downwards), by callbacks handed in from `main.js`, through `G`, and
through context objects built each frame. Do not introduce an event bus, a store library, or classes-for-everything; follow the
patterns below.

### The frame, in order (`frame()` in `src/main.js`)
Variable timestep, `rawDt = min(0.05, delta)`: below 20 fps the game runs in slow motion (this is why headless is about a tenth speed).
`dt` is 0 whenever a modal is open or the intro runs; `vdt` keeps visuals moving ashore and on the title.

1. Clock, day rollover, wind, buffs, sector change, the glimpse.
2. Input, `ship.update`.
3. Story ticks: `stormAndCalm, tabletopTick, seaGate, clueTick, seamTick, tackTick, seaTick, oilTick, sailTick, fogLost`.
4. `rt.tg = getInteract()` (the one interaction lookup a frame; the anchor, E and the prompt read it), `anchorTick, oarTick`; then the full-game ticks `edgeTick, lostTick, lullabyTick`.
5. Collision (solids, then `world.collide`).
6. **Dread and the stage chain** (see below).
7. World streaming, ship placement, secrets, wake, fishing, combat, objectives, fauna, threads, traffic, reef, drowned, sea features.
8. Shader uniforms, sky, ocean. 9. Camera. 10. Land-ho, discovery, prompt (from `rt.tg`), dig. 11. HUD and audio. 12. Autosave every 4 s. 13. Post pass.

### Dread: one value, one chain
- Source: `strataDread(distance from Tama)` in `src/palette.js` (`STRATA`, six strata out to 2400). Zero in the demo.
- Felt: `felt()` in `main.js` never falls below 85% of `state.story.peakDread`, and adds 0.05 at night from the Trade Belt out.
- Target: `rt.forced ?? lullDread(clamp(felt() + dreamShift()))`, eased at 0.4 a second into `rt.dread`.
- Stage: `Math.min(4, Math.floor(dread * 5))`. Five stages: Sunny, Off, Wrong, Eerie, Cosmic.
- **A new dread modifier composes at that one target line**, in the shape of `lullDread(target)` (`src/systems/lullaby.js`): a pure function of the target plus an eased `rt` value. Never write `rt.dread` from anywhere else.
- **The look chain runs in this order and each step mutates `stage` in place:** `sampleStage(dread)` → `regionLook` → `applyTimeOfDay` → wind → `weather.apply` → lantern, lamp-out, fog wall → abyss. A new look modifier is a function of that shape inserted at the right place, never a second palette.

### Patterns to copy (the only sanctioned ways to add things)
| To add | Copy | Shape |
|---|---|---|
| A per-frame system | `src/systems/lostsailors.js` | `export function xTick({ dt, dread, ship, world, quiet })`; called in step 4 as `if (live && dt > 0 && window.__BUILD !== 'demo') xTick({...})`; runtime values in `rt.x` |
| A delayed line | `after(2.5, () => G.objectives.mate.say(...))` (`src/systems/later.js`) | Game seconds; never in a menu; waits out the quiet. Not `setTimeout` |
| A once-only beat | `src/systems/edge.js` | `if (state.story.x) return; ...; state.story.x = state.dayN;` Respect `eventQuiet()` (the quiet window round the hut and the diver). |
| A clue | a row in `CLUES`, `src/clues.js` | id `CL-<region letter><n>-a`; seen with `G.seeClue(id)`; place-and-time detection with `dwell(key, cond, seconds)` in `clueTick`; its effect read with `isKnown(state, cap)`. No popup, ever. |
| A region rule | `src/regions.js` | A pure function with numbers in that file (`sellMul`, `raiderChance`, `lampBurnMul`). Readable from what the player sees there; never explained in words (RULES 24b). |
| A Mara line | `REMARKS` / `MUSINGS` in `src/objectives.js` | `G.objectives.remark(key, rt.dread)`, once via `state.hints[key]`. Check `laterOK()` for ambient chatter. |
| A sea encounter | `src/sighting.js` | `sighting.spawn(card, ...)`, card `{ id, icon, title, dark, text, choices: [{ label, go }] }` |
| Harbour reaction | `src/harbourlife.js` | `life.news(state, kind, o)` with a `GOSSIP[kind]` row; `boatStatus(d, dayN, dread, seed)`; `world.gctx` for props that read the ledger |
| A fish | a `FISH` row in `src/fishing.js` plus a portrait in `src/fishart.js` | `{ id, name, w, diff, price, kg, min, max, night, dark }` |
| A sound | `CUES.oneShots` in `src/audio.js` **and** `docs/AUDIO.md` | Unlisted cues are silent on purpose (RULES 25). About 16 are called and silent today, `bell` among them. |
| A chart mark | `src/chartstyles.js` | `if (isKnown(state, cap)) dot(x, z, PENCIL)`; the bare vellum is reserved (RULES 23) |
| A per-frame colour or vector | a module-level constant or scratch (`C_FOGWALL`, `_tc` in `main.js`) | Never `new THREE.Color` / `new THREE.Vector3` inside a tick (R6); a HUD value goes through `setText` / `setWidth` (`ui/dom.js`), which touch the page only on change |
| A screen | `src/ui/<name>.js` | Imports only `core/` and `ui/dom.js`; `export function init<Name>()`, called from `main.js` at its place in boot |
| A state prop on an island | `extra.states` in `src/world.js` | A separate mesh shown or hidden; never rebuild the island |

### Hard contracts
1. **Never import `main.js`. Never import one `ui/` module from another.** Go through `G`.
2. **`main.js` does not grow** (RULES 34). A new system is a new file plus a row in `docs/AREAS.md` and `docs/DESIGN.md`.
3. **Goals by id** (21 goals: 0 sail ... 15 hut, 16 to 20 `perrin_*`). Outside `src/objectives.js` ask `goalReached(state, id)` or `goalIdx(id)`, never a bare number (R4, 2026-11-14; `goalIdx` throws on an unknown id). The save still stores the index `state.goals.i`: moving a goal needs a save migration (`state.goals.v`, currently 3, in `src/core/state.js`). `GATES` and `UNLOCK` go by chapter (`ch`), not by goal.
4. **The demo is a different game.** `window.__BUILD` is set only by `scripts/single.py`; under the dev server and a plain `vite build` it is undefined, which means *the full game without dev tools*. Anything from after the hut is wrapped in `window.__BUILD !== 'demo'` (`DEMO` from `core/config.js` where that layer is imported). Do not rely on "dread is zero in the demo" as the gate: gate the system. Already gated at the source: URL test flags, the clue ledger (`markSeen`, `isKnown`), the later hand-made places (`lmHere` in `landmarks.js`), threads.
5. **`world.nearest()` has a side effect** (it sets `world.lastEdge`); callers depend on call order. Do not reorder calls round it.
6. **Old saves load.** Test a change that touches state against a save made before it.
7. **Story delays run on the game's clock:** `after(seconds, fn)` from `src/systems/later.js` (R7, 2026-11-14). It never fires inside a menu and waits out the quiet window (pass `{ quiet: false }` only for a line that answers the quiet itself). A feature module gets it through its api (`threads.bind({ after })`). `setTimeout` is only for animation and for lines of a screen that is open (a harbour's own lines, Mara's line as the log opens).
8. **Text reaches the story file.** After any player-facing text change: `python3 scripts/story_export.py`. A new `ui/` module with text is added to `MAIN_PARTS` there. A changed line gets a new ID; the old one is retired (RULES 33).
9. **Trials go behind a URL flag and the losers are deleted** when one is chosen (RULES 35).
10. **Shared files** (`main.js`, `index.html`, `docs/PROGRESS.md`) are edited in small local pieces. In `index.html` a later rule of equal weight wins; put a rule next to the ones it belongs with.

### Naming
- Files: lower-case, one word (`regionlook.js`). Ticks: `xTick`. Inits: `initX`. Shader uniforms: `uCamel`. Constant tables: `UPPER_SNAKE` (`STRATA`, `CLUES`, `FISH`, `BARRIERS`).
- Places: the definite article and a plain noun (The Ribs, The Cup, The Name Wall), or a possessive (Wick's Rock, Teo's Sandbar). Harbours: short invented two-syllable names. Ships: birds and flowers (Merry Gull, Kestrel, Little Wren, Marigold). People: one short name, often "Old". Names stay unique (CANON 2026-11-13); check `docs/STORY_MASTER.txt` before naming anyone.
- Code names that must never reach player text: "the Lid" (stratum S5), "sleeper", `eye` identifiers.

---

## 3. Visual, shader and interface standards

`docs/STYLE.md` is the law and `docs/ART_SPEC.md` holds the budgets. This section is what the code actually does, for when you
need the numbers.

### Pipeline
- One `WebGLRenderer`, no antialiasing, pixel ratio 1, linear output, no tone mapping. **Colours are authored as raw sRGB hex and are not converted.** Do not set a colour space on a texture or enable tone mapping.
- The scene renders to a nearest-filtered target about **270 lines tall** (`scale = max(2, round(cssHeight / 270))`, `src/psx.js`), then one post pass: Bayer 4x4 dither, 15-bit colour, saturation, tint, vignette; above dread 0.7 a UV wobble and a red/blue split.
- Fog is linear and is overwritten every frame from the stage. Camera: 62 degrees, near 0.5, far 1600.
- **There are no lights in the world.** Light is baked into vertex colours by `Builder` and multiplied by the global `uLight`. Do not add a `THREE.Light` to the main scene (the dice scenes are the one exception).

### Materials and shaders
- Everything in the world uses `psxMaterial` (`src/psx.js`) through the shared `mats.*` (terrain, props, sail, shallow, foam, beam, wake, glow...). It gives vertex snap, the dread blend from `color` to `colorB`, grime, and glow texels that ignore the light.
- Shared uniforms `U`: `uSnap, uDread, uTime, uLight, uSunDir, uSunColor, uDeep, uShallow, uWave, uRough, uIsl[12], uMurk, uOcean, uWindDir, uRain, uGust[4]`. They are written in one place in `frame()` (step 8). **A new uniform is added to `U`, written there, and listed here.**
- Water time is stepped to 12 fps on purpose. `waveH()` in the ocean vertex shader and `waveHeight()` on the CPU (`src/ocean.js`) are the same function: change both or hulls leave the water.
- A new mesh that uses a plain `MeshBasicMaterial` will not snap, will not darken at night and will glow through fog. Use `psxMaterial`. If its colour already follows the hour (a fog colour, `stage.cloud`), cancel the light with `fragmentColor: { head: '', body: 'diffuseColor.rgb /= max(uLight, 0.05);' }` (key `'Lc'`). An additive mesh fades with the fog on the CPU (`windfx.js`). (G2, 2026-11-14; the sky's stars, sun and moon keep plain materials on purpose: they are lights.)
- Lamps and anything meant to shine use `mats.glow`. Light classes stay distinct: steady yellow (friendly), flickering orange, steady blue, magenta (horror). At most 3 glowing sources on screen in S0 to S2, 2 in S3 and beyond.

### Building things
- `Builder` (`src/builder.js`): `push/pop, orient, tri, quad, box, cyl, blob, gable, geometry()`. Non-indexed triangles, flat colour per face, a second dark colour set. Every model needs its `colorB` (darker, purple-leaning, quieter) or it will not change with dread.
- One 256 px atlas of 16 tiles (`src/textures.js`). **No new tiles** (ART_SPEC).
- Scale: adult 1.4 units, door 1.8, cottage wall 2 to 3, the ship 6.9 long and 2.8 wide with a mast of about 7, top speed 11 units a second. Cell 110, sector 550. Island radius: sandbar 6 to 11, rocky 11 to 17, jungle 15 to 23, harbour 22 to 27 (Tama 38).
- Budgets: a rolled island at most 2,000 triangles and 4 draw calls; a hand-made place at most 3,500 and 9; everything on screen at most 120,000 and 90. Check with `scripts/art_checks.cjs`.
- Every place needs a vertical feature of at least 3.5 units or a lit source, and one strong silhouette.
- Cylinders 4 to 8 sides, blobs for rocks and heads, things a little crooked. Low and chunky always beats detailed.

### Palette (`src/palette.js` `KEYS` is the source of truth)
| Stage | Sky top / horizon | Water deep / shallow | Light, saturation | View (fog) |
|---|---|---|---|---|
| Sunny | `#3a86e0` / `#bfeaff` | `#1b86c6` / `#4fe0d0` | 1.0, 1.18 | 90 to 330 |
| Off | `#5490d0` / `#d6e8e0` | `#1d7a9e` / `#58c4b8` | 0.96, 1.0 | 80 to 300 |
| Wrong | `#5a5f9c` / `#c4d196` | `#1c5a6c` / `#3f8c78` | 0.8, 0.7 | 55 to 250 |
| Eerie | `#24243e` / `#6a7c76` | `#0e2c3c` / `#285856` | 0.7, 0.55 | 35 to 190 |
| Cosmic | `#06030e` / `#5a1a50` | `#12123a` / `#52287c` | 0.8, 0.95 | 25 to 150 |

Friendly things glow warm yellow; horror glows magenta (`#ff30c8`, `#ff70d0`), and magenta appears nowhere in S0 to S2.
Interface: cream `#f4ead0`, ink `#2a1608`, gold `#ffd23a` / `#c9a85c`, navy `#1b1538` to `#241c4c`.
Region looks live in `src/systems/regionlook.js` and give way to the dread palette between dread 0.5 and 0.85 (the Drowned's grey stays).
New colours come from these tables. Do not add a hex literal in `main.js`.

### Interface
- Two typefaces: DotGothic16 for everything, Pirata One for the logo, harbour names, chart harbour labels and the paper's masthead. 16 px grid (16, 32, 48). Nothing below 14 px.
- Every UI canvas is drawn small and shown with `image-rendering: pixelated`. No gradients (Bayer dither between 3 or 4 colours), no blur, no rounded corners, no hairlines, no smooth easing on things made of pixels: use `steps(n)`.
- Panels are `.panel` (dithered navy tile, four hard 4 px box-shadows, no CSS border); horror panels set `--pxedge: #ff70d0`.
- Icons are 7x7 character grids in `src/pixelui.js`, used with `pxi('name')`. A new icon goes there in the same format.
- The HUD is wordless: gold, time, place, the slip (what, where, which way and how far, in that order). A new gauge names itself once with `nameMeter` and is then silent. Mara's box never covers the ship or the water ahead of the bow.
- Three bookmarks only: Chart, Orders, Ship's book. New pages are sections of one of them. Nothing is a locked tab.
- Distances are plain units from Tama's pier, the same number on the board, the slip, Orders and the chart.
- `index.html` is 93 KB of CSS layered by override with 103 `!important`s. Its colour tokens (P2, 2026-11-14) are in the first `:root`: `--gold`, `--gold-dim`, `--paper`, `--ink-dark` (the brown ink `#2a1608`), `--horror`, `--edge-navy`, and `--ink`, which is the cream text colour `#fff7d6` (older than the tokens; the guide once called the brown ink `--ink`). Use them, never their hex; add rules beside their neighbours. The page's layers are a named scale in the same `:root` (`--z-hit` 2 ... `--z-modal` 4, `--z-fade` 6, `--z-toast` 8, `--z-onboard` 29, `--z-ending` 30, `--z-credits` 31, `--z-awaken` 40, `--z-dev` 60): a new page layer takes one of them. `#hud` itself has no layer, so its toasts and Mara's box stack with these.

### Sound
- Only cues in `CUES.oneShots` play. Music by dread: the stage-1 band, then the stage-2 stems, then `music_3`, then **nothing** above dread 0.9. Stereo pan only, no 3D panner.
- Do not judge sound or feel from the headless browser. Say so in the report.
- All music is stems from one session: 16 bars at 99 BPM, 4/4, F minor, all the same length (RULES 26, corrected 2026-11-14; the older "five loops, 6/8, 125 BPM" is out of date). A new stem matches that or it will not sit with the rest.
- Tama's bell is the band's bell (`s1_bell`): owner, 2026-11-14.

---

## 4. Lore-to-mechanics matrix

How each fact in `CANON.md` is carried by the game today, and how it should be carried. "Strength" is the audit's reading.
The right-hand column names the roadmap task; every L task is **a proposal until the owner approves it**.

| Canon (never said to the player) | Carried today by | Strength | Should also be carried by |
|---|---|---|---|
| Dread is where you are, never when | `strataDread`, `felt()`, peak hysteresis; palette, snap, music, fauna, traffic, fish | Strong | Keep. Never add a timer to it. (`setDieWear(dayN / 12)` is a small time-driven wrongness: leave it, do not copy it.) |
| It stirs when a throw is low; "the world pays for it somewhere" | `dreamShift` adds dread **to the player, everywhere**, for two days; all prices x1.15; a greeter speaks the number | **Weak: the cost lands on you, and a villager says so out loud** | The cost lands on one place you are not at, and you find it (L2) |
| One more candle for every low throw | Text only (`candles()` in `src/hut.js`) | Weak | Lit points at the hut you can count from the sea at night (L1) |
| Tama is home: the bells ring softly there | `noonBells` plays `bell`, a cue that is not listed, so it is silent; the clue line says a fixed "fourteen" | **Weak, and it breaks RULES 28** | A bell you can see swing, sounding with the band's own bell; the swell settling at noon (L3, L4) |
| Home is where it is gentle | Only distance zero means dread zero; after a low throw home is as bad as anywhere | Absent | A low throw is not felt inside Home Sound (L4) |
| Only the captain sees or hears Mara | Three once-only toasts (one, one head, one shadow); passengers speak to the captain | Medium: told, not shown | The one shadow is really drawn; the counts in the interface really say one (L7) |
| Mara: cheerful, steady, rattled, breaks | One remark per stage, musings, the abyss effect | Medium: nothing between the stage lines | Small behaviour, not more lines: what she stops remarking on (keep within RULES 7) |
| Others sat before you | Two berths, the hook, the hole; the three lost sailors in deep dread | Strong near home; the lost sailors are choice cards whose text joins the dots for the player | Keep the three. Consider making the lost sailors part of the sea rather than a card (owner). |
| The Two Players keep one region quiet | `lullDread` caps Free Cays dread at 0.45 on a still night; panned guitar and violin; `hum` halves being lost | Strong, with one leak: raiders and the night market follow the clock, not the music | Everything safe about the Cays' night follows `rt.lullK` (L5) |
| The dark is hungry for light | Oil burns faster with dread (`oilRate`), with no visible sign | Weak | The flame itself shows it (L6) |
| Knowing changes what you can do | `isKnown` capabilities: `tally, lamp, setdown, hum, rest, lookup, cupmark, wreckticks, date, streetline` | Strong at the end, thin before | The three dead capabilities `arrivals, forecast, bluelamp` (G3), as already designed in `docs/WORLD_REDESIGN.md` 6.3 |
| Someone writes you down before you arrive | Customs Pier, the Fort, the Keepers' Ledger (clues); the Crown's record shows only what you did | Economy only | `arrivals`: the Crown board shows the next line before you earn it (G3) |
| The Drowned keep what they take | Coinless harbours take one thing from the hold; it is discarded | Carries meaning, then drops it | What they kept comes back out of the sea in the deep (L8) |
| The tune is the way home | `hum` halves the helm loss in fog | Medium | In fog, the night stems lean toward the way out and the pennant points there (L9) |
| The world is a dream, not the first | Deep sectors renamed ", again"; the loop seam; reef shoals re-laid at dawn | Weak to medium | Leave. An idea on file: deep decor re-seeds after each trip home while the chart keeps the old drawing. Owner first. |
| The Edge | `src/systems/edge.js`, once | Strong | Leave alone. `state.story.edge` is never read again; that is correct. |
| The Raven sails empty | The Other Captain thread | Strong | Leave alone. |

### Rules for any new lore mechanic
1. Name the dated `CANON.md` line it embodies in the commit and in `docs/PROGRESS.md`. If you cannot, it is new canon: stop and ask.
2. It must have an ordinary reading. A player who never thinks about it must still find it a fair game rule.
3. It adds no text, or one short line in the game's existing voice. It never names its own cause.
4. If it is a one-time wrong thing it fires once. If it is a standing rule of the world, it must be readable from what is seen.
5. Sound and sight together (RULES 28). 6. Gated out of the demo unless it is purely cosy there.
7. Prefer state the game already keeps and nothing reads: `hut.rolls[].day`, `hut.fails`, `hut.wins`, `hut.skips`, `story.marks`, `story.keeps`, `story.lost`, `story.epoch`, `story.relit`, `story.crown`, the items the Drowned took, `rt.lullK`.

---

## 5. Roadmap: 25 tasks

One task per session, in this order within each group; R1 to R4 first. **[OWNER]** means: put the question to the owner and wait
before building. Each task ends with the workflow in section 6. Sizes: S under an hour, M a session, L more than one.

### Refactors
| # | Task | Files | Done when |
|---|---|---|---|
| R1 | ~~**The swallowed guard.** In `tryInteract`, `if (!r) return;` sits inside a trailing comment after `places.visit(...)`, so the next line throws for any landmark without a `VISITS` entry. Put the guard on its own line. Then search `src/` for other code after `//` on one line.~~ **Done 2026-11-14** (two more found and fixed: `world.js` NO_CHILD, `ui/harbour.js` badges). S | `src/main.js` (near line 1115) | The guard runs; a landmark with no `VISITS` row can be gone ashore on without an error; grep finds no other case |
| R2 | ~~**Close the demo.** With `__BUILD === 'demo'`: ignore `?dev`, `?dread` and `?threads`; zero a landmark's forced dread in `describeCell` (the Sunken Street sits about 900 out, inside the demo's sea, with `dread: 0.74`); keep the Sunken Street and every post-hut place from being visited or seen; gate `seeClue`, `clueTick` and the `isKnown` effects; gate `sighting` and `abyss.update` on the build, not on dread.~~ **Done 2026-11-14**: one `DEMO` flag in `core/config.js`; `lmHere(lm)` in `landmarks.js` keeps the thirteen exploration-story places out of the demo's sea; the ledger (`markSeen`, `isKnown`) and `clueTick` are off in the demo; cards and the abyss read no dread there. M | `src/core/config.js`, `src/main.js`, `src/world.js`, `src/landmarks.js`, `src/systems/storybeats.js`, `src/clues.js`, `docs/DEMO_CHECKLIST.md` | In a headless run with `window.__BUILD = 'demo'` set before load: `?dev=1&dread=0.9&threads=all` changes nothing; at the Sunken Street's position `__game.dread()` is 0 and no clue is recorded; the checklist has the new lines |
| R3 | ~~**One stage function.** Export `stageOf(dread)` from `src/palette.js` and use it at the four inline copies in `main.js` and wherever else `Math.floor(dread * 5)` appears. Leave thresholds as they are; list the places that use quarters instead of fifths in the audit doc for the owner.~~ **Done 2026-11-14**: `stageOf` in `palette.js`, used by the palette, `main.js` (4), `ui/shiptrade.js`, `greetings.js`, `newspaper.js`, `audio.js`; the other cuts are listed in the audit, section 1. S | `src/palette.js`, `src/main.js`, others by grep | One definition; behaviour unchanged at dread 0, 0.2, 0.39, 0.4, 0.8, 1 |
| R4 | ~~**Goals by name.** Add `goalIdx(id)` and `goalReached(state, id)` to `src/objectives.js`; replace every hardcoded index listed in section 2, contract 3. No goal moves, so no migration.~~ **Done 2026-11-14**: `goalIdx` and `goalReached` in `objectives.js`; every gate checked identical at every goal. M | `src/objectives.js`, `src/gates.js`, `src/main.js`, `src/oil.js`, `src/ui/harbour.js`, `src/chartstyles.js`, `docs/RULES.md` (rule 30 says the migration is in `main.js`; it is in `core/state.js`) | No bare goal number outside `objectives.js`; every gate opens at the same goal as before (step through with the dev bar or `__game.objectives`) |
| R5 | ~~**Interaction out of `main.js`.** Move `getInteract`, `tryInteract`, `goAshore`, `anchorTick` and `HEAVE_KINDS` to `src/systems/interact.js` (the split `docs/ARCHITECTURE.md` already names). Compute the interaction once a frame and reuse it; call `fishEnv()` only while a line is out.~~ **Done 2026-11-14**: `src/systems/interact.js`; `rt.tg` once a frame; `fishEnv()` only with a line out; story IDs unchanged. L | `src/main.js`, new `src/systems/interact.js`, `scripts/story_export.py` (`MAIN_PARTS`), `docs/AREAS.md`, `docs/ARCHITECTURE.md` | `main.js` is smaller; story export IDs unchanged (`git diff docs/STORY_MASTER.txt` is empty); E under way still anchors and starts the action |
| R6 | ~~**A frame that does not allocate.** Reuse module-level `THREE.Color` and arrays for the per-frame cases in `main.js`, `places.js`, `seafeatures.js`, `sky.js`, `float.js`; write gold, clock and bar widths to the DOM only when the value changed; redraw the compass canvas only when its inputs changed; stop splitting cell keys per island per frame in `world.js`.~~ **Done 2026-11-14**: fixed colours and scratch vectors made once (`main.js`, `places.js`, `seafeatures.js`, `sky.js`, `float.js`, and `fishing.js`, `localgames.js` found on the way); `setText`/`setWidth` in `ui/dom.js`; the compass redraws on change; islands keep their cell. M | those files, `src/ui/hud.js`, `src/ui/dom.js` | No `new THREE.Color` or `new THREE.Vector3` on a per-frame path (grep, then read each hit); screenshots at day, night and dread 0.6 match before and after |
| R7 | ~~**Story delays on the game's clock.** Add `after(seconds, fn)` on sim time (`rt.tNow`) in a small `src/systems/later.js`, ticked in `frame()`; move the story `setTimeout`s to it (not UI animation timers). Lines must not land in a modal or in the quiet window.~~ **Done 2026-11-14**: `after()` in `src/systems/later.js`; thirteen sea-side story delays moved; lines of an open screen keep the wall clock; checked in `npm run smoke`. M | new `src/systems/later.js`, `src/main.js`, `src/systems/storybeats.js`, `src/ui/*.js` | Pausing for a minute delays a pending Mara line by a minute; no line fires while `rt.modal` is set |
| R8 | ~~**A save that stays small and honest.** Give `state.story` its defaults in one place in `core/state.js`; cap the unbounded lists (`notes`, `loot`, `jobHistory`, `catch`, `hints` keys by day); do not write the save when `?seed`, `?x`, `?z` or `?time` overrode it; use game days, not `Date.now()`, for `rep.last`.~~ **Done 2026-11-14**: `STORY_SHAPE` and `trimState` in `core/state.js`, `PINNED` in `core/config.js`, `rep.last` in game days; old save, 30-day size and `?seed=2` checked. M | `src/core/state.js`, `src/core/config.js`, `src/main.js` | A save from before the change loads and plays; a 30-day scripted run keeps the save under a fixed size; opening `?seed=2` does not alter the stored voyage |
| R9 | ~~**A smoke test.** `scripts/smoke.cjs`: headless boot of the full game and of the demo (`__BUILD` set before load), fail on any console error, sail 60 game seconds, open and close the log, run `clueLint`, and assert the R2 demo conditions. Add `npm run smoke`.~~ **Done 2026-11-14**: `npm run smoke` (`scripts/smoke.cjs`), about 3 minutes; fails with R1's guard removed and with the `?dread` demo gate removed. M | new `scripts/smoke.cjs`, `package.json`, `docs/RULES.md` rule 39 | `npm run smoke` passes on a clean tree and fails if R1's guard is removed or a demo gate is deleted |

### Core gameplay
| # | Task | Files | Done when |
|---|---|---|---|
| G1 | ~~**Feedback that stays on the pixel grid.** A hard stepped red frame instead of the blurred `#hit` glow; 60 to 80 ms of hitstop and shake scaled by damage in `hurtPlayer`; a `steps(2)` gold pulse and count-up on `#gold`; a bow dip and a foam ring when the anchor bites; a brief sail bulge on trim; a small shake on a struck rock or a bite; the camera easing out about 15% for two seconds at the first sight of a new island. No new sounds without the owner (RULES 25).~~ **Done 2026-11-14**: all seven, each checked by a state read; the hit frame and the anchor by screenshot; STYLE 5 has the lines. M | `index.html`, `src/systems/storybeats.js`, `src/ship.js`, `src/ui/camera.js`, `src/ui/dom.js`, `src/fishing.js`, `src/digging.js`, `docs/STYLE.md` | Each effect visible in a screenshot or a state read; nothing blurred, eased or scaled on pixel art; STYLE.md has the lines |
| G2 | ~~**Everything obeys the light.** Wind wisps (`src/windfx.js`) dim with `uLight` and with fog (at night and in the fog wall they are the brightest thing on screen); wake, gust foam, mist, barrier fog and sky clouds move to `psxMaterial` so they snap and darken; band the sky dome into 6 to 8 steps and cut the sun and moon to 8 sides.~~ **Done 2026-11-14**: wisps, wake and gust foam take the light and snap; the wisps fade in fog; mist, the fog bank and clouds snap (their colour already follows the hour); the sky in seven dithered bands; sun, corona and moon in eight sides. M | `src/windfx.js`, `src/wake.js`, `src/seaplay.js`, `src/world.js`, `src/places.js`, `src/sky.js`, `src/psx.js` | Night and fog screenshots: wisps no brighter than the foam; the sky reads as bands; day screenshot unchanged in character |
| G3 | **The three dead capabilities**, as designed in `docs/WORLD_REDESIGN.md` 6.3: `arrivals` (the board shows arrivals one harbour ahead; in Crown harbours the record shows your next line before you earn it), `forecast` (the chart margin marks a bad day one ahead), `bluelamp` (second doors on harbour charts). One at a time; `arrivals` first. **[OWNER]** confirm each still stands. M each | `src/clues.js`, `src/regions.js`, `src/ui/harbour.js`, `src/chartstyles.js`, `docs/WORLD_REDESIGN.md` section 9 | With the clue unseen nothing shows; with it seen the mark is there, wordless; full game only |
| G4 | ~~**Comfort settings.** Pause-menu switches for camera shake and tremor, the post wobble and split, and flashes; honour `prefers-reduced-motion` as the default.~~ **Done 2026-11-14**: Shake, Wobble and Flashes in Pause > Settings (`settings.comfort`), off by default under reduced motion; checked at dread 1. S | `src/ui/pause.js`, `src/ui/camera.js`, `src/psx.js`, `src/main.js`, `src/core/config.js` (settings) | With the switch off at dread 1 the image is steady; the setting survives a reload |

### Lore-systemic features (each is a proposal: [OWNER] before building)
| # | Task | Embodies | Files and state | Done when |
|---|---|---|---|---|
| L1 | **Candles you can count.** The hut shows `1 + state.hut.fails` small lit points (cap 12), as state props; seen from the sea at night. No text. Open point in `WRITER_TODO` 2.2 (does the hut change on later visits): **[OWNER]**. S | "one more for every low throw" (CANON 7) | `src/world.js` (`darkHut`, `extra.states`), `mats.glow` | After two low throws three points are lit at night; within the glow limit; the demo's hut is unchanged |
| L2 | **A low throw lands somewhere.** On a low throw pick one harbour the ship is not at and store it on the throw (`rolls[i].where`). For two days that harbour's boats are out and not back (`boatStatus`), its windows are dark, its quay is empty, and only its prices rise. This replaces the global `dreamCost` and the dread added to the player everywhere. Nobody says why. The greeter lines that state the cause ("Somebody threw a ...") are the writer's to keep or cut. **[OWNER]** L | "Each low throw is a moment it nearly woke; the world pays for it somewhere" (CANON 2); question 4 | `src/main.js` (`onFail`, `dreamShift`, `dreamCost`), `src/traffic.js` (`boatStatus`), `src/world.js` (window and crowd state), `src/harbourlife.js`, new `src/systems/landing.js` | After a low throw exactly one other harbour is changed for two days and no other price moves; a high throw changes nothing; old saves without `where` load |
| L3 | **The bell you can see and hear.** Tama's noon bell swings once per stroke, and it sounds with **the band's own bell** (decided, owner 2026-11-14): take the stroke from the `s1_bell` stem (one clean stroke cut from the stem's buffer or encoded as a `bell` one-shot from it; if no single stroke can be lifted cleanly, ask). List the cue. Still **[OWNER]**: whether the strokes equal the last throw, and what that does to the fixed "fourteen" in clue `CL-C3-a`; until answered keep the count `noonBells` uses today. M | Questions 4 and 5; RULES 28 | `src/world.js` (bell prop animation), `src/audio.js` (`CUES.oneShots`), `public/audio/`, `public/audio/volumes.json`, `docs/AUDIO.md`, `noonBells` in `src/main.js` | At noon at Tama the bell visibly swings n times with the sound off; with sound it is recognisably the band's bell; the cue is in the list and the doc |
| L4 | **Home is gentle.** Inside Home Sound a low throw's dread is not felt (compose with the `lullDread` pattern), and for a few seconds at the noon strokes the swell near Tama lies down. No text. **[OWNER]** S | "Tama is home because it is where it is kept gentle" (CANON 2) | new `src/systems/home.js`, the dread target line in `src/main.js`, `stage.wave` | After a throw of 3, `__game.dread()` at Tama is 0 and rises past 450; the wave multiplier dips at noon within the bell's reach; in the demo only the wave dip exists |
| L5 | **The Cays are quiet while somebody plays.** Raiders, derelicts and the night market in the Free Cays follow `rt.lullK` (the music), not the hour: on a storm night nobody plays and the night is unprotected. S | CANON 2026-11-12, the Two Players | `src/regions.js` (`raiderChance`, `sellMul`), `src/traffic.js`, `src/systems/lullaby.js` | Still night: no raiders, stalls open. Storm night: raiders can spawn, stalls shut. Numbers stay in `regions.js` |
| L6 | **The lamp shows how far from home you are.** The lantern's flame gets shorter and leans as `oilRate`'s dread term rises; steady and upright in home waters. No meter, no text. S | "the dark is hungrier" (`src/oil.js`); the lamp rules | `src/ship.js` (lantern mesh), `src/oil.js` | At dread 0 the flame is upright; at 0.8 it is visibly shorter and leaning; in the demo it never changes |
| L7 | **One shadow, really.** The tells become things seen: under the lamp the deck shows one shadow where two stand; the tavern's bed and the board's count of hands say one. Each still fires once and keeps its ordinary reading. **[OWNER]** which tells become visible. M | CANON 2026-11-12, nobody sees Mara | `src/ship.js`, `src/ui/harbour.js`, `src/systems/storybeats.js` (`tellShadow`) | With the sound and the toasts ignored, a careful player can still see each tell once |
| L8 | **What they kept comes back.** Store what the Drowned's harbours take (`drownedTake`) and let those exact things be what the deep gives back in a late catch or a wreck, in place of random picks. No text beyond the item's own name. **[OWNER]** S | The Drowned's rule (CANON 2026-11-13) | `src/regions.js`, `src/abyss.js` (`wrongCatch`, `wrongLoot`), `state.story.kept` list (check the name is free: `story.kept` is already used for setting the die down) | An item taken at a coinless harbour can later be fished up in the deep; nothing appears that was not taken |
| L9 | **Steering by the tune.** With `hum` known and the ship lost in fog, the night stems pan toward the way out and the pennant points the same way. S | CANON 2026-11-12; the `hum` capability | `src/systems/storybeats.js` (`fogLost`), `src/layers.js` (pan), `src/ship.js` (pennant) | Lost in fog with `hum`: pan value and pennant both point at the exit bearing; without `hum` neither does |

### Polish
| # | Task | Files | Done when |
|---|---|---|---|
| P1 | **The deep speaks in the game's own voice.** List for the owner and the writer every line in `src/abyss.js` that uses a banned word (`'THE EYE'` twice in the lies and map names, `'THE EYE OPENS.'` in the ending), glitch glyphs, or stock horror ("TURN BACK", "it is behind you"), plus the hut's gold-slot phrasing and "Somewhere far below, something is disappointed". Extend `clueLint` to all player strings, plural "eyes" and number words reported as warnings. Change only what the owner approves. **[OWNER]** M | `src/abyss.js`, `src/hut.js`, `src/main.js`, `src/clues.js`, `scripts/story_export.py`, `docs/WRITER_TODO.txt` | The list is in `WRITER_TODO.txt`; the lint runs over the whole story export; approved lines changed and re-exported |
| P2 | ~~**One set of interface tokens.** Define `--gold, --gold-dim, --ink, --ink-dark, --paper, --horror, --edge-navy` and a `--z-*` scale; replace the literals (`#ffd23a` is hard-coded 53 times); delete dead rules (the conic-gradient icons, Pixelify and Georgia declarations, sizes under 14 px); replace the arrow glyphs on the shipyard turntable and the pause button with `pxi`; stop the ship marker covering the harbour label on the chart. Small local edits, several commits.~~ **Done 2026-11-14**: five commits: tokens, a z scale (the onboarding HUD under the ending), dead rules, pixel glyphs, chart names clear of the ship; eight live sizes under 14 px left for the owner. M | `index.html`, `src/pixelui.js`, `src/chartstyles.js` | Screenshots of HUD, harbour, log, pause and the Table before and after match; toasts no longer sit above the ending; no symbol glyphs remain |
| P3 | **Docs that agree with the game.** Fix the stale statements the audit lists: STYLE 2 (the target is about 270 lines, not 320x180) and STYLE 5 ("distances are sailing time" contradicts RULES 15); RULES "four wrong things" (three since 2026-11-12); CANON and DESIGN "16 goals" (21 with Perrin's five); the chart's "fathoms" against "units" (**[OWNER]**); `docs/QUOTES.md` listing retired lines; `STORY_MASTER` notes that call decided things open; the newspaper, clue lines, credits and demo end card missing from the story export; trials still in the tree against RULES 35 (**[OWNER]** which to keep: ocean styles, chart styles, Tama looks, watcher styles). M | `docs/*.md`, `scripts/story_export.py`, the trial sites | Each item fixed or put to the owner as one question; `python3 scripts/story_export.py` covers the paper |

---

## 6. Workflow protocol

### Before writing code
1. Read, in this order: `CLAUDE.md`, `docs/CANON.md`, `docs/RULES.md`, `docs/AREAS.md`, then this file. They are short. Then only your area's docs.
2. Find the task's row in section 5, or, for a task from the owner, find the section 2 pattern it should copy.
3. Ask three questions. **Does it assert anything about the story that `CANON.md` does not?** Stop and ask. **Does it exist after the hut?** Gate it out of the demo. **Does it add words the player reads?** Hold them to section 1 and plan the story export.
4. Read the code you will touch before changing it. Lines are long: read past column 200, and look for a `//` with code after it.
5. If the task crosses areas, say which, and keep each area's edit small.

### While building
- Smallest change that does the task. No drive-by refactors in `main.js` or `index.html`.
- New system, new file. New numbers in the table that owns them (`regions.js`, `palette.js`, `upgrades.js`), never inline.
- A trial goes behind a URL flag; when one is chosen the others are deleted in the same commit.
- If you find a bug outside the task, note it under "Found, not fixed" in `docs/AUDIT_2026-11-14.md` rather than fixing it in passing.

### Verify (and say what was not verified)
1. `npx vite build` must pass. (Two warnings are known: the chunk size and the dynamic import of `world.js`.) Then `npm run smoke` must pass (RULES 39; about 3 minutes; it starts its own server). When a task closes a new hazard, add its check to `scripts/smoke.cjs`.
2. Dev server: `npx vite --port 5173 --host 127.0.0.1`. Headless Chromium at `/opt/pw-browsers/chromium` with `--use-gl=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist`.
3. URL flags: `autostart=1&fresh=1&shot=1&nomate=1` plus `dread=`, `x=`, `z=`, `seed=`. **`time=` is a fraction of the day from 0 to 1** (0.5 is noon; 11 or 23 both wrap to midnight). `fresh=1` neither reads nor writes the save; `seed=`, `x=`, `z=` or `time=` read it but never write it (`PINNED`, R8).
4. **Dread 0.9 or more on a fresh save starts the Edge sequence.** To look at deep dread use `dread=0.85`, or set `state.story.edge` first.
5. The dev server is the full game. To test the demo, set `window.__BUILD = 'demo'` before the page loads (Playwright `addInitScript`). Any change that touches story, clues, places, dread or the HUD is checked in both.
6. Drive and read state through `window.__game` (`state`, `ship`, `dread()`, `setDread`, `setTime`, `teleport`, `openHarbour`, `openTable`, `objectives`, ...). Wait on state, never on the clock: headless runs at about a tenth of real speed.
7. Screenshot what changed and look at it. For a look change, also take the night and the dread 0.6 versions.
8. If state changed: load a save from before the change.
9. If text changed: `python3 scripts/story_export.py`, and check no banned word (section 1) is in the diff of `docs/STORY_MASTER.txt`.
10. Never claim feel, timing, latency or sound from a headless run. Write "not verified: feel, sound" when that is the case.

### Finish
1. `docs/PROGRESS.md`: a dated entry at the bottom saying what landed, what was verified and what was not.
2. Whichever of these the change touches, in the same commit: `docs/CANON.md` (a decision, with its date, only as the owner gave it), `docs/RULES.md` (a new rule), `docs/STYLE.md`, `docs/DESIGN.md`, `docs/AUDIO.md`, `docs/DEMO_CHECKLIST.md`, `docs/AREAS.md` (a new file).
3. Commit and push to the working branch. No pull request unless asked. Do not rebuild the single-file games or the Electron app unless asked.
4. Report in a few lines: what changed, what was verified and how, what was not, and any question for the owner.

### When to update this guide
- **A roadmap task lands:** strike its row (keep the number) and add the date. If it changed a contract, a pattern or a hazard in sections 2 or 3, change that text in the same commit.
- **A new system, uniform, pattern or shared table appears:** add its row to section 2 or 3.
- **The owner decides something an [OWNER] row was waiting on:** record the decision in `CANON.md` first, then update the matrix in section 4 and the task row.
- **A matrix row changes strength** because a mechanic now carries it: update "Carried today by" and "Strength".
- **Never** record story truth here that is not in `CANON.md`, and never let this file grow a second copy of a rule: link to the rule instead.
- When all of a group's tasks are done, ask the owner for the next group rather than inventing one.
