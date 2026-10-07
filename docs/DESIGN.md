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
- **Wind:** direction swings up to ~150 degrees over several minutes, strength gusts 45-125%. Waves scale with it. HUD shows where it comes from and the sail efficiency.
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
Combat (deliberately), real audio files (synthesised stand-ins ship now), trading, landing on islands, an ending, title/menu polish.

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
