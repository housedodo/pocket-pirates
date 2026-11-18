# Progress entry (to land in docs/PROGRESS.md): the lore bible adopted (2026-11-18)

Owner: "run through lore bible and add the other lore proposals. In case any lore changes too much in the game, write it down and
don't stop before it's over." Every proposal L-01 to L-42 of `docs/proposals/LORE_BIBLE.md` is in (L-16 was already), each in the form
the game can carry; how each went in is marked at its row in the bible's section 1. Decision row: `docs/CANON.md` 2026-11-18, "Lore
adopted from the lore bible". Systems: `docs/DESIGN.md`, "Regional customs".

## What landed
- **`src/customs.js`** (new, gameplay): 34 docking lines by region and moment, each once a voyage (`customLine`, from `systems/interact.js`);
  ON THE QUAY on the harbourmaster's board, one sight a day per harbour from the region's pool, the old hitch once in each region, the
  Drowned's chalk tally of what they really kept, a SHORT DICE sign and the chalk wall washed on market day (`sightsAt`, from
  `ui/harbour.js`); Mara once per region, silent past a dread threshold (`maraAt`, L-34); small one-off customs (the keeper's log at the
  first light relit, the Brotherhood's debt on the bounty, after the hut "a candle" on a low haggle roll and a twenty on a hired hand's oar,
  the customs slip kept in the log).
- **`src/customprops.js`** (new): a fire on a sand spit by each Free Cays harbour, lit on still nights only (L-14, L-15); a tide pole with
  keepers' rings and the weed line above them by each Drowned harbour (L-23). Harbours only, one each; nothing on the open sea.
- **The paper** (`newspaper.js`): five items (a clerk retires, Reckoning Day (full), the figurehead, the tide pole (full), the knot
  contest (full)), two notices (the Guild counts lights; a Crown clerk's line is closed (full)), the press line (L-12); the blue-boats
  face once a voyage (L-40 C).
- **Bottles** (`lore.js`): three notes (gulls carry the news, who came first, a bell where none hangs).
- **Places** (`places.js`): a second visit to Teo or Ilse hears, once, that the other began it (L-38 C).
- **Corvo** (`harbourlife.js`): his wall is washed on market day (L-33).
- **`main.js`** (2 lines and an import): the customs slip in the log; Mara's market-day and lantern-night remarks stop past dread 0.45.
- **Drafts:** 67 new CUST lines, 2 PLC, 1 HLF, 7 NEWS, 3 bottle notes (LORE-0093 to 0095) and 5 headlines, all listed for the writer in
  `docs/WRITER_TODO.txt` 4.8 with "yours:" slots.

## Picks for the options (L-35 to L-42)
The bible recommends only against L-36 C; elsewhere the option that closes off least and contradicts no 2026-11-18 decision was taken.
- L-35 **C** (Perrin's port left unfixed), L-36 **A** (R. an initial only), L-37 **C** (the drowned streets undefined),
  L-38 **C** (Teo and Ilse each say the other began), L-39 **A** (Lune's song unrelated to the tune), L-40 **C** (the blue line said
  once), L-41 **B** (the doc-only ship names kept in reserve), L-42 no reading (the bell count is the owner's, CANON 2026-11-18 "for later").

## Lore that changed a lot
None of these contradicts a dated decision; each went in in its gentlest form, and is listed so the owner can cut it.
- **L-14 Fires for the players**: a new visible thing in every Cays harbour tied to the Two Players. Gentle form: a courtesy only, it
  changes no number; it goes out on a storm night like the music; the fire-sitter's line says "Everyone keeps something", never what for.
- **L-26 A place laid nearest the sea, in every region**: turns the innkeeper's one fragment into a sea-wide custom, and in the Drowned
  the place has "already been eaten from". Gentle form: seen only, never used, nobody says for whom.
- **L-25 The old hitch, once in each region**: ties the earlier sailors' knot (CANON 2026-11-12) across the whole sea. Gentle form: it is
  only ever "an old hitch"; nobody connects it to anyone; full game only.
- **L-10 The Crown finds Tama's bell too soft to count by**: a second region notices that home is different (question 5). Gentle form: a
  townsman's scorn only; no clue row, so question 5's level is unchanged (the C-06 gap stays the owner's).
- **L-28 "A candle" for a low throw, L-31 lucky twenties**: harbourfolk speak of the throws as a common thing. Gentle form: after the
  first throw only, once each, never about the hut itself.
- **L-38 Teo and Ilse each say the other began**: new words for the Two Players. Gentle form: about who began years ago, never about
  who starts each night (he starts, she finishes, CANON 2026-11-12, unchanged); neither line says "she".
- **L-34 Mara's silences**: changes how Mara behaves (her regional remarks and her market-day remarks stop as the dread rises). Gentle
  form: silence only, no new dark line.
- **Changed lines** (new IDs, the old retired): Corvo's after-line (HLF), the Brotherhood's bounty toast (MAIN).

## Verified
`npx vite build`; `python3 scripts/story_export.py`: no new banned-word line (1 and 5 short strings, as before). Headless (Chromium,
module imports on the dev server): every region's lines, sights and Mara remarks come up in the full build; in the demo none of the
full-game or after-the-hut lines, sights, paper items or Mara remarks appear; the new paper items and bottle notes appear; no docking line
or sight contains she, her or hut; the twenty sights appear only after a throw. Velto's board shows ON THE QUAY with no console error.
**Not verified:** the two props were not looked at in a running game (no Cays or Drowned harbour was sailed to); smoke was not run;
feel and pacing (how often a custom line wins over the greeters) not judged.

## Open
- Whether any of these should become a clue row (L-10 for question 5 above all) is the owner's (RULES 32).
- The writer's pass over 4.8.
