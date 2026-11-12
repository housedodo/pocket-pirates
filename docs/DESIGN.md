# Pocket Pirates: design notes

> What is true in the story: `docs/CANON.md`. What every change must keep: `docs/RULES.md`. This file says how the systems work.
> Sections are in the order they were built; where a later section changes an earlier one, the later one is right.

## Pitch
Sail a tiny ship across an endless, procedurally generated Caribbean. Chart islands, dig up treasure,
visit harbour towns. The further from home you go, the more the world goes wrong: bright and cosy first,
cosmic horror last. The PS1 rendering itself degrades as dread rises.

**Chosen direction: "Wind Waker with a rot"**: cosy exploration first, horror creeps in.

## Why a browser game (Three.js) rather than Godot/Unity
Honest answer: it is a fit for *how we work*, not a verdict on the engines.
- **I can build and test it end to end here**: it runs headless in Chromium, so I can screenshot every dread stage and drive the game. Godot/Unity need an editor and scene files that are awkward to author and verify without one.
- **Plain text, tiny repo**: no binary assets, no editor project. Diffs are readable.
- **Zero install to share**: send a link; works on desktop and phone.
- **The PS1 look is cheap to hand-write** (vertex snapping, low-res target, dither are ~100 lines of shader).

Where Godot would win: heavy content (large hand-made levels, animation tools, audio buses, native builds, console export).
If the game outgrows the browser, the design, generators and shaders port over; Godot is the natural next step, not Unity.

