# Pocket Pirates: design notes

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
| `logbook.js` | The tabbed captain's log, incl. the hand-inked low-poly parchment map (pan, zoom, sectors, rumours, job flag) |
| `ship.js` | Procedural ship, wind-based sailing model, upgrade modifiers, wake, lantern glow |
| `wind.js` | Wandering wind: big heading swings over minutes + gusts, announced when it shifts |
| `daynight.js` | Day/night layered on the dread palette (5 min per day): sun, moon, stars, dusk colours, light level |
| `upgrades.js` | 5 ship upgrades x 3 levels (sails, rudder, lantern, spyglass, crew), costs and effects |
| `horror.js` | Tentacles that rise between islands at high dread |
| `lore.js` | Names, harbour gossip and loot that drift from cosy to cosmic |
| `audio.js` | Optional drop-in audio, cross-faded per dread stage |

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
| Weather (`weather.js`) | showers, rainbow after rain | storms, fog banks, lightning that sometimes reveals a shape in the water |
| Night sky | shooting stars | they fall upward |
| Sea features (`seafeatures.js`) | salvage barrels, messages in bottles, wrecks to salvage (E), glowing shoals, whirlpools | stranger loot and notes, magenta glow |

Population is deliberately sparse (at most ~2 ships, a few gulls, rare dolphins/whales) so the sea feels big. Only about a third of harbours and a few lone crags have a lighthouse.

Other systems: **jobs** (delivery contracts from harbour boards, tracked on the compass), **rumours** (40g, reveals a treasure isle on your chart) and **harbour reputation** (visits and deliveries earn up to 3 stars = up to 15% off upgrades).
**Lighthouses** only shine when it is dark: the sun below ~7 degrees (about 17:30 to 06:30) or during a storm. By day the lamp is dark and the beam is off.
**Sound** is synthesised in `synth.js` (every cue, music included); real files override it per cue.

## Starter adventure (first mate, fishing, riddles, looks, combat)
- **First mate and goals** (`objectives.js`): Mara talks you through a short main chain (sail, make landfall, follow the riddle, spend your loot, deliver a job, chart 6 isles, cross into a new sector) and reacts to events (dusk, storms, raiders, rising dread; she gets more unsettled as it goes on). Seven optional side goals complete themselves. Y or the pause menu asks for a hint; goals can be skipped in the Goals tab.
- **Fishing** (`fishing.js`): C casts (slow down first), wait for a bite, hook it, then hold Space to keep the marker in the green zone. 11 species, harder ones later; dark species appear with dread and at night. Sell at harbours (reputation adds a bonus); fish log in the Journal.
- **Treasure riddles** (`lore.makePuzzle`, `world.js`): the chest is no longer marked. Each treasure isle's arch carries a riddle (sunrise/sunset/pole star/lone palm) naming the shore where the chest is buried. Study the arch (E), sail to the right shore, dig. Wrong shores cost a few seconds. Riddles also come from Perrin (the starter map) and are kept in the Journal.
- **Ship looks** (`customize.js`): hull paint, sail colour, pennant and figurehead (parrot, dolphin, mermaid, lion, skull) at harbour shipyards. Some figureheads are earned (catch fish, salvage a wreck, earn 3 stars, sink a raider).
- **Combat** (`combat.js`, strictly optional): only some Reef Brotherhood ships are raiders. They chase when you are close, circle and fire; you can outrun them, parley (pay tribute, bluff) or fight. Space auto-aims a broadside at the nearest raider. Hull strength and cannon upgrades at the shipwright; cannonballs from harbours or wrecks of raiders. If your hull goes, you wake up at the nearest harbour with 25% less gold (no game over).

## Commissions, fruit and the log (second pass)
- **Commissions** (`jobs.commissionsFor`): each harbour board posts a delivery plus two errands, up to 3 held at once: catch specific fish, bring a fruit, recover floating crates from a marked search area, sink raiders, spot dolphins/whales. Hand in at the board (Board tab); rewards also build reputation.
- **Fruit** (`fruit.js`): jungle and sandbar islands grow one kind each (fruit is visible on the island). E picks 2-4 (once per in-game day per island). Sell at the Market or use for commissions.
- **Captain's log** is now an open book: tabs for Map, Goals, Quests, Riddles, Rumours, Journal, Ship, Standing; short entries over two pages, page turn with the arrows. **Riddles** have their own tab.
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
| 5 | Cosmic | black sun, eye in the stars | tentacles, chromatic split, screen wobble |

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
- The captain's log has four book designs (button in the book's bottom bar): Scribbled journal (default; doodled cloth cover, ruled pages, wobbly Caveat handwriting), Pixel tome (dithered pixel cover and pages, Pixelify Sans with hard edges), Charcoal sketchbook (black boards, smudged paper, Gloria Hallelujah) and the low-poly leather book. Covers and pages are drawn on small canvases and shown pixelated; the messy ink is an SVG displacement filter.
- The original book is an old low-poly leather book (faceted cover, brass corners, page stack) with cloth bookmarks sticking out of its side; the labels are stamped into the cloth.
- The chart is drawn like a used sketch: wobbly double ink lines, watercolour washes, pencil hatching, folds, stains, smudges and pencil notes.
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
