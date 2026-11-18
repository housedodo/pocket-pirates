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
| `table.js` | The Table by the Water: what can be done there, the last throw and the book's weight, the six endings and the endgame's lines; Mara's village returning in four pieces |
| `systems/endgame.js` | What the endings leave behind: the arrival ritual and the copy of the voyage, closed voyages (Begin again / Go back to the table), the guitar errand, the Unseen Throw's turn, Your Seat's epilogue |
| `clues.js` | The clue ledger: 17 clues, `state.story.seen`, derived question levels, capabilities (`isKnown`), `d3Open` |
| `gates.js` | What the interface lets you use, by main goal index and by clue |
| `places.js` / `landmarks.js` | The hand-made places: where they are, how they look, what a visit gives |
| `ship.js` | Procedural ship, wind-based sailing model, upgrade modifiers, wake, lantern glow |
| `float.js` | How every hull floats on the swell: plane fit under the hull, buoyant heave that follows the water's speed, limited pitch and roll |
| `wind.js` | Wandering wind: big heading swings over minutes + gusts, announced when it shifts |
| `daynight.js` | Day/night layered on the dread palette (11.5 min per day: 7.5 min daylight, 4 min night): sun, moon, stars, dusk colours, light level |
| `upgrades.js` | 7 ship upgrades x 3 levels (sails, rudder, lantern, spyglass, hull, cannons, crew), costs and effects |
| `lore.js` | Names, harbour gossip and loot that drift from cosy to cosmic |
| `audio.js` | Optional drop-in audio, cross-faded per dread stage |
| `objectives.js` | The main goal chain (sail, harbour, dig, ... hut), `Mate` (Mara's text box and pacing), gated side remarks, pending next goal with a gap |
| `tabletop.js` | Dice (one die, d20 checks with advantage/disadvantage, treasure quality throw) and the encounter card deck |
| `sighting.js` | Rare signs at sea that open an encounter card (optional, never part of a story) |
| `solids.js` | Round colliders for ships, boats, whales, wrecks, piers; `pushOut` keeps the hull out of them |
| `fishing.js` | Fishing mini-game, 10 species with habitats (luck + place + time, no visible markers); the Free Cays' dusk fish |
| `fishart.js` | The Catch book's pixel portraits of every fish (the Ship's book) |
| `jobs.js` / `passengers.js` | Delivery jobs, board, passengers; `nearby` respects the fog radius |
| `fauna.js` / `traffic.js` / `seafeatures.js` / `weather.js` | Wildlife, ships and scheduled events (market, regatta, migration), whirlpools and wrecks, weather fronts |
| `customize.js` | Shipyard: 360 turntable preview, paint, hull, flags, figureheads, try then buy |
| `combat.js` | Raiders, cannons (bought only, start with 8), hull as 5 planks |
| `greetings.js` / `hut.js` / `dice3d.js` | Villager greetings (one per day), the dark hut, 3D die |

Every island has a bright decor set and a "wrong" decor set (dead palms, glowing fungus, monoliths with eyes, a totem in town).
They swap at dread 0.5, and terrain colours blend to a second vertex colour set.

