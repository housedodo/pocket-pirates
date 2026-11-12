# Areas: who reads what

Everyone reads `docs/CANON.md` (what is true) and `docs/RULES.md` (what every change must keep) first. They are short.

Work is split in three areas so a change in one does not need the others' context. Read only your area's list; read another
area only when the task says so or when the change crosses over (then say which areas are touched).

## Design (look and feel)
- **Docs:** `docs/STYLE.md` (the style bible), `docs/concept/` (water, villages, references), `docs/ART_SPEC.md` (island zones: Surface / Sub-Stratum / Abyssal Core, per-place art, readability rules).
- **Code:** `src/psx.js`, `textures.js`, `palette.js`, `pixelui.js`, `ocean.js`, `sky.js`, `daynight.js`, `weather.js`, `windfx.js`, `world.js`, `villagestyles.js`, `ship.js`, `customize.js`, `title.js`, `solids.js`, `faces.js` (villager portraits), `cavescene.js` (painters), `landmarks.js` (the hand-made islands' look), `wake.js` (wakes and bow waves), `chart.js` (the chart's frame, side panel and hover card), `chartstyles.js` (how the chart is drawn: the inked portolan; the type pairing), `windmeters.js` (the wind ring), `builder.js` (the flat-shaded triangle builder), `concepts.js` (biome concept scenes, dev only), `index.html` (CSS/HUD look, shop cards).
- **Rule:** anything new must match STYLE.md; if the look changes on purpose, update STYLE.md in the same commit.

## Gameplay (systems and story)
- **Docs:** `docs/CANON.md` (the one-page truth and every dated decision), `docs/STORY_EXPLORATION.txt` (the story told by exploring: seven questions, 15 places by region, the Kestrel chain, endings from knowing; companion to STORY_MASTER), `docs/STORY_MASTER.txt` (the main story file the writer edits: cast, world atlas with story slots, every line with an ID; rebuilt by `python3 scripts/story_export.py`), `docs/DESIGN.md` (how systems work), `docs/PROGRESS.md` (what exists, open story threads), `docs/ROADMAP.md`, `docs/QUOTES.md`, the Story Bible in the Claude Docs connector.
- **Code:** `src/main.js`, `objectives.js`, `jobs.js`, `passengers.js`, `companion.js`, `combat.js`, `traffic.js`, `fishing.js`, `fruit.js`, `upgrades.js`, `tabletop.js`, `dice3d.js`, `hut.js`, `gates.js` (what the interface lets you click, by story progress), `threads.js`, `thread_mods.js`, `threadscenes.js`, `marks.js`, `caves.js`, `lore.js`, `greetings.js`, `logbook.js`, `sectors.js`, `seafeatures.js`, `fauna.js`, `abyss.js`, `places.js` (hand-made places: barriers, visits, far labels), `seaplay.js` (gusts, currents), `glimpse.js`, `gamepad.js`, `oil.js` (lamp oil), `secrets.js` (world hints: the Kestrel, tide wrecks, smoke, watchers, birds), `digging.js` (dig beach and noon shadow), `table.js` (the Table by the Water: the endings, and Mara's village coming back to her), `clues.js` (the clue ledger: what has been seen, question levels, capabilities), `logbook.js` (the captain's log: Chart, Orders, Ship's book), `sighting.js` (signs at sea), `float.js` (how hulls ride the swell), `wind.js` (the wandering wind), `util.js`.
- **Rule:** never resolve a storyline casually; add to PROGRESS.md when a feature or beat lands; horror is implied, never explained; keep HUD text minimal. After changing player-facing text run `python3 scripts/story_export.py`. A change to `MAIN_GOALS` needs the checks in RULES.md rule 30.

## Audio (sound and music)
- **Docs:** `docs/AUDIO.md`, `docs/SOUNDTRACK_BRIEF.md`, `public/audio/README.md`.
- **Code:** `src/audio.js`, `layers.js`, `sfx.js`, `synth.js`, `mixer.js`, `studio.js`, `public/audio/`, `public/audio/volumes.json`.
- **Rule:** five dread stages = five music loops, same tempo/meter/key (D family, 6/8, 125 BPM); WAV masters stay with the composer, the game ships ogg (`scripts/studio_ogg.py`).

## Shared core (everyone)
- `src/core/` (config, state, runtime, engine), `src/ui/dom.js`, `src/systems/calendar.js`, `src/systems/storyflags.js`: the layers
  under `main.js`. See `docs/ARCHITECTURE.md`; change them carefully, everything above imports them.
- Split out of `main.js` (same owners as before): `src/ui/camera.js`, `src/ui/title.js` (design), `src/ui/pause.js` (design; sound
  rows audio), `src/ui/harbour.js`, `src/ui/shiptrade.js` (gameplay), `src/ui/shipyard.js` (design), `src/ui/hud.js` (design), `src/ui/encounters.js` and `src/systems/storybeats.js` (gameplay),
  `src/systems/lullaby.js` (gameplay; the music placement is audio's), `src/systems/lostsailors.js` (gameplay), `src/systems/edge.js`
  (design and gameplay). Their text counts as main.js
  text in the story export (MAIN-xxxx).

## Crossing over
Cave, thread or new-island changes touch all three: gameplay owns the beat, design owns how it looks, audio owns how it sounds.
The main session coordinates: brief each specialist with only its slice, then check the results agree. Shared files
(`main.js`, `index.html`, `docs/PROGRESS.md`) are edited carefully by whoever needs them; keep edits small and local.

- `src/harbourlife.js` (gameplay: residents, house dishes, events, gossip, fragments), `src/newspaper.js` (gameplay: the Friday paper; its look is in `index.html`, `.paper`) and `src/localgames.js` (gameplay: the eight tavern games).
- Scripts: `scripts/story_export.py` (gameplay: rebuilds STORY_MASTER.txt from the code), `scripts/single.py` (the single-file games), `scripts/world_checks.cjs` (gameplay: strata walls), `scripts/art_checks.cjs` (design), `scripts/studio_ogg.py` (audio).
