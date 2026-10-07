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
| `ship.js` | Procedural ship, wind-based sailing model, wake |
| `horror.js` | Tentacles that rise between islands at high dread |
| `lore.js` | Names, harbour gossip and loot that drift from cosy to cosmic |
| `audio.js` | Optional drop-in audio, cross-faded per dread stage |

Every island has a bright decor set and a "wrong" decor set (dead palms, glowing fungus, monoliths with eyes, a totem in town).
They swap at dread 0.5, and terrain colours blend to a second vertex colour set.

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
Combat (deliberately), audio files (hooks exist), ship upgrades, trading, landing on islands, weather, ghost ships, an ending, title/menu polish.

## Backlog
**Alternative directions to revisit**
- **B. Roguelike voyage:** each run is a seeded trip of fixed length, dread is a clock, keep upgrades between runs. Tighter and replayable, less "open world".
- **C. Pure sandbox:** no story, just sailing, collecting and slow corruption. Quickest to build.

**Game ideas**
- Ship upgrades (hull, sails, lantern, spyglass range) bought with loot
- Trading and selling relics; harbour NPC quests; riddle/map treasure hunts
- Light combat later: ghost ships, sea creatures; cannons
- Fishing, friendly dolphins/whales early (which turn wrong later)
- Sanity/Dread meter driven by choices, not just distance; lantern/harbours restore it
- Day/night cycle, storms, fog banks, whirlpools
- Landing on islands (walkable beach/town), cave mouths, interiors
- Procedural wrecks, message-in-a-bottle lore, a longer logbook
- Ending(s): seal it, join it, or turn back to a subtly wrong home
- Save slots, settings menu, gamepad, accessibility (reduce flicker/wobble option)
- Procedural fallback audio if no files are supplied