## Systems added after the slice
- **Upgrades:** buy at any harbour (E). Gold comes from treasure (+ crew bonus) and +15 per newly charted isle. Sails = speed and upwind ability, Rudder = turning, Lantern = night glow, Spyglass = view distance and zoom, Hull = hull strength, Cannons = damage and reload, Crew = dig speed and loot value. Lantern 3 (the beacon) also burns its oil x0.8 (`oilRate`, G-24): "keeps the dark back".
- **Wind:** direction swings up to ~150 degrees over several minutes, strength gusts 45-125%. Waves scale with it. The wind meter (dial / pennant / rose / windsock, chosen in the pause menu) shows where it blows, a green-yellow-red ring around it shows how well the ship's nose would sail in each direction, a cream marker is the nose, and an orange marker points at the tracked mission.
- **Day/night:** `DAY_LENGTH` in `daynight.js`. Windows, lanterns, fungus and eyes ignore the light level so they glow at night; the lighthouse beam gets stronger.
- **Pause menu:** Esc/P (also on tab blur). Simulation, time of day and audio freeze while any menu is open. A menu never ends a dig, a fishing line or a timed action: they wait under it and come back on close (`suspend`/`resume` in `fishing.js` and `digging.js`; G-01). A movement key held through a menu steers again from its first key-repeat (G-12).

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
- **First mate and goals** (`objectives.js`): Mara talks you through the main chain of 16 goals in six chapters, then Perrin's five letters after the hut (21 in `MAIN_GOALS`; the demo stops at the hut) (sea legs, landfall; the riddle, the first upgrade; dead calm, tacking, a delivery, a passenger, charting; the tavern, Perrin's note, his chart, the second riddle; bottles, gossip; the hut) and reacts to events (dusk, storms, raiders, rising dread; she gets more unsettled as it goes on). Seven optional side goals complete themselves. Y (pad: hold View) or the pause menu asks for a hint; goals can be skipped in the Goals tab.
- **Fishing** (`fishing.js`): C casts (under way the anchor goes down first and the meter starts at speed 2.5, `FISH_START_SPEED`), wait for a bite, hook it, then hold Space to keep the marker in the green zone. 11 species, harder ones later; dark species appear with dread and at night. Sell at harbours (reputation adds a bonus); fish log in the Journal.
- **Treasure riddles** (`lore.makePuzzle`, `world.js`): the chest is no longer marked. Each treasure isle's arch carries a riddle (sunrise/sunset/pole star/lone palm) naming the shore where the chest is buried. Study the arch (E), sail to the right shore, dig. Wrong shores cost a few seconds. Riddles also come from Perrin (the starter map) and are kept in the Journal.
- **Ship looks** (`customize.js`): hull paint, sail colour, pennant and figurehead (parrot, dolphin, mermaid, lion, skull) at harbour shipyards. Some figureheads are earned (catch fish, salvage a wreck, earn 3 stars, sink a raider).
- **Combat** (`combat.js`, strictly optional): only some Reef Brotherhood ships are raiders. They chase when you are close, circle and fire; you can outrun them, parley (pay tribute, bluff) or fight. Space auto-aims a broadside at the nearest raider; while a raider is engaged Space only fires (Enter or a click move Mara's line on), and a Space up to 0.25 s before the reload ends fires when it ends (`FIRE_BUFFER`, G-07). Hull strength and cannon upgrades at the shipwright; cannonballs from harbours or wrecks of raiders. If your hull goes, you wake up at the nearest harbour with 25% less gold (no game over). A raider's shot has a tell (G-22): 0.7 s before
  she fires, a small puff at her gun side, and she holds her turn until the shot. Under half her hull she lists 6 degrees and trails a
  thin smoke; under a quarter she runs (her slow speed, turned away, no more shots). No bars, no numbers.

## Commissions, fruit and the log (second pass)
- **Commissions** (`jobs.commissionsFor`): each harbour board posts a delivery plus two errands, up to 3 held at once: catch specific fish, bring a fruit, recover floating crates from a marked search area, sink raiders, spot dolphins/whales. Hand in at the board (Board tab); rewards also build reputation.
- **Fruit** (`fruit.js`): jungle and sandbar islands grow one kind each (fruit is visible on the island). E picks 2-4 (once per in-game day per island). Sell at the Market or use for commissions.
- **Captain's log** is an open book with three bookmarks: Chart, Orders (the slip, errands in hand, riddles, rumours, optional goals, what is done) and Ship's book (journal, fisherman's log, ship, standing); short entries over two pages, page turn with the arrows.
- **Wind** (no toast when it shifts: the ring shows it; G-32, owner 2026-11-16; and none at a region's line, where the place line names the sector) is shown as a wooden dial with a cloth streamer (gusts make it snap), a word like "Fresh breeze" instead of numbers, and faint wisps drifting across the sea. Gusts add a few degrees of wobble within the prevailing direction.
- **Camera** orbits the boat (drag sideways, Z/X) and eases back behind it after a few seconds. Zoom by wheel, - / = or the pad's
  right stick (x1.6 a second, `ZOOM_RATE`, G-15); R / F tilt down to `PITCH_MIN`. The look point runs 0.2 x zoom ahead at rest and
  0.32 at full speed, eased 1/s, never more when anchored (`LOOK_*`, G-16). When a hill hides the deck from the lens (low tilts, the
  stern to a hill village) the tilt rises up to 0.25 over 0.5 s and settles back (`OCC_*`, G-27). Constants at the top of `ui/camera.js`.
- **Input** (`src/input.js`, `src/gamepad.js`, 2026-11-16, G-02, G-11, G-18 to G-20): every action has one remappable key
  (Pause > Settings > Keys, press-to-set, swaps on conflict; Esc, P, Enter, arrows, digits and F-keys are fixed); a remapped key is
  turned into the action's default code before the game sees it, so the game reads only defaults. `settings.keys` holds only the moved
  actions (an old settings file has none). The text the player reads ("[E]", "press C / Space", "(S)") names the player's key, or the pad's
  button once the pad was the last thing used (a key press switches back). Rumble (Pause > Settings > Display, off under reduced
  motion): bite, catch, hit, coral, the anchor biting, the sail-strain warning; never for a horror beat (`RUMBLE` in `input.js`).
  Controller (standard mapping):

  | Pad | At sea | In a screen |
  |---|---|---|
  | Left stick | steer by angle (dead zone 0.15, power 1.5), sails past 0.55 | move the focus (a slider: left / right set it) |
  | D-pad | arrows (steer, sails, the dig grid) | move the focus; at the edge, the screen's own arrows (pages, tabs) |
  | A | interact (E) | press the focused button |
  | B | nothing | back one level, then close |
  | X / Y | fishing (C) / the log (M) | - / the log (M) |
  | RT / LT | strike, fire, go on (Space) / oars (G) | throw, roll, go on (Space) / - |
  | LB / RB, right stick X | look around (Z / X) | previous / next tab or bookmark |
  | Right stick Y | zoom (down = out) | - |
  | View | tap: tracker (Q); hold 0.6 s: ask Mara (Y) | - |
  | Start | pause | close the pause |
  | Left stick press | lamp (L) | - |

  The tavern games read the pad as keys: A or RT play (Space), X / Y bid / let go (1 / 2), B leaves. A button or stick still held from
  the screen before waits to be let go (the stick at sea steers again at once). Tuning: `PAD_TUNE` in `gamepad.js`.
- **Mara** types her lines out letter by letter with a bobbing portrait; click or Enter skips; the next goal is announced a few seconds after she finishes.

## Dread stages
**Stage n = `stageOf(dread)` + 1** in every doc (owner, 2026-11-16, G-31): `stageOf` (`palette.js`) cuts dread into fifths, 0 to 4,
so stage 1 is dread under 0.2, stage 2 under 0.4, stage 3 under 0.6, stage 4 under 0.8 and stage 5 from 0.8. The debug line prints the
same number. Where a rule cuts somewhere else, the doc gives the dread number, not a stage: Mara's moods cut at quarters (0.25, 0.5,
0.75, 0.95; kept, owner 2026-11-15), the Cays' night quiet holds dread under 0.45 (`lullaby.js`), the lost sailors start at 0.6
(`lostsailors.js`, stage 4).

| Stage | Dread | Name | Feel | World signs |
|---|---|---|---|---|
| 1 | 0 to 0.2 | Home waters | sunny, saturated | gulls, shanties |
| 2 | 0.2 to 0.4 | Off | paler, quieter | NPCs repeat themselves |
| 3 | 0.4 to 0.6 | Wrong | green haze, desaturated | glowing fungus, standing stones, odd names |
| 4 | 0.6 to 0.8 | Eerie | fog, dusk, black flag | dead palms, lit empty windows, magenta lighthouse beam |
| 5 | 0.8 to 1 | Cosmic | black sun, eye in the stars | chromatic split, screen wobble |

## Quiet start, intro and quest cue (newest layer)
- **Intro:** a new voyage plays a 9 s cinematic (`INTRO_DUR`, letterbox bars, camera eases down behind the boat; Esc/click skips). Not for continued saves, `autostart`, `nomate` or `x=`; force with `?intro=1`.
- **Quiet start:** `onbAll()` / `onbQuiet()` / `laterOK()` in `main.js` hide HUD pieces (`ONB_KEYS`, class `.onb-off`, revealed with `.onb-pop`) and hold back everything that is not the current tutorial goal. `onbQuiet` = goals before index 2 (no discovery toasts, land ho, villager text); `onbAll` = HUD complete (goal 3+); `laterOK` = goal 9+ (dolphins, sightings, lighthouse tidbits, market/regatta, side goals). New ambient content should check `laterOK()`.
- **Mara's pacing:** `Mate` holds a line 3.2 s + 0.065 s per character, 1.4 s between lines. Goals have `intro` (array or `function(c)`), `outro`, `waitMate`, `count` ("(x/y)"). Next goal waits a `gap` (8 s early, 5 s later).
- **Quest cue:** `questCue` shows QUEST COMPLETE at once; `questNew` (called by Objectives when the pending goal is released, i.e. when Mara announces it) shows the NEW QUEST card, tracker entry and compass ping.
- **Letters:** Perrin's letters are picked up from the Board sign icon (`story.letterP1/P2`), Mara asks about them and marks the log tab (`story.tabMark`).
- **Demo build:** `__BUILD==='demo'` has no dread, no spoilers, a second harbour (Velto), fog gate radii in `GATES`, and ends at the next harbour after the first hut throw is remarked on; nothing unlocks afterwards. It ignores `?dev`, `?dread` and `?threads`, wakes no thread, keeps no clue ledger (`markSeen` and `isKnown` do nothing), and only the seven early hand-made places exist (`lmHere` in `landmarks.js`; the others are open water).
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
  Forgiveness (G-06): a strike counts if the needle was on a green or gold mark up to 60 ms ago or will be within 60 ms at its
  speed (`STRIKE_TOL`; never on a red snag); C in the wait holds 0.25 s (`EARLY_HOOK`) and hooks a bite inside it, otherwise the
  line comes in. A water's tip is shown the first two times (`state.hints['tip:ring:<kind>']`), then only its name (G-21).
- **The water changes the fight** (`RING_KINDS`): wreck water (red snags), night water (fading marks), heavy swell
  (surging needle), deep water (hold, do not tap; line strain), reef water (darting marks), calm. See PROGRESS.md.
- **Beaches** (`BEACHES` in digging.js, `o.beach`): sand, shingle (stone counts), dunes (holes fill in), mud (no tide,
  squares sink). Chosen per treasure isle from `hash2(d.seed, 41, 3)`.
- **Digging: probing the shore** (`digging.js`, treasure only, right shore only; a wrong shore is still a short dig that finds sand):
  the beach is an 8x5 grid; dig a square (click, or arrows / WASD and E / Space; the ship stays put meanwhile) and the sand shows how
  close the chest is, darker and wetter = closer. Hidden stones crack the shovel (two break it) and the tide creeps up with every dig
  (10 digs, 13 for Perrin's first chest, more with shipwright upgrades and the dig buff). Fails: the tide floods the beach, or the
  shovel breaks; the crew needs about 6 s, then a fresh try with the chest somewhere else. Dread: some squares lie about the damp.
  Holding E 0.8 s on the beach packs the crew up (`DIG_LEAVE_HOLD`, G-10): the prompt bar fills, and it counts as a failed dig
  (6 s, the chest moves, `attempts` +1). A beach's rules are told the first two times that kind is met (`tip:beach:<kind>`), then nothing (G-21).

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
`?econ=1` (G-25, `systems/econ.js`): the economy meter. It books every gain of gold to a source (delivery, passenger, commission,
salvage, bounty, treasure, places, relight, fish, fruit, oil, goal, other), read off what else changed in the same frame, and shows gold
per hour of game time on the debug line and in `window.__game.econ`. Never in the demo or the full playtest build (its flags are ignored).

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
  `state.story.lm` (day of last visit). `labelsTick` draws a far label over each hand-made place between 70 and 170 + 110 x spyglass
  units: "?" by eye, the sight word through a spyglass, the name once visited; it fades with the fog and hides when the HUD does
  (kept by the owner, 2026-11-16, G-29). The Table's label shows from `tableOpen` (one throw, or three questions), the same test as
  going ashore there (G-26). Places that are not in this build (`lmHere`) have none.
- **Sea play** (`seaplay.js`): three `LANES` (`ROUND` is gone), faded out near any fog by `fogEdge`; `currentAt(x, z)` is the drift (used for the ship and the foam).
  Gusts set `ship.gust` (a speed factor in `Ship.update`). `state.story.lanes` remembers currents met.
- **Glimpse** (`glimpse.js`): `k` 0..1 over seventeen seconds (the diver is in view about eleven of them, at 0.95 scale); main.js applies it to the wind, `stage.wave`, `audio.hush`,
  `fauna` (`ctx.freeze`) and `world.stare`. Starts once (`state.story.glimpse`) while `demoEnd === 'pending'`, 45 s after you are 150 away from the hut.
- **The Edge** (`systems/edge.js`, look in `systems/edgeworld.js`; played since 2026-11-16, CANON): once a voyage (`state.story.edge`, the day),
  full game only, when the dread reaches 0.9 on open water with no calm, no menu, no fog and no island on the lip or in the way
  (`clearFor`, from the cell descriptors). The lip is met `EDGE.AHEAD` ahead, square to the bow; the sea past it is clipped and
  islands out there are hidden while it runs. The helm, sail, oars, lamp and camera are the player's throughout. Each frame
  `edgePull` moves the ship towards the lip (`C_FAR` thinning to nothing at `PULL_R`, plus `C_EDGE·(1-d/PULL_R)³`, growing by
  `HUNGER` between `T_HUNGER`) and, past `LIP_HALF - 150` along it, back towards the middle; the wind turns to blow over the lip
  (`rt.edge.windTo`, read in main.js), so getting out is a beat. Read, not told: foam dashes racing to the lip, the wind ring,
  the lamp's flame leaning to the lip, the sound going (`rt.edgeHush`, 0 at `PULL_R`, `HUSH` at the lip). Each thing in the
  dark is its own mesh, revealed by how near the ship is along the lip (`REVEAL`); the pillars are scaled with their distance
  so none gets smaller; each thing, looked at (`LOOK_T`) and then out of sight (`AWAY_T`), is changed once (the hood turned a
  little to where the ship was, the other eye open, a storey more, a pillar more, an arch fewer). At the ends of the stretch
  the fog closes white (`edgeFog`). Out: past `EXIT_D` (it has faded with the distance); over: within `OVER_D`, the stepped
  white `#fade`, then the ship `REWIND` back, heading for Tama, sail slack. `state.story.edgeWay` = 'over' | 'out'
  (`edgeWay()` reads old saves as 'over'); nothing reads it yet. `state.story.edgeRun` (lip, heading, time, changes) lets a
  save made mid-way pick it up again. Dev: `__game.edge()`.
- **Quiet window** (`main.js` `eventQuiet`, `Mate.hush`): no random remark, musing, passenger chatter, thread line, market/regatta/whale comment, lamp or tide warning, or village memory from Mara or anyone else while within ~400 of the hut (about 30 s of sailing), from the first throw until the diver has gone, and for 30 s after the hut or the diver (live time). Quest intros/outros and the throw's own lines are not touched.
- **Pins**: `state.story.pins` ([{x, z, on}]); `trackTarget` follows the one that is `on`.

## Lamp oil (`oil.js`)
`OIL_FROM` (main goal index), `oilCap(upgrades)`, `oilRate(ctx)` and `lanternLit(ctx)`; main.js `oilTick` burns it,
warns, and sets `lampOut` (ship glow off via `ship.lampOut`, scene fog pulled in and darkened, fishing blocked). The
Market's LAMP OIL row and Wick's Rock refill it. Tune the burn in `oilRate`, the price in `OIL_PRICE`.

- **The flame** (2026-11-14, L6): while the lantern burns, `flameShape(dread)` (`oil.js`) gives the flame's height and lean from the same dread term as the burn; `oilTick` puts it in `rt.lampFlame`, `ship.js` draws it. No meter, no text; in the demo it is always upright.

## Torn sails
`sailTick` in main.js: strain grows only in a real storm (`weather.storm > 0.6 && windNow.strength > 1.0`) with `ship.trim > 0.55`,
decays otherwise; warning at 35% of `SAIL_LIMIT` (20), tear at 100% (about 12 s at full sail in a full storm). `ship.torn` multiplies the speed target by 0.66. Mending:
a patch kit (`getInteract` kind `patch`, above fruit and hails, anywhere at sea) or docking at a harbour (`mendSails`).

## Lost in fog
`fogLost(dt)` in main.js: when `gateLost` (past `gateRadius`) or `places.lost` (inside an unopened fog bank) is set, `lostK`
rises to 1: steering and sail input are ignored, heading eases toward the way out plus a slow weave, trim settles at 0.45,
speed toward 3.2, and a small outward drift. The scene fog closes to ~10 units. `fogEdge(x, z)` (0 near fog, 1 in clear water)
scales the currents (seaplay.js) so they never lead into fog.

- **Steering by the tune** (2026-11-14, L9): lost in fog with `hum` known, `fogLost` sets `rt.tuneWay` (the bearing of the way out); the night stems pan to it (`tunePan`) and the pennant points at it. No text.

- **Home is gentle** (2026-11-14, L4, `src/systems/home.js`): `homeShift` removes a low throw's added dread inside Home Sound (450) and gives it back by 600; `homeTick`/`homeLook` lay the swell down to 40% within 260 of Tama while the noon bell swings (in the demo too). No text.

- **`arrivals`** (2026-11-15, G3): once clue `CL-C1-a` (the Customs ledger) is seen, a Crown harbour's record row (`recordMarks`) ends with one more tick, faint: the next line, written before it is earned. No word; nothing shows without the clue or in the demo.

- **What they kept comes back** (2026-11-15, L8): `drownedTake` stores what a Drowned harbour keeps in `state.story.drownedKept` (the newest 12). Past dread 0.88 (`abyss.k` 0.2) the next catch returns a kept fish, the next loot a kept fruit or treasure, the very one, once (`keptBack`). Nothing but its own name; never in the demo (no deep).

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
- **The anchor** (`ship.anchored`, `anchorTick` in `src/systems/interact.js`, with `getInteract`, `tryInteract` and `goAshore`; the interaction is computed once a frame into `rt.tg`): E at a shore, wreck, landmark, cave, thread or for a patch (`HEAVE_KINDS`) works under way: the hull stops in a few lengths (speed decays at 2.6 per second, sail comes in) and the action then starts by itself. While a dig, salvage, patch or fishing line is on, the ship is pinned to where it stopped. Secrets (`secrets.js`) are the exception: they only show when you have stopped by yourself.
- **What E answers to** (2026-11-16, SYSTEMS_FEEL G-03, G-04, G-13, G-14; numbers at the top of `interact.js`): priority is hut > sighting > cave > spring > thread > harbour pier > secret > landmark > treasure > wreck > patch > hail > fruit > dead light > "sail to the pier" (a hint, last). A running action keeps its own target until it ends: another thing coming in reach never cancels it, only the ship being moved more than its range + 8 from where it began (a sinking, a jump). The last thing in reach stays E-able for 0.6 s while the ship has gone no more than 6 further (`E_GRACE_T`, `E_GRACE_D`; never a harbour pier); while the anchor goes down the target holds over 8 more units (`HEAVE_HOLD`); an E with nothing in reach waits 0.25 s for something (`E_BUFFER`). No "bring the ship to a stop" toasts: on a plundered isle or at a secret under way E simply does nothing. C under way drops the anchor like E (G-05).
- **Docking** (G-09): visiting a harbour lays her alongside: speed 0, sails in; W raises them again.
- **Selling** (G-08, `sellable` in `jobs.js`): Sell fish / Sell fruit (and the floating market's Sell all) keep back what the errands in hand need, per species and per fruit up to their count (the cheapest fish are kept); the row says "kept for your errands" when nothing else is aboard. The Drowned's keeping is unchanged.
- **Sailing through things** (G-17, `seafeatures.js`): a barrel or an errand crate is picked up within 6.0 (`PICK_BARREL`, `PICK_CRATE`), a bottle within 6.5.

## The end of a voyage (2026-11-11, `src/table.js`)
- The Table by the Water (a landmark at the Lid) shows once three questions have a second source (`d3Open`). Going ashore opens one card with up to four choices (`tableOptions`): throw; hum the tune (`hum` known); sit (question 3 at level 3); leave (`state.story.kept`, or at most one hut throw).
- `finalThrow`: the face, plus `bookWeight` (earlier throws: +1 for 11 and over, -1 for 9 and under, halved and capped at 3; the `lamp` capability halves a negative weight; a natural 1 or 20 stands). 20 is the Long Sleep, 10 to 19 Good Dreams, 1 to 9 She Rises.
- `showEnding` puts the ending on a black card and stores `state.story.ending` (with `face`, the die's own number, after a throw). After the Long Sleep or the tune the ship is set off Tama in the morning with dread cleared; Good Dreams changes nothing (the ship stays where it is, dread and all). What each ending does after that is `src/systems/endgame.js` (owner, 2026-11-18; below).
- **The arrival** (`ritualTick`, `ritualLook`, `tableGctx`): within 340 units of the Table (it standing, no ending yet) `rt.tableK` rises to 1 at 50 units. The six candles on the 3D table light one by one with it, the fog draws back (to 460), `audio.hush` takes up to 0.75 of the sound (`rt.tableHush`), and `eventQuiet` holds Mara's remarks and the small talk from 0.15. Someone sits in the far chair (3D and painted: the first time she is seen). On going ashore the voyage is copied aside (`snapshotTable`, localStorage `pocket-pirates-table-v1`, the save's own shape via `G.saveData`). The card is `ARRIVAL` in `table.js`.
- **The drawing** on the table (3D props and the painted card, `tableDrawing` in `cavescene.js`): a ship going down a hole if `state.story.edgeWay === 'over'`, else the Edge alone and three questions in a crude red 3x5 hand.
- **Closed voyages** (`state.story.over`: `rises`, `unseen`, `sit`): no Keep sailing. The ending card has only "Go on"; then a still and the two ways back (`gameOver`): **Begin again** (save and copy erased, a new voyage) and **Go back to the table** (the copy becomes the save; Set sail continues on the Table's sand). The title shows the same two in place of Set sail / New voyage (`overTitle`); a test run with `autostart` goes straight to the still. `rt.over` stops the world (`live`).
- **She Rises**: `abyss.startEnding(true)` plays the Eye's sequence to the white, and nobody wakes (`onFinal` -> `gameOver('rises')`, a still of the lit sea with only the die on the sand). Going back to the table writes `story.again = { n: face }` into the copy: the next arrival card adds Mara's `AGAIN` line once, and the throw shows the same face (`tableThrow`).
- **The Tune Is Kept**: `story.guitar = 'waiting'`; the slip shows `GUITAR.what` / Tama's quay (`guitarTarget`, ui/hud.js) until the ship docks at Tama (`guitarDock`, systems/interact.js): `'aboard'`, a toast and Mara's line. Aboard, at night (`tod.night > 0.4`) `rt.guitarK` eases to 1; the dread target is multiplied by `1 - guitarK` (after the Cays' quiet), so the night has none. Its sound is a placeholder: the Free Cays night guitar (`fc_night`, Teo's), guitar-only episodes with short rests, anywhere (`layers.js`, `s.guitar`); its silent twin is the guitar propped by the starboard rail, with a lamp and a pool of warm light and a small sway while it plays.
- **The Unseen Throw**: `story.unseen.t` counts sailing seconds; after `UNSEEN_AFTER` (240; `?unseen=N` shortens the wait and the turn in tests) the dread target is at least `unseenK * 0.93` for `UNSEEN_RAMP` (150) seconds, wherever the ship is (the one sanctioned exception to "dread follows place"; capped below the Eye's own clock). Taken away, each once: no new ships (`traffic.none`), Tama's noon bell (`bellsStopped`), Mara's talk (`endQuiet`); at 0.3 a line in the Ship's book "in a small neat hand" with a number from 1 to 9 and one toast; at 0.65 Mara asks where everybody went. At 1 a table stands on the water ahead (a candle, someone in the far chair, the near chair pulled out); lost sight of, it is ahead again, nearer (120, then x0.7, at least 30). Within 14 units: dark, `gameOver('unseen')` with three lines.
- **Your Seat**: "Go on" runs `startSeat`: the book (`paintStill('book', n)`: 26 pages of rows, tallies and little ships, each page its own, turning faster; nothing readable; the only time it is seen open), then the hut from the far chair (`'seat'`: the door open on the evening, a ship with green sails, someone in the doorway) and the five `SEAT` lines one by one; "Go on" rolls the credits. `story.over = 'sit'`.
- The Long Sleep is as it was (its consequence is the owner's to decide).
- `maraRemembers`: four lines, each at least 90 seconds of sailing after its condition (a bell clue; two regions seen; the Sunken Street; the Table showing). Not in the demo build.

## Small wrong things before the hut (2026-11-11; four, three since the third oar was cut on 2026-11-12)
| Flag in `state.story` | When | What |
|---|---|---|
| `berths` | the first passenger dropped off | the fare doubles, "two berths", the harbourmaster asks for the other one |
| `hook` | a night catch from the second fish on, or the sixth fish | a hook already in its mouth; the fishmonger's line when sold |
| `predug` | the second treasure beach | one hole there already, over the chest (`digging.js` `predug`) |

## Regions you can tell apart (2026-11-13)
Each of the five regions has its own light (sky, haze, water, sun, view distance, how rough the sea runs; `systems/regionlook.js`) and
its own things on the water round its islands (`regiondecor.js`): Crown buoyed lanes and signal masts, Free Cays stilt houses and
lantern strings, Reef coral heads in breakers, Lantern lamp rows and dark towers, Drowned roofs and a belfry. Crossing between them
blends slowly in space and time. For now this is the look only: the shapes have no collision and change no rules. The gameplay half
(regional earning, risks and rhythms that the looks are meant to announce) is proposed in `docs/proposals/REGIONS.md`.

## Regions that play differently (2026-11-13, `src/regions.js`)
| Region | How it plays | Numbers |
|---|---|---|
| Crown Traders | Deliveries from Crown harbours have a deadline ("by 14:30"; the destination's mast strikes a pennant an hour, M-CROWN-1 below); a shared record of arrivals at every Crown harbour (ticks and black lines on the board); customs cutters come alongside once and look in the hold; sailing in between the buoys is a clean arrival | on time 1.45x (up to 15 s past the deadline still counts: `onTime`, G-33), late 0.55x; deadline distance / 6 + 60 s; +5% pay per clean line up to +25%, -15% per black line; three clean in a row wipe a black one; clean hold +5g, dark cargo taken and a black line; customs 15% of Crown ships |
| Free Cays | Raiders only by day; the stalls open after dark and pay more; the harbours sleep by day (M-FREE-1, below); swordfish, cuttlefish and moonfish come into open water at their hours | raiders 10% of spawns by day, 0 at night; night market 1.4x fish and fruit; dusk fish 2x |
| Reef Brotherhood | Wrecks pay more; a bounty for raiders sunk there, paid at any Reef harbour; coral heads are rock; the shoals are laid out again each dawn; a storm brings a wreck up, gone at the next low water; powder and sailcloth cheap | salvage 1.5x; bounty 40g; coral 6+ hull and the ship stops; ammo and patch kits 0.6x |
| Lantern Guild | Fish dear; the Guild buys lamp oil; half its lighthouses are dark at night, relight one with 30 oil for pay and the local chart; the lamp burns half near a lit light and double in the open dark | fish 1.5x; oil 0.9g a unit (Tama sells at 0.42); relight 30 oil for 30g; lighthouses on 85% of its harbours, 60% of its rocky isles |
| The Drowned | A shoal belt (1740-1800 from Tama) only open at low water: at high water it throws you back (an outward push of 12 units/s dying over 1 s, the ship's way cut to x0.2; G-23: water, never a snap) and scrapes the hull; its harbours take no coin, fill the lamp, the kits and the hull once a day and keep one thing from the hold | belt opens below tide -0.3; 5 hull a scrape (full game only) |
Every region has a harbour in its Shoals (about 620 out) and the Lantern Guild a second one (about 950), planned per seed (`world.js plannedHarbours`). Crown towns pay 1.5x for fruit.

## Regional mechanics and puzzles, first set (2026-11-17, owner: "build the suggested puzzles"; `docs/proposals/REGIONAL_CATALOGUE.md`)
Each is read from the world, never said; every number is a named constant in `src/regions.js` unless named here. "Demo" means it is in the demo too.
| ID | Rule | Numbers | Files |
|---|---|---|---|
| M-HOME-1 Noon slack (demo) | From 11:30 to 12:30, within the bell's reach of Tama, the noon hush holds for the hour: the swell lies down, no new gust patch forms, the Sound's current lanes run at half strength (their foam fades with them). The bell still swings once at noon. Independent of the bell's stroke count (B-12). The seabed showing in the shallows is not built (design's, `seawater.js`). | `SLACK_FROM` 11.5, `SLACK_TO` 12.5, `SLACK_LANES` 0.5; reach `BELL_REACH` 260; eases in at 1.2/s, out at 0.4/s (`rt.homeSlack`) | `systems/home.js`, `seaplay.js` (`curMul`), `systems/storybeats.js` |
| M-HOME-2 Fishers' marks (demo) | Three marks a seed in Home Sound, each where two tall things line up (Tama's lighthouse, Wick's light, the Grey Tooth, the Drowned Bell, Hollowgreen): on the line through them, past the nearer one, at the most open point inside the Sound, never on the Kestrel's two lines. A Tama or Velto fishing boat sails out at 04:30, lies at anchor on each from 06:00 to 15:00, and is in by 16:30 (put away only when the ship is more than 150 off). Within 12 of a mark the bite wait is x0.7 and snapper, bream and grouper bite as if in their own water, at their hour (grouper as at low tide). | `MARK_R` 12, `MARK_WAIT` 0.7, `MARK_FISH`, `MARK_OUT` 6, `MARK_HOME` 15, `MARK_SAIL` 1.5; in `homemarks.js`: 60 to 260 past the near thing, 410 from Tama at most, 35 open water, 120 apart, 40 off the Kestrel's lines, 60 off a harbour | `systems/homemarks.js`, `fishing.js` (`habitatFit` env.mark, `waitMul`) |
| P-HOME-2 The empty mark (demo) | M-HOME-2 after 15:00: the boats have gone home and the marks are free; anchor where a boat lay (the two things in line) and fish. Off the mark, ordinary fishing. | as M-HOME-2 | as M-HOME-2 |
| M-HOME-3 Gulls go home (demo) | Inside Home Sound the dusk gulls fly to Tama's harbour (dawn: out from it) instead of the nearest land, and cross water 60 off any shore (120 elsewhere; the Sound is crowded). Elsewhere unchanged, including the wrong way past dread 0.55. | `GULLS_HOME_R` 450, `GULLS_HOME_EDGE` 60 | `secrets.js` `updateBirds` |
| P-HOME-4 The Sunday race (demo) | Sunday with the ship in Home Sound: the passing regatta stays away (`traffic.holdRegatta`) and its five hulls gather off Tama instead: four racers hove-to beside a committee boat with a large flag, on the course to a rolled isle 150 to 220 from Tama that is not along the main pier. 14:00 the flag comes down, all make sail; each boat sails side of the isle, behind it, back to the committee boat, by a simple polar (x0.5 close to the wind). The captain races by passing the committee boat after the start (late is allowed until the first boat is in), rounding behind the isle, and passing the committee boat again: ahead of at least one boat, Tama's board shows one row, "The regatta purse", to collect. The fleet goes home at 16:30 and leaves the Sound. Not saved mid-race; once a Sunday (`state.story.raceDay`). | `RACE_DAY` 6, `RACE_GATHER` 13, `RACE_START` 14, `RACE_END` 16.5, `RACE_MARK` 150 to 220, `RACE_START_OFF` 60, `RACE_SPEEDS` 5.6 to 7.4, `RACE_START_R` 45, `RACE_ROUND_R` 40, `RACE_FINISH_R` 25, `RACE_PURSE` 30 + `RACE_PURSE_EACH` 10 (30 to 60) | `systems/race.js`, `traffic.js`, `ui/harbour.js` |
| M-CROWN-1 Pennants come down (demo) | While the ship carries a timed delivery to a Crown harbour, that harbour's signal mast flies one pennant per game hour left (up to six) and strikes one each hour; none left means late (the 15 s grace still applies). Other masts fly all six. | `PENNANTS` 6 | `systems/crown.js` `pennantsAt`, `regiondecor.js` (each pennant its own state prop) |
| P-CROWN-1 Rowing the lane (demo) | Rowing (G) up a Crown lane counts as coming in by the buoys, as it always did (`inLane` is position only). The first time, Mara: "Oars, Captain? In front of the whole town?" (`state.story.laneOars`). | none | `systems/crown.js` `laneOars` |
| P-CROWN-5 The line already written (full game only) | Once a voyage, after `arrivals` (CL-C1-a): the first timed Crown delivery offered that is at least 350 pier to pier shows its faint next line as a black mark instead of a tick, and stays that one offer (`state.story.lineAhead`). Taken, it keeps no grace: on time to the second it is a clean line, and a faint black mark struck through stays in the record row for good (`state.story.lineStruck`); late, the usual black line. Never in the log, never again. | `TIGHT_DIST` 350 | `systems/crown.js`, `regions.js` `recordMarks`, `ui/harbour.js`, `main.js` `completeJobIfHere` |
| M-FREE-1 Turned-round day (demo) | From 07:00 to 17:00 a Cays harbour sleeps: no passengers, residents, commissions, rumours, old stories or overheard lines; the board posts only deliveries out of the Cays, and an empty board reads "The quay is asleep. Come back after dark." While the main goal in hand is Earn your keep, Passage, Meet the locals, Ask around or Perrin's Free Cays letter, the Cays stay awake. By the hour in both builds. The sleeping figures on the quay are not built (design's). | `CAYS_SLEEP` 7 to 17, `CAYS_WAKE_FOR` | `regions.js` `caysAsleep`, `ui/harbour.js` |
| P-FREE-3 Lamp out to see the shore (demo) | At night, with the lamp lit, glowing things further than 150 from the eye (lit windows, lantern strings, lamps) burn at 0.55. With the lamp out (L, or no oil) for 2.5 s the eyes adjust over 1 s: they burn at x1.8 and carry twice as far through the fog, while the near dark closes in as before. Scaled by the night; nothing by day. Everywhere; it pays in the Cays. First time in Cays water at night, Mara: "Lamp out a moment. There. Lights." (`state.story.lampLights`). | `FAR_FROM` 150, `FAR_LIT` 0.55, `FAR_OUT` 1.8, `FAR_REACH` 2, `FAR_EYES` 2.5, `FAR_EYES_RAMP` 1 | `systems/farlights.js`, `psx.js` (`uFarLight`: glow texels and `mats.glow`; the fog on glow texels) |
| P-DEEP-1 Against the gulls (full game: there is no dread in the demo) | Nothing new: past dread 0.55 the dusk gulls fly away from the nearest land (built). With M-HOME-3 the lesson at home is reliable, so far out the way back is where they come from. | none | `secrets.js` |

### Reef, Lantern and Drowned: mechanics and puzzles (2026-11-17, owner: build the suggested puzzles; `docs/proposals/REGIONAL_CATALOGUE.md` 9)
Nothing here has a marker, a tutorial line or a HUD element; numbers are named constants in `src/regions.js` or at the top of the file.
- **M-REEF-1 Teeth under the tide** (`regiondecor.js`, `REEF_SLICK_TIDE` 0.4, `REEF_RING_TIDE` 0.7): the coral bites the same at any
  tide (speed above 1.2, `reef.js`); what shows follows the water. Up to 0.4 black teeth in white water; to 0.7 only the tips, awash
  in a pale-green slick; above 0.7 a faint ripple ring over each head (the floor: there is always a tell). Ghosting in under 1.2 is
  the safe way in at high water. Three tide states per head (`extra.states`), so the change is a step at the threshold.
- **P-REEF-2 Before the tide takes it** (`reef.js`, `STORM_WRECK_LOW` -0.5, `STORM_WRECK_WAIT` 60): built as it was; the two numbers
  are named. Once the tide has come in, the next low water takes a storm wreck, never while the ship lies within 60 of it; salvaged
  below tide -0.45 it pays x1.3, and x1.5 in Reef water.
- **P-REEF-4 The stake with no wreck** (`reef.js`, full game only, after the first throw; `state.story.reefStake`
  `{ x, z, w, risen, done }`): the first time the ship is in Reef water after the throw, a stake with a white rag is put in the most
  open water of a ring 180 to 480 ahead of her (`STAKE_NEAR`, `STAKE_FAR`), wanted 300 clear of every island (`STAKE_CLEAR`), never
  under 150 (`STAKE_CLEAR_MIN`); drawn within 520. Nothing solid, nothing to pick up, no E. The next blow in Reef water (storm over
  0.5) raises its wreck 7 from the stake (`STAKE_WRECK_OFF`) instead of near the ship; it salvages as any wreck, goes at the next low
  water as above, and the stake stays. Once a voyage (`done`). A saved voyage keeps a risen wreck.
- **P-LANT-1 Keep in sight of a light**: built as it was (`lampBurnMul`, `RELIGHT_OIL`); checked: at dread 0.3 the lamp burns about
  0.64 a second in the open dark of Guild water and about 0.16 within 260 of a lit light.
- **M-LANT-1 Every light its rhythm** (`systems/lantern.js`, `lightRhythm`/`rhythmOn` in `regions.js`): each lit Guild lighthouse
  (not the hand-made places) flashes one to three flashes, short 0.3 s or long 1 s, 0.6 s apart, every 6 to 10 s, from its seed
  (`RHYTHM_*`); the lamp room and its beam are on only during a flash, so a dead light (never on) and a lit one between flashes
  differ by counting. Within 45 (`RHYTHM_NEAR`) of a lit one, `state.story.rhythm[id]` is set and the chart inks the pattern beside
  the island, dots and dashes (`chartstyles.js`). Night and fog only (the lights are lit then).
- **P-LANT-3 The keeper's supper** (`systems/lantern.js`, `SUPPER_*`): at dusk (17:30 to 20:30) a lone Guild lighthouse rock (not a
  harbour, its light not dead tonight) has its keeper on the gallery, put there within 260. Within 120 he swings his lantern twice.
  Within 45, E (heaves to under way, `HEAVE_KINDS`): "Calling up to the gallery" 2.6 s, then a basket comes down on a line (2.5 s
  each way, 1.2 s at either end). With a fish aboard (the cheapest one no errand needs, `sellable`) it takes it, goes up, and comes
  down with a jar: +20 oil (to the cap). Without one it comes down and goes up empty, and Mara says once "No fish for the keeper,
  Captain?". Once a day per light after a trade (`state.story.supper[id]`). Lone lighthouse rocks are rare (one in the Lantern water scanned on the test seed).
- **M-DROWN-4 Low-water hours** (`drownedOpen`, `DROWNED_OPEN_TIDE` 0; `ui/harbour.js`, `regiondecor.js`): a Drowned harbour gives
  and keeps only while the tide is below 0 (about 172 s of each 345 s cycle). Above it a film of grey water lies over its pier and
  its market says only "The planks are under water. Nobody comes down." Docking is as anywhere. Full game only.
- **P-DROWN-2 A fish for the pier**: built as it was (`drownedTake` keeps a fish first, then fruit, then the newest treasure; the
  market row names what they will keep before you take it); with M-DROWN-4 the trade waits for low water.

## The Catch book (2026-11-13, `fishart.js`, `logbook.js fishLogHtml`)
The Ship's book's fisherman's log is a Catch book: one card per species with a pixel portrait. Caught: the portrait, the price, how many,
the best, where and when, what the quay told you. Heard of only: its shadow and the hint. Never met: a faint shadow and "? ? ?". The dark
fish get a card only once caught; the Colour's catch has no name. Header: caught / bright species (10).

## Harbours keep the main pier clear (2026-11-14)
Every harbour has a small side jetty about 40 degrees round the shore (`world.js d.jetty`). The moored rowboat and the harbour's fishing
boat tie up there; nothing is moored at the main pier, so the captain's ship cannot be pinned between the pier and a boat. Regional props
keep clear of the jetty and the boat's berth.

