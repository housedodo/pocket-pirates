# HOIST: standing rules for every change

Rules that were decided or learned the hard way. They apply to every future change. Each has a reason; if a change seems to
need to break one, stop and ask the owner. `docs/CANON.md` says what is true in the story; this page says how to work.

## Story and writing
1. **Horror is implied, never explained.** A wrong detail and an ordinary reading for it. If a line explains, cut the line.
2. **Bright reading first.** Every strange thing is first a cosy thing (a baker, a tune, a lamp). The second look is the horror.
3. **Never resolve a storyline casually.** New beats go in `PROGRESS.md` with their open questions; decisions go in `CANON.md` with the date.
4. **Only the owner decides canon.** Section 8 of `CANON.md` lists what is open. Ask; never guess; never fill a gap with invented lore.
5. **Only one ending is happy** (the tune). Do not soften the others.
6. **Banned in anything the player reads:** lid, eye, sleeper, Lady, "kept soft", "Mara is from". Before the hut is known: no "she", "the hut" or a number about it. `clueLint` in `src/clues.js` checks the clue lines; hold other text to the same rule.
7. **Mara never explains and never confirms.** One or two short lines. At most one remark per clue. She may shrug a wrong thing off; that is the alibi.
8. **A wrong thing happens once.** One flag in `state.story`, set when it fires. No repeats, no log entry that names it, no achievement.
9. **Lines are short: one idea each.** No emoji or symbol glyphs in text; icons are pixel sprites (`pxi()` in `src/pixelui.js`).
10. **The village's name is never written anywhere**, in code, text or docs.
11. **Goals are found, never marked.** Only the early goals (landfall, the first riddle, Perrin's letters, an errand in hand) have a place on the slip and a dot on the wind ring. Later goals get a "where to look" line (`where` in `MAIN_GOALS`).

## Interface
12. **Three bookmarks: Chart, Orders, Ship's book.** New pages become sections of one of them, never a fourth bookmark.
13. **Nothing is a locked tab.** A section the story has not reached is not printed. A greyed button stays readable and answers a click with one line.
14. **The slip is always three lines in this order: what, where, which way and how long.** The same on the HUD, on Orders and on the chart.
15. **Distances are sailing time** ("4 min"), never units or fathoms, wherever the player reads them (`etaText` in `main.js`).
16. **The HUD stays wordless.** Gold, time, place, the slip. A new gauge names itself once (`nameMeter`), then is silent.
17. **Mara's box never covers the ship** or the water ahead of the bow: bottom left at sea, under the book in the log.
18. **E works under way.** Anything that needs the ship still drops the anchor first and starts by itself (`HEAVE_KINDS`, `anchorTick`). Never ask the player to stop by hand, and never cancel an action because the ship drifted.
19. **A letter is shown where it is taken.** Do not send the player to another screen to read what they were just handed.
20. **The log's bookmarks never move** between pages, and a click beside the book does not close it.

## Look
21. **`docs/STYLE.md` is the law for looks.** If the look changes on purpose, STYLE.md changes in the same commit.
22. **Two typefaces only:** Pirata One for titles and place names, Jersey 10 for text (DotGothic16 is the fallback). Bundled in `public/fonts`, open licence, no web fonts at run time. Never bold or italic.
23. **The chart is an inked portolan:** painted means sailed; bare vellum elsewhere; ink sprites, no round badges. The bare paper stays quiet: it is reserved for a drawing in another hand.
24. **Everything is procedural and pixel-crisp.** No image or model files. Half-resolution canvases shown pixelated; no anti-aliased strokes, no blur on text.

## Sound
25. **Only cues listed in `CUES.oneShots` (`src/audio.js`) play.** Silence elsewhere is on purpose. Adding a cue means adding it there and to `docs/AUDIO.md`.
26. **Five dread stages, five loops, same tempo, metre and key** (D family, 6/8, 125 BPM). Horror by removing and bending, never by adding a scare.
27. **WAV masters stay with the composer; the game ships ogg** (`scripts/studio_ogg.py`). Volumes live in `public/audio/volumes.json`.
28. **A sound that carries story needs a silent twin.** What the sound shows must also be visible; a player with the sound off must still be able to notice.

## Code
29. **The demo build is a different game.** `window.__BUILD === 'demo'`: no dread, the chapter fog wall, no caves, no threads, no Table, no test tools. Anything from after the hut must be gated out of it. Check before every demo rebuild that nothing new leaks.
30. **`MAIN_GOALS` is indexed by number in several places** (`GATE` in `gates.js`, `laterOK`, `OIL_FROM`, `onbAll`, the fragments). Adding, removing or moving a goal means: check each of those, and add a save migration (`state.goals.v`, in `main.js`) so an old save lands on the matching goal.
31. **Old saves must load.** New state goes in `state.story` with a safe default when absent. Never rename a saved key without a migration.
32. **Clues are the only story ledger.** A clue is a row in `src/clues.js`; seeing it sets `state.story.seen[id]`; what it grants is a capability, never a popup. Question levels are derived, never stored.
33. **New player-facing text must reach the story file.** After adding or changing lines run `python3 scripts/story_export.py`. A line keeps its ID while its text is in the code; changed text is a new ID and the old one is retired. To keep an ID, the writer edits the line in `STORY_MASTER.txt` and the change is carried into the code from there.
34. **`main.js` is too large; do not make it larger without need.** A new system gets its own file (as `table.js` did) and a row in `docs/AREAS.md` and `docs/DESIGN.md`.
35. **Trials go behind a URL flag, and the losers are deleted** when one is chosen. No dead variants stay in the tree.
36. **Shared files** (`main.js`, `index.html`, `PROGRESS.md`) are edited in small, local pieces. In `index.html`, a later rule of equal weight wins: add new rules next to the ones they belong with, or raise the selector.

## Working
37. **After a change:** build (`npx vite build`), look at it in the headless browser, commit, push. Say what was verified and what was not.
38. **The single-file games are rebuilt only when asked** (`npx vite build && python3 scripts/single.py`). After a rebuild, open the demo file once and check it starts, the fonts are in, and nothing from rule 29 shows.
39. **Checks that exist:** `scripts/world_checks.cjs` (the strata walls; needs the dev server and a quiet machine, it is timing-based) and `scripts/art_checks.cjs`.
40. **The headless browser runs at about a tenth of real speed.** Wait on game state, not on wall-clock time. Never judge feel, latency or sound from it; say so.
41. **Every change ends in the docs:** `PROGRESS.md` (what landed), and whichever of `CANON.md`, `STYLE.md`, `DESIGN.md`, `AUDIO.md`, `DEMO_CHECKLIST.md` it touches. A doc that is wrong is a bug.

## Before shipping the demo
- The owner plays one fresh voyage to the hut (target: under 45 minutes) and notes which of the four wrong things were noticed.
- The font licence files are read and kept (Pirata One, Jersey 10, DotGothic16: SIL Open Font License as recorded; not yet opened and checked).
- `docs/DEMO_CHECKLIST.md` from top to bottom.
