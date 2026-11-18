# Progress entry (to land in docs/PROGRESS.md): the writer's second answers built (2026-11-18)

Spec: `docs/CANON.md` 2026-11-18, "Writer's answers, second batch". Systems: `docs/DESIGN.md` (the keeper's supper; the clue places
stand in their own water; the greeter after a throw; the abyss list). Every new line is a draft: `docs/WRITER_TODO.txt` 4.7.

## What landed
- **C4 the keeper on a dead light** (`systems/lantern.js`): at dusk he stands on a dead light's gallery too, dark, no lantern, not
  waving or following the ship. E calls up; he looks at the dark lamp and nothing comes down. Relighting (night) works as before.
  The keeper's prompt is now "[E] Call up to the keeper" (owner).
- **D3 the clue places move** (`landmarks.js`, `world.js`, `core/state.js`): the Drowned Bell into Tama's sector; the Ribs, the Name
  Wall and the Throwers' Wreck into the Reef wedge; the Sunken Street out to the Drowned. `clueLint` reports no region warnings on
  32 seeds. The world is rolled as before, so the hut and villages do not move (checked on 121 seeds, seed 1337 included). Old saves:
  the chart follows the moved places. Three old salts' lines elsewhere say offhand that a place was not always called that.
- **D2** no line fixes the Gull's crew: Mara's "We only have nine" became "Eleven answered at roll call this morning. I did not call it."
- **E1** "the Eye" shows only at the very bottom (`EYE_K`, abyss k 0.9): the HUD's THE EYE and the chart's The Eye are kept out above
  it; THE EYE OPENS. is the waking itself. `story_export.py` lets exactly these three through (RULES 6 exception) and still checks the rest.
- **E2** the stock lies and Mara's stock lines rewritten in the game's own flat voice; the chart's large TURN BACK is now STILL HERE.
- **E3** broken text at full dread varies per line: blocks, dropped letters, a repeated word, cut mid-word, sometimes two at once;
  about half of Mara's full-dread lines break as she says them.
- **E5** the natural-twenty line is cut.
- **E6** greeters after a later throw speak about one time in three, never two within three days; after a low throw the sea or the
  weather comes first, the throw only aside.

## Open (the owner's)
- After a throw of one the greeter still says only "One."; the mid, ten, high and twenty greeters still open with the number.
- The dev pause menu's effect list still says "Leviathan & the Eye" (a test tool; the export flags it, as before).
- The bell's count (D1) and the hut's gold wording (E4) are for later (CANON).