## How it works (files in `src/`)
| File | Role |
|---|---|
| `psx.js` | PS1 material (vertex snap, dark colour set, emissive texels) + low-res/dither post pass |
| `palette.js` | **The 5 dread stages**: sky, fog, water, light, grading, snap strength. Tune the horror arc here |
| `world.js` | Streamed 110-unit cells -> island descriptors -> terrain + props. Deterministic from the seed |
| `builder.js` | Flat-shaded triangle builder (lighting baked into vertex colours) |
| `ocean.js` / `sky.js` | Wave-displaced ocean (same function on CPU for bobbing), sky, black sun, star "eye", clouds |
| `sectors.js` | 550-unit sectors, each with a name and a faction (Crown Traders, Free Cays, Reef Brotherhood, Lantern Guild; The Drowned far out). Ships wear their sector's colours |
| `logbook.js` | The captain's log: three bookmarks (Chart, Orders, Ship's book); sections the story has not reached are not printed |
| `chart.js` / `chartstyles.js` | The sea chart: frame, pan/zoom, side panel and hover card / the drawing itself (an inked portolan: painted means sailed) and the type pairing |
| `table.js` | The Table by the Water: what can be done there, the last throw and the book's weight, the six endings; Mara's village returning in four pieces |
| `clues.js` | The clue ledger: 17 clues, `state.story.seen`, derived question levels, capabilities (`isKnown`), `d3Open` |
| `gates.js` | What the interface lets you use, by main goal index and by clue |
| `places.js` / `landmarks.js` | The hand-made places: where they are, how they look, what a visit gives |
| `ship.js` | Procedural ship, wind-based sailing model, upgrade modifiers, wake, lantern glow |
| `float.js` | How every hull floats on the swell: plane fit under the hull, buoyant heave that follows the water's speed, limited pitch and roll |
| `wind.js` | Wandering wind: big heading swings over minutes + gusts, announced when it shifts |
| `daynight.js` | Day/night layered on the dread palette (11.5 min per day: 7.5 min daylight, 4 min night): sun, moon, stars, dusk colours, light level |
| `upgrades.js` | 5 ship upgrades x 3 levels (sails, rudder, lantern, spyglass, crew), costs and effects |
| `lore.js` | Names, harbour gossip and loot that drift from cosy to cosmic |
| `audio.js` | Optional drop-in audio, cross-faded per dread stage |
| `objectives.js` | The main goal chain (sail, harbour, dig, ... hut), `Mate` (Mara's text box and pacing), gated side remarks, pending next goal with a gap |
| `tabletop.js` | Dice (one die, d20 checks with advantage/disadvantage, treasure quality throw) and the encounter card deck |
| `sighting.js` | Rare signs at sea that open an encounter card (optional, never part of a story) |
| `solids.js` | Round colliders for ships, boats, whales, wrecks, piers; `pushOut` keeps the hull out of them |
| `fishing.js` | Fishing mini-game, 10 species with habitats (luck + place + time, no visible markers) |
| `jobs.js` / `passengers.js` | Delivery jobs, board, passengers; `nearby` respects the fog radius |
| `fauna.js` / `traffic.js` / `seafeatures.js` / `weather.js` | Wildlife, ships and scheduled events (market, regatta, migration), whirlpools and wrecks, weather fronts |
| `customize.js` | Shipyard: 360 turntable preview, paint, hull, flags, figureheads, try then buy |
| `combat.js` | Raiders, cannons (bought only, start with 8), hull as 5 planks |
| `greetings.js` / `hut.js` / `dice3d.js` | Villager greetings (one per day), the dark hut, 3D die |

Every island has a bright decor set and a "wrong" decor set (dead palms, glowing fungus, monoliths with eyes, a totem in town).
They swap at dread 0.5, and terrain colours blend to a second vertex colour set.

## Systems added after the slice
- **Upgrades:** buy at any harbour (E). Gold comes from treasure (+ crew bonus) and +15 per newly charted isle. Sails = speed and upwind ability, Rudder = turning, Lantern = night glow, Spyglass = view distance and zoom, Crew = dig speed and loot value.
- **Wind:** direction swings up to ~150 degrees over several minutes, strength gusts 45-125%. Waves scale with it. The wind meter (dial / pennant / rose / windsock, chosen in the pause menu) shows where it blows, a green-yellow-red ring around it shows how well the ship's nose would sail in each direction, a cream marker is the nose, and an orange marker points at the tracked mission.
- **Day/night:** `DAY_LENGTH` in `daynight.js`. Windows, lanterns, fungus and eyes ignore the light level so they glow at night; the lighthouse beam gets stronger.
- **Pause menu:** Esc/P (also on tab blur). Simulation, time of day and audio freeze while any menu is open.

## A living sea (all of it goes wrong with dread)
| System | Cheerful | Wrong |
|---|---|---|
| Gulls (`fauna.js`) | circle islands, cry | hang motionless and turn to watch you -> crows circling backwards -> a ring of silent crows above your ship |
| Dolphins | leap beside the ship, splash | circle silently without breaking the surface -> pale, tail-first leaps -> gone |
| Whales | surface far off, spout, dive | a huge shadow slides under the keel |
| Ships (`traffic.js`) | few and varied (fishing boat, merchant brig, schooner, galleon, outrigger canoe) in their sector's colours; hail them with E, but not everyone wants to talk: a hidden roll vs. your reputation with nearby harbours (+ faction mood). Offers: chart scraps, supplies, rum, news, tall tales, messages | drifting derelicts with lamps lit -> pale translucent ghost ships |
| Harbour life (`world.js`) | people walk the dock, crowds in the square (they go home at night) | silent figures stand at the shore facing the sea |
| Weather (`weather.js`) | showers | storms, fog banks, lightning that sometimes reveals a shape in the water |
| Night sky | shooting stars | they fall upward |
| Sea features (`seafeatures.js`) | salvage barrels, messages in bottles, wrecks to salvage (E, rare: 8% of open cells), glowing shoals, whirlpools | stranger loot and notes, magenta glow |

Population is deliberately sparse (at most ~2 ships, a few gulls, rare dolphins/whales) so the sea feels big. Only about a third of harbours and a few lone crags have a lighthouse.

Other systems: **jobs** (delivery contracts from harbour boards, tracked on the compass), **rumours** (40g, reveals a treasure isle on your chart) and **harbour reputation** (visits and deliveries earn up to 3 stars = up to 15% off upgrades).
**Lighthouses** only shine when it is dark: the sun below ~7 degrees (about 17:30 to 06:30) or during a storm. By day the lamp is dark and the beam is off.
**Sound** is synthesised in `synth.js` (every cue, music included); real files override it per cue.

## Starter adventure (first mate, fishing, riddles, looks, combat)
- **First mate and goals** (`objectives.js`): Mara talks you through the main chain of 16 goals in six chapters (sea legs, landfall; the riddle, the first upgrade; dead calm, tacking, a delivery, a passenger, charting; the tavern, Perrin's note, his chart, the second riddle; bottles, gossip; the hut) and reacts to events (dusk, storms, raiders, rising dread; she gets more unsettled as it goes on). Seven optional side goals complete themselves. Y or the pause menu asks for a hint; goals can be skipped in the Goals tab.
- **Fishing** (`fishing.js`): C casts (slow down first), wait for a bite, hook it, then hold Space to keep the marker in the green zone. 11 species, harder ones later; dark species appear with dread and at night. Sell at harbours (reputation adds a bonus); fish log in the Journal.
- **Treasure riddles** (`lore.makePuzzle`, `world.js`): the chest is no longer marked. Each treasure isle's arch carries a riddle (sunrise/sunset/pole star/lone palm) naming the shore where the chest is buried. Study the arch (E), sail to the right shore, dig. Wrong shores cost a few seconds. Riddles also come from Perrin (the starter map) and are kept in the Journal.
- **Ship looks** (`customize.js`): hull paint, sail colour, pennant and figurehead (parrot, dolphin, mermaid, lion, skull) at harbour shipyards. Some figureheads are earned (catch fish, salvage a wreck, earn 3 stars, sink a raider).
- **Combat** (`combat.js`, strictly optional): only some Reef Brotherhood ships are raiders. They chase when you are close, circle and fire; you can outrun them, parley (pay tribute, bluff) or fight. Space auto-aims a broadside at the nearest raider. Hull strength and cannon upgrades at the shipwright; cannonballs from harbours or wrecks of raiders. If your hull goes, you wake up at the nearest harbour with 25% less gold (no game over).

## Commissions, fruit and the log (second pass)
- **Commissions** (`jobs.commissionsFor`): each harbour board posts a delivery plus two errands, up to 3 held at once: catch specific fish, bring a fruit, recover floating crates from a marked search area, sink raiders, spot dolphins/whales. Hand in at the board (Board tab); rewards also build reputation.
- **Fruit** (`fruit.js`): jungle and sandbar islands grow one kind each (fruit is visible on the island). E picks 2-4 (once per in-game day per island). Sell at the Market or use for commissions.
- **Captain's log** is an open book with three bookmarks: Chart, Orders (the slip, errands in hand, riddles, rumours, optional goals, what is done) and Ship's book (journal, fisherman's log, ship, standing); short entries over two pages, page turn with the arrows.
- **Wind** is shown as a wooden dial with a cloth streamer (gusts make it snap), a word like "Fresh breeze" instead of numbers, and faint wisps drifting across the sea. Gusts add a few degrees of wobble within the prevailing direction.
- **Camera** orbits the boat (drag sideways, Z/X) and eases back behind it after a few seconds.
- **Mara** types her lines out letter by letter with a bobbing portrait; click or Enter skips; the next goal is announced a few seconds after she finishes.

## Dread stages
| # | Name | Feel | World signs |
|---|---|---|---|
| 1 | Home waters | sunny, saturated | gulls, shanties |
| 2 | Off | paler, quieter | NPCs repeat themselves |
| 3 | Wrong | green haze, desaturated | glowing fungus, standing stones, odd names |
| 4 | Eerie | fog, dusk, black flag | dead palms, lit empty windows, magenta lighthouse beam |
| 5 | Cosmic | black sun, eye in the stars | chromatic split, screen wobble |

## Quiet start, intro and quest cue (newest layer)
- **Intro:** a new voyage plays a 9 s cinematic (`INTRO_DUR`, letterbox bars, camera eases down behind the boat; Esc/click skips). Not for continued saves, `autostart`, `nomate` or `x=`; force with `?intro=1`.
- **Quiet start:** `onbAll()` / `onbQuiet()` / `laterOK()` in `main.js` hide HUD pieces (`ONB_KEYS`, class `.onb-off`, revealed with `.onb-pop`) and hold back everything that is not the current tutorial goal. `onbQuiet` = goals before index 2 (no discovery toasts, land ho, villager text); `onbAll` = HUD complete (goal 3+); `laterOK` = goal 9+ (dolphins, sightings, lighthouse tidbits, market/regatta, side goals). New ambient content should check `laterOK()`.
- **Mara's pacing:** `Mate` holds a line 3.2 s + 0.065 s per character, 1.4 s between lines. Goals have `intro` (array or `function(c)`), `outro`, `waitMate`, `count` ("(x/y)"). Next goal waits a `gap` (8 s early, 5 s later).
- **Quest cue:** `questCue` shows QUEST COMPLETE at once; `questNew` (called by Objectives when the pending goal is released, i.e. when Mara announces it) shows the NEW QUEST card, tracker entry and compass ping.
- **Letters:** Perrin's letters are picked up from the Board sign icon (`story.letterP1/P2`), Mara asks about them and marks the log tab (`story.tabMark`).
- **Demo build:** `__BUILD==='demo'` has no dread, no spoilers, a second harbour (Velto), fog gate radii in `GATES`, and ends at the next harbour after the first hut throw is remarked on; nothing unlocks afterwards.
- **Docs for the rest:** `docs/PROGRESS.md` has a dated entry per feature; `docs/concept/` holds the design concepts.

## The interface opens with the story (`src/gates.js`)
Only what the current quest needs can be clicked. Every other harbour sign, board button and log tab is greyed out (still readable) and only answers a click with one short line
("The tavern is shut to us for now", "Those pages are still blank"; keys skip it), and opens when the main goal that first needs it comes up; a sign that has just opened glows teal until you look
inside once (`state.story.uiSeen`). Opening points (index in `MAIN_GOALS` = main goals done):

| Opens at | What |
|---|---|
| 0 | Board sign, Set sail; log: Chart, Orders (the slip, Done) |
| 2 Follow the riddle | log: the Ship's book appears (journal); Riddles are printed on Orders |
| 3 Spend your loot | Shipwright sign; Ship's book: the ship pages |
| 4 Dead calm | Market sign (sell fish, fruit) |
| 6 Earn your keep | deliveries (Accept, Deliver, Drop off); Orders: Also in hand, If you like; Ship's book: standing |
| 7 Passengers | Take aboard; Shipyard (paint, figureheads) |
| 8 Chart 8 islands | buy charts, ask the fishers |
| 9 The tavern | Tavern sign (hire a hand, dice, a bed for the night), haggling, cannonballs, commissions (Accept, Finish, Let go) |
| 10 Perrin's note | rumours |

Story moments (a letter, a line on the pier, a pet, the grey buyer) are never locked. Once every main goal is done, everything is open.
Change an opening point in `GATE` in gates.js.

## Fishing and digging (skill, and they can fail)
Chosen from six playable studies (after Dredge and Undertale): the bite ring for fishing, probing the shore for digging.
- **Fishing: the bite ring** (`fishing.js`): C starts a swinging power meter, C again casts (a short cast lands by the boat:
  small, easy fish; a long one far out: bigger, rarer, harder fish, a longer wait). Hook the bite in time (C / Space). Then a
  needle sweeps round a ring: strike (C / Space) on a green mark, better on its gold heart. Each hit pulls the catch meter up and
  flips the needle; dawdle and the fish drags it back down. Harder fish: a faster needle, fewer and smaller marks. Dark fish and
  dread: the marks drift and the needle sometimes stops. Fails: too slow on the bite, three strikes on empty water, the meter runs dry.
- **The water changes the fight** (`RING_KINDS`): wreck water (red snags), night water (fading marks), heavy swell
  (surging needle), deep water (hold, do not tap; line strain), reef water (darting marks), calm. See PROGRESS.md.
- **Beaches** (`BEACHES` in digging.js, `o.beach`): sand, shingle (stone counts), dunes (holes fill in), mud (no tide,
  squares sink). Chosen per treasure isle from `hash2(d.seed, 41, 3)`.
- **Digging: probing the shore** (`digging.js`, treasure only, right shore only; a wrong shore is still a short dig that finds sand):
  the beach is an 8x5 grid; dig a square (click, or arrows / WASD and E / Space; the ship stays put meanwhile) and the sand shows how
  close the chest is, darker and wetter = closer. Hidden stones crack the shovel (two break it) and the tide creeps up with every dig
  (10 digs, 13 for Perrin's first chest, more with shipwright upgrades and the dig buff). Fails: the tide floods the beach, or the
  shovel breaks; the crew needs about 6 s, then a fresh try with the chest somewhere else. Dread: some squares lie about the damp.

## Quiet start
Mara's chatter (weather, tide, market days, musings, sightings), dolphins, pets (the cat at Tama) and the optional goals wait until
the tavern chapter (main goal 9, `laterOK`); before that she only speaks about the quest in hand. A goal that is already done when
its turn comes is skipped without its intro (no "good haul" line after you have bought the sails). The hut only stands on its island
once the story reaches it ("Ask around", `hutReached`); Perrin's isle sits a little further out from Tama.

## Dev build tools
`pocket-pirates-dev.html` (or `?dev=1`): a dev bar at the top with the quest (dropdown, `<` `>`, keys `,` `.`: forward runs each
quest's effects, back rewinds the story flags later quests set and Mara announces the quest), the hour (Dawn / Noon / Dusk / Night,
keys `1`-`4`, `[` `]`) and the dread (slider 0-1 with the stage name; `auto` or `0` returns to dread by distance). F6 weather,
F7 finish the quest, F8 sound mixer, F9 sound studio, `` ` `` debug line. None of it exists in the demo.

## Tunables
- `DREAD_RANGE` in `palette.js`: distance (2200 units now, ~3 min) to reach full dread. Raise it for a longer arc.
- `DARK_THRESHOLD` in `palette.js`: when decor swaps.
- `CELL`, spawn probability and type weights in `world.js`; `MAX_SPEED` in `ship.js`.

## Not in the slice yet
Real audio files (synthesised stand-ins ship now), trading, landing on islands, an ending, title/menu polish.

## Backlog
**Alternative directions to revisit**
- **B. Roguelike voyage:** each run is a seeded trip of fixed length, dread is a clock, keep upgrades between runs. Tighter and replayable, less "open world".
- **C. Pure sandbox:** no story, just sailing, collecting and slow corruption. Quickest to build.

**Game ideas**
- More upgrades: hull (collision/storm resistance), cargo, cannons later
- Trading and selling relics; harbour NPC quests; riddle/map treasure hunts
- Light combat later: ghost ships, sea creatures; cannons
- Fishing, friendly dolphins/whales early (which turn wrong later)
- Sanity/Dread meter driven by choices, not just distance; lantern/harbours restore it
- Storms, fog banks, whirlpools; dread interacting with the night (stranger things after dark)
- Landing on islands (walkable beach/town), cave mouths, interiors
- Procedural wrecks, message-in-a-bottle lore, a longer logbook
- Ending(s): seal it, join it, or turn back to a subtly wrong home
- Save slots, settings menu, gamepad, accessibility (reduce flicker/wobble option)
- Procedural fallback audio if no files are supplied


## HUD, tracker & grime pass
- The HUD is only gold, time and place (island name when near, else sector). Missions live in a tracker toggled with **Q**; the only direction hint is a small marker on the wind meter.
- Wind meter: a single pixel-art tick ring (36x36 canvas shown 4x, the same pixel size as the world) with an N at north, a bright arc over the headings that sail well, the wind arrow, a bow tick and an orange mission dot.
- One pixel style everywhere: HUD panels, menus and buttons use dithered pixel tiles, stepped 4px borders, pixel icons (src/pixelui.js) and Pixelify Sans with hard-edged text.
- The captain's log is a battered pixel tome: dithered, scratched and stained cover and pages with torn transparent edges, frayed pixel bookmarks on the side, rough pixel text.
- The chart is drawn at half resolution and posterised with an ordered dither: low-poly faceted islands, only thick rough strokes, pixel-font labels, plus folds, stains and pencil notes.
- Everything is deliberately grubby: stained/mossy atlas textures, per-face dirt in the baked vertex colours, a shader speckle + waterline wetness, clutter (barrels, crates, nets, washing lines, driftwood, fallen logs, mossy rocks) and worn ship details (cannons, anchor, ratlines).

## Full dread (`src/abyss.js`)
Ten effects (the star-eye and ghost ship were cut) that only run at dread >= ~0.9, each switchable in the pause menu and testable on its own ("Try"):
1. **Glass calm** - waves flatten, the sea turns into see-through black glass over a mirrored copy of the ship that slowly turns the wrong way.
2. **Corrupted HUD** - place names glitch or lie ("TURN BACK"), the clock runs backwards, the gold counter whispers, tracker rows rewrite.
3. **Mad wind meter** - needle spins, efficiency ring flickers, the mission arrow points at the player ("YOU").
4. **Mara breaks** - glitching portrait/text, broken lines every ~40s, hints go unanswered.
5. **Lighthouses stare** - every lighthouse beam swings round and tips down onto the deck, holds, then the lamps die.
6. **Watchers** - four looks chosen with the Style button: distant dark shapes that slowly turn (subtle), pale villagers, far-too-tall thin figures, and waders standing in the sea with glowing eyes and mouths that sink when you get close (scary).
7. **Living map** - the chart draws island by island, islands crawl, phantom isles ("Where you drowned") and a red "TURN BACK" appear.
8. **Time loop** - a second, pale sun at the horizon; every ~90s the ship and clock jump back up to 20 seconds.
9. **Wrong ocean** - wave animation runs backwards, the horizon tilts, the sails and flag swing against the wind.
11. **Wrong catches** - fishing brings up memories (your own compass, Mara's hat); chests and wrecks hold your earlier loot "again".
12. **Leviathan & the Eye** - giant dark arches rise from the sea ahead; after ~150s at full dread (or via the Ending button) a huge eye opens in the sky, the screen whites out and you wake near Harbour Tama.

## Hand-made places, wind play and the glimpse
- **Landmarks** (`landmarks.js`): `LANDMARKS` lists the seven places (cell key, position, base type, radius, height, the
  sight word). `forcedCells()` feeds `FORCED` in world.js (the starter cells win) and empties the eight cells round each.
  `describeCell` calls `shapeLandmark`; `terrainHeight`, `faceColor`, `buildTerrain` (44 segments, extra rings at the
  shore) and `decorate` ask `lmHeight`, `lmColor` and `lmDecor` first. The Halved Isle uses `cutShore` (a straight chord
  through the shore radius, `d.cutTh`, `d.cutC`), so collisions follow the cut. Everything else (charting, landfall,
  nearest) treats a landmark as its base type; `desc.lm` marks it. Landmarks are never chosen for the hut.
- **Places** (`places.js`): `BARRIERS` (reef 44, breakers 50, fog 110 from the centre, the upgrade and level that opens
  each). `tick` pushes the ship out and returns a message; `fog` (0..1) thickens the scene fog like the chapter fog wall.
  `visit` returns what is found (`VISITS`: once / again / every N days; gold, ammo, hull, fruit, chart, notes); saved in
  `state.story.lm` (day of last visit). (`labelsTick` once drew far labels over islands; removed: no text over islands while sailing.)
- **Sea play** (`seaplay.js`): three `LANES` (`ROUND` is gone), faded out near any fog by `fogEdge`; `currentAt(x, z)` is the drift (used for the ship and the foam).
  Gusts set `ship.gust` (a speed factor in `Ship.update`). `state.story.lanes` remembers currents met.
- **Glimpse** (`glimpse.js`): `k` 0..1 over nine seconds; main.js applies it to the wind, `stage.wave`, `audio.hush`,
  `fauna` (`ctx.freeze`) and `world.stare`. Starts once (`state.story.glimpse`) while `demoEnd === 'pending'`.
- **Pins**: `state.story.pins` ([{x, z, on}]); `trackTarget` follows the one that is `on`.

## Lamp oil (`oil.js`)
`OIL_FROM` (main goal index), `oilCap(upgrades)`, `oilRate(ctx)` and `lanternLit(ctx)`; main.js `oilTick` burns it,
warns, and sets `lampOut` (ship glow off via `ship.lampOut`, scene fog pulled in and darkened, fishing blocked). The
Market's LAMP OIL row and Wick's Rock refill it. Tune the burn in `oilRate`, the price in `OIL_PRICE`.

## Torn sails
`sailTick` in main.js: strain grows only in a real storm (`weather.storm > 0.6 && windNow.strength > 1.0`) with `ship.trim > 0.55`,
decays otherwise; warning at 35% of `SAIL_LIMIT` (20), tear at 100% (about 12 s at full sail in a full storm). `ship.torn` multiplies the speed target by 0.66. Mending:
a patch kit (`getInteract` kind `patch`, lowest priority, anywhere at sea) or docking at a harbour (`mendSails`).

## Lost in fog
`fogLost(dt)` in main.js: when `gateLost` (past `gateRadius`) or `places.lost` (inside an unopened fog bank) is set, `lostK`
rises to 1: steering and sail input are ignored, heading eases toward the way out plus a slow weave, trim settles at 0.45,
speed toward 3.2, and a small outward drift. The scene fog closes to ~10 units. `fogEdge(x, z)` (0 near fog, 1 in clear water)
scales the currents (seaplay.js) so they never lead into fog.

## Waves and the ship
Wave height = the swell (several crossing sine waves, crests bent by a slow warp) x the sets (`G`, a slow travelling pattern,
0.5x to 1.45x, with a longer roller in the big sets) x the land factor (`seaScale` / GLSL `landNear`: 0.35 within ~15 of a
shore, rising smoothly to 1.7 at 260+ from any of the twelve nearest islands) x the weather (`stage.wave`: wind strength,
storms heap it up to 2.3x, rain flattens it, a calm takes 75% away). With rough water (`WATER.rough`: storms, dread) the swell
blends into long dark rollers. The same function runs on the GPU (the water) and the CPU (the ship, fauna, bobbers).
The ship samples four points (bow, stern, both sides) and follows them through springs (`Ship.place`, `this.float`).

## World hints (secrets.js)
`Secrets.roll(d)` decides per island (cached on the desc, rolled with its own hashes so nothing else moves): `tide` (wreck
angle), `camp` (camp angle), `watch` (harbours). `update()` builds meshes for loaded islands and removes them as they unload,
moves the smoke column to the nearest smoking camp (`smoking(d, dayN)`), shows watchers 17:36-19:36, runs one bird flock.
`near()` gives main.js an interaction (kind `secret`): `secretFound()` applies it (state.collected 'kestrel' / 'tide:<id>',
state.story.secrets camp visit counts). `taleAt(d)` (main.js) tells the pier tales (state.story.tales). The Kestrel spot is
found at start in clear water near (100,120) with each post 55 toward its landmark. Daymark rocks are solid (`solids`).
Noon shadow: world.js sets `desc.puzzle.shadow` (beach facing so the noon shadow falls seaward, dread < 0.3, 70%); main.js
passes `sun()` and `noon` to `digGame.start`; digging.js places the arch so the noon tip falls on the chest.

## Handling, wakes, light and the shops (later passes)
- **Handling** (`Ship.update`): the rudder needs flow (`0.08 + 0.62 * speed/5`), yaw builds and dies away (`this.yaw`), the
  keel kills sideways speed (lateral decay 5.5/s), wave slope costs or gives speed, hard turns drag, leeway from the wind.
  **Float** (`Ship.place`): height, pitch and roll on damped springs (`this.float`), bow lift, heel, squat, bow spray on a drop.
- **Wake** (`wake.js`): a trail of stern points opening into a V, a churned strip and a bow wave; one per ship (traffic too).
- **Water** (`ocean.js`): wave height = swell x sets (`G`) x land factor (`seaScale` / `landNear`) x weather; styles
  `OCEAN_STYLES` (default 5, Chop facets) via `uOcean`; shores (breakers, seabed, fish shadows), rain rings (`uRain`), gusts
  (`uGust`), glints that twinkle in place inside the light's path.
- **Night and lamp** (`daynight.js`): `NIGHT_VIEWS` (far + light), `LAMPS`; main.js `nightMode` (0 = moon phases: each night a
  new or a full moon from the seed), `ship.lampK`; a lit lantern adds 15% view per level at night/fog; L puts it out
  (`state.story.lampOff`). Weather only darkens (no light floor).
- **Storms** (`weather.js`, `sky.js`): softer darkening, lighter horizon; the storm wall (`fx.stormWall`) rises upwind.
- **Shops** (`renderHarbour`): shipwright cards from `UPGRADES` + `UP_CARD` (icon, stock, opens tags); `upFlash` for the buy
  flash; `#hbWide.shop` widens the panel for the shipwright and market.


## Harbour life (why visit every harbour)
Errands alone make every harbour the same. Each harbour adds: a resident whose four-step story ends with a lasting change
(prop by the pier), a house dish with a one-day buff, a named weekly event that doubles its local game, a local game by
village style, and one fragment of the old story. Gossip carries what you did to the next harbour. Pacing: one resident
step a day per harbour, one game a day per harbour, one dish at a time, so a round of several harbours always has
something to do in each. See PROGRESS.md "Harbour life" for the list.

## The slip, the anchor and sailing time (2026-11-11)
- **The slip** (`slipInfo` in `main.js`): what, where, which way and how long. Shown as the HUD tracker, as the first entry on Orders and in the chart's side panel. A goal with one place (`goalTarget`: landfall, the first riddle, Perrin's letters, an errand in hand) gives the place, a bearing and a time; any other goal gives its `where` line from `MAIN_GOALS`. One extra line when the course is into the wind.
- **Sailing time** (`etaText`): distance / (8 x the sail upgrade's speed), or / 2.6 under oars; "under a minute" below 45 seconds. It is an estimate at cruising speed, not the speed at that moment.
- **The anchor** (`ship.anchored`, `anchorTick`): E at a shore, wreck, landmark, cave, thread or for a patch (`HEAVE_KINDS`) works under way: the hull stops in a few lengths (speed decays at 2.6 per second, sail comes in) and the action then starts by itself. While a dig, salvage, patch or fishing line is on, the ship is pinned to where it stopped. Secrets (`secrets.js`) are the exception: they only show when you have stopped by yourself.

## The end of a voyage (2026-11-11, `src/table.js`)
- The Table by the Water (a landmark at the Lid) shows once three questions have a second source (`d3Open`). Going ashore opens one card with up to four choices (`tableOptions`): throw; hum the tune (`hum` known); sit (question 3 at level 3); leave (`state.story.kept`, or at most one hut throw).
- `finalThrow`: the face, plus `bookWeight` (earlier throws: +1 for 11 and over, -1 for 9 and under, halved and capped at 3; the `lamp` capability halves a negative weight; a natural 1 or 20 stands). 20 is the Long Sleep, 10 to 19 Good Dreams, 1 to 9 She Rises.
- `showEnding` puts the ending on a black card and stores `state.story.ending`. After the Long Sleep, Good Dreams or the tune the ship is set off Tama in the morning with dread cleared; She Rises runs `abyss.startEnding()`.
- `maraRemembers`: four lines, each at least 90 seconds of sailing after its condition (a bell clue; two regions seen; the Sunken Street; the Table showing). Not in the demo build.

## Four small wrong things before the hut (2026-11-11)
| Flag in `state.story` | When | What |
|---|---|---|
| `berths` | the first passenger dropped off | the fare doubles, "two berths", the harbourmaster asks for the other one |
| `hook` | a night catch from the second fish on, or the sixth fish | a hook already in its mouth; the fishmonger's line when sold |
| `predug` | the second treasure beach | one hole there already, over the chest (`digging.js` `predug`) |

