## Regional mechanics and puzzles: Reef, Lantern, Drowned (2026-11-17, owner: "build the suggested puzzles", REGIONAL_CATALOGUE.md 9)
- **M-REEF-1 Teeth under the tide** (`regiondecor.js`; `REEF_SLICK_TIDE` 0.4, `REEF_RING_TIDE` 0.7 in `regions.js`): the coral shows by
  the tide: black teeth in white water, then only the tips awash in a pale-green slick, above 0.7 a faint ripple ring over each head.
  It bites the same at any tide. Three tide states per head, so the look steps at each threshold.
- **P-REEF-2 Before the tide takes it** (`reef.js`): built as it was; `STORM_WRECK_LOW` -0.5 and `STORM_WRECK_WAIT` 60 are named.
- **P-REEF-4 The stake with no wreck** (`reef.js`, full game only, after the first throw, once a voyage, `state.story.reefStake`): a
  stake with a white rag in open Reef water; E finds nothing; the next blow raises its wreck beside it; low water takes the wreck, the
  stake stays. L-16 adopted for this; one stake on the water allowed against RULES 24c (nothing solid). Never explained, no clue.
- **P-LANT-1 Keep in sight of a light**: built as it was (nothing new).
- **M-LANT-1 Every light its rhythm** (new `systems/lantern.js`; `lightRhythm`, `rhythmOn`, `RHYTHM_*` in `regions.js`; chart ink in
  `chartstyles.js`): each lit Guild lighthouse flashes its own pattern; once within 45, the chart inks it in dots and dashes.
- **P-LANT-3 The keeper's supper** (`systems/lantern.js`, `SUPPER_*`; interact kind `supper` after `relight`): at dusk a lone Guild
  light's keeper swings his lantern; anchor under it and a basket trades a fish for 20 oil. One Mara line, once, when the basket
  comes down empty.
- **M-DROWN-4 Low-water hours** (`drownedOpen`, `DROWNED_OPEN_TIDE` 0 in `regions.js`; `ui/harbour.js`; the awash pier in
  `regiondecor.js`): a Drowned harbour gives and keeps only below tide 0; above it the pier lies under a film of water and the market
  says "The planks are under water. Nobody comes down."
- **P-DROWN-2 A fish for the pier**: built as it was; with M-DROWN-4 it waits for low water.
- Small hooks: `main.js` (import, `lanternTick` call, a generic `tgt.prompt`), `interact.js` (target, `HEAVE_KINDS`, range),
  `core/state.js` (`rhythm`, `supper` in `STORY_SHAPE`), `world.js` (`lampAt.y`), `story_export.py` (lantern.js in MAIN_PARTS).
- **Open, for the owner:** whether the stake's second look ever feeds Q3 (no clue added); whether the keeper should come out on a
  dead light (now he does not).

### Walkthroughs (for the owner's guide)
- **Teeth under the tide (Reef).** Any Reef isle with black coral in white water across its way in. Come back at high water: the white
  is gone, only a pale-green slick, then just a faint ring on the water marks each head. They still hold the hull. Ghost in under bare
  steerage (slow) and they do no harm.
- **Before the tide takes it (Reef).** A storm in Reef water brings a wreck up near you. If you leave, the next low water takes it.
  Stay within about 60 of it while the tide drops (the tide mark on the HUD), then salvage at the bottom of the tide: the Reef's
  x1.5 and low water's x1.3 together.
- **The stake with no wreck (Reef, full game, after the hut).** Somewhere in open Reef water you pass a lone stake with a white rag.
  There is nothing there; E does nothing. When the next blow comes in Reef water, sail back to the stake: a wreck has come up right
  beside it. Salvage it before low water takes it. The stake stays.
- **Keep in sight of a light (Lantern).** At dusk, a dead light 400 to 600 across open water, about 45 oil in the lamp. Straight across
  the lamp drains fast and you arrive short of the 30 the relight needs; hug the coast past lit lighthouses and it burns a quarter as
  fast. Relight it for 30 gold and the local chart.
- **Every light its rhythm (Lantern).** At night each Guild lighthouse flashes its own count: one to three, short or long. Sail close
  to one and open the chart (M): its pattern is inked beside it in dots and dashes. In the dark or in fog, count the flashes and match
  the chart to know which light is which.
- **The keeper's supper (Lantern).** At dusk, pass a lone lighthouse rock in Guild water: a keeper on the gallery swings his lantern
  twice. Catch a fish first, then come within about 45 and press E. A basket comes down on a line, takes the fish, goes up, and comes
  down again with a jar: 20 oil. With no fish it comes down empty. Once a day per light.
- **Low-water hours (Drowned, full game).** Dock at a Drowned harbour while the tide is high: the pier is awash and nobody comes down.
  Watch the tide mark; come back (or wait) as it falls below half, and they fill the lamp, the sailcloth and the hull, and keep one
  thing from the hold.
- **A fish for the pier (Drowned, full game).** The Drowned keep the first thing to hand: a fish, then fruit, then your newest
  treasure (the market row says what before you take it). Carry a cheap fish when you dock and your treasure stays aboard.

**Verified (headless, a tenth of real speed, throwaway scripts):** coral at tide -0.6, 0.56 and 0.89 shows teeth and white water,
then tips and slick, then rings only (screenshots), and a head still bites at tide 0.89 (hull 100 to 85); a storm wreck stays at
tide -0.8 with the ship 40 off and goes once she is 80 off; the stake is not placed before the first throw, is placed after it 308
clear of every island in Reef water, gives no E target, a blow with the ship 320 away raises its wreck 7 from the stake (none by the
ship), it salvages at x1.5, and a saved stake wreck comes back and goes at the next low water with `done` set; the light's lamp
matched its rhythm in 449 of 449 samples and the chart flag is set within 45; the keeper waves within 120, E gives "[E] Lie to under
the light", an empty run says Mara's line once and does not use the day, a fish run takes the fish and adds 20 oil; the chart inks
". . -" beside the light (its rhythm 0.3, 0.3, 1); at a Drowned harbour at tide 0.66 the market has no button and says "The planks
are under water. Nobody comes down." (the pier under its grey film), at tide -0.63 it offers the trade naming "one of your fish", and
taking it keeps the fish, leaves the treasure aboard and fills the lamp; in the demo build no stake is ever placed, even after a
throw, in Reef water. No console errors in any run. Shots in `docs/proposals/puzzles/` (none for P-REEF-2, P-LANT-1, P-DROWN-2:
nothing new to see).
**Not verified:** feel (tide steps, basket timing, the stake's visibility through Reef haze and fog), lone lighthouse rocks' frequency
across seeds, sound (none added).
