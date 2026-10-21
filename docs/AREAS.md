# Areas: who reads what

Work is split in three areas so a change in one does not need the others' context. Read only your area's list; read another
area only when the task says so or when the change crosses over (then say which areas are touched).

## Design (look and feel)
- **Docs:** `docs/STYLE.md` (the style bible), `docs/concept/` (water, villages, references).
- **Code:** `src/psx.js`, `textures.js`, `palette.js`, `pixelui.js`, `ocean.js`, `sky.js`, `daynight.js`, `weather.js`, `windfx.js`, `world.js`, `villagestyles.js`, `ship.js`, `customize.js`, `title.js`, `solids.js`, `cavescene.js` (painters), `index.html` (CSS/HUD look).
- **Rule:** anything new must match STYLE.md; if the look changes on purpose, update STYLE.md in the same commit.

## Gameplay (systems and story)
- **Docs:** `docs/DESIGN.md` (how systems work), `docs/PROGRESS.md` (what exists, open story threads), `docs/ROADMAP.md`, `docs/TODO.md` (review follow-ups), `docs/QUOTES.md`, the Story Bible in the Claude Docs connector.
- **Code:** `src/main.js`, `objectives.js`, `jobs.js`, `passengers.js`, `companion.js`, `combat.js`, `traffic.js`, `fishing.js`, `fruit.js`, `upgrades.js`, `tabletop.js`, `dice3d.js`, `hut.js`, `threads.js`, `thread_mods.js`, `threadscenes.js`, `marks.js`, `caves.js`, `lore.js`, `greetings.js`, `logbook.js`, `sectors.js`, `seafeatures.js`, `fauna.js`, `abyss.js`.
- **Rule:** never resolve a storyline casually; add to PROGRESS.md when a feature or beat lands; horror is implied, never explained; keep HUD text minimal.

## Audio (sound and music)
- **Docs:** `docs/AUDIO.md`, `docs/SOUNDTRACK_BRIEF.md`, `public/audio/README.md`.
- **Code:** `src/audio.js`, `sfx.js`, `synth.js`, `mixer.js`, `studio.js`, `public/audio/`, `public/audio/volumes.json`.
- **Rule:** five dread stages = five music loops, same tempo/meter/key (D family, 6/8, 125 BPM); WAV masters stay with the composer, the game ships ogg (`scripts/studio_ogg.py`).

## Crossing over
Cave, thread or new-island changes touch all three: gameplay owns the beat, design owns how it looks, audio owns how it sounds.
The main session coordinates: brief each specialist with only its slice, then check the results agree. Shared files
(`main.js`, `index.html`, `docs/PROGRESS.md`) are edited carefully by whoever needs them; keep edits small and local.
