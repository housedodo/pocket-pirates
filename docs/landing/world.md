## World, combat readability, economy and the six rule-level items (2026-11-16, owner: "do the changes proposed", docs/proposals/SYSTEMS_FEEL.md)
- **The fog wall before the first throw is the chapter's (G-28, CANON 2026-11-13).** `gateRadius` returns `GATES[chapter]` until the
  first throw at the hut, however the ship is fitted; after it the strata decide, never under 1650. The comment on `strataGate` said the
  opposite and is corrected. A save whose ship already lies outside the wall is lost in the fog and drifts back toward Tama like any ship
  past it; an errand bound beyond it is let go as before. `scripts/world_checks.cjs` rewritten for this (its S1 to S4 cases could not
  hold since "the sea never shrinks" set a 1650 floor: they were stale before this change).
- **The Table's far label follows `tableOpen` (G-26),** the same test as going ashore. **The far labels stay (G-29);** DESIGN.md said
  they were removed and now says what `labelsTick` does.
- **No toast at a region's line or on a wind shift (G-32).** The place line and the wind ring show both. Every other word listed stays.
- **A raider's shot has a tell (G-22):** 0.7 s before she fires, a small puff (size 0.5) at her gun side, and she holds her turn until
  the shot. Under half her hull she lists 6 degrees and trails a thin smoke (the cannon puff at 0.32, every 0.3 s); under a quarter she
  runs at her slow speed, turned away, and fires no more (still yours to sink). No bars, no numbers.
- **The Drowned belt at high water pushes, never snaps (G-23):** an outward push of 12 units/s dying over 1 s, the ship's way cut to x0.2
  once per push, the scrape as before (5 hull every 2 s). Full game only.
- **Lantern 3 keeps the dark back (G-24):** the beacon lantern burns its oil x0.8 (`oilRate`). The card's words did not change.
- **Crown deadlines forgive 15 s (G-33):** `onTime` in `regions.js` (pay and the record's clean line). The formula stays distance / 6 + 60.
- **The economy meter (G-25):** `?econ=1` (`src/systems/econ.js`; never in the demo or the playtest build) books every gain of gold to a
  source by what else changed that frame (delivery, passenger, commission, salvage, bounty, treasure, places, relight, fish, fruit, oil,
  goal, other) and shows gold per hour of game time on the debug line and in `__game.econ`. No numbers yet: they wait for an owner run.
- **The tones are cues (RULES 25):** the fishing strike notes, the dig's stone and find, and the Music out of the Fog's notes played
  around `CUES.oneShots`. They are now listed there (`strike`, `strike_gold`, `strike_miss`, `stone`, `find`, `fog_note`), made by
  `AudioBus.chime` from `TONES`, never loaded, on the mixer's Effects row, rows in AUDIO.md. Same notes, same levels.
- **clueLint checks each clue's place against its region (G-30), as a warning only;** nothing retagged or moved (the owner picks per
  clue). It reports: CL-RIBS-a (reef) at the Ribs in Lantern water; CL-D1-a (drowned) at the Sunken Street in Free Cays water;
  CL-BELL-a (home) at the Drowned Bell in Free Cays or Reef water (seeded, just outside Tama's sector); CL-R1-a (reef) at the Name Wall
  and CL-R2-a (reef) at the Throwers' Wreck in Free Cays water on about half the seeds (mixed water between wedges).
- **Docs:** stage n = `stageOf` + 1 written into DESIGN's dread table with the dread numbers (G-31); CANON gives the dread number beside
  its two stage mentions (0.45 for the Cays, 0.6 for the lost sailors) and the main chain's count today (21) beside the 16; DESIGN
  lists seven upgrades; `story_export.py` no longer cuts the Table's "seen from far" line at its apostrophe. RULES 24b and 24c stay
  numbered twice: the second pair is cited by number elsewhere (ARCHITECTURE_AND_LORE_GUIDE.md, the proposals).
- **Verified (headless, a tenth of real speed):** gate 1650 before a throw and 820 in chapter III with a fully fitted ship, 1950 after it;
  a ship placed at 1800 before a throw is lost and drifts in; the Table's label hidden before a throw, shown after one; at high water the
  belt never moves the ship more than 0.4 units a frame, holds her at 1740 and scrapes 5; the raider's puff comes, her heading holds
  exactly, then the shot (screenshot: the puff beside her hull); a hurt raider smokes and leans, a badly hurt one runs at speed 7 and
  stops firing; no "Entering" or wind toast while crossing a sector line with the wind swung; lantern 3 burns 0.8 of lantern 2;
  15 s late is on time, 20 s is not; the meter runs. Smoke: see the commit.
  **Not verified:** how the tell, the list and the push feel in play, and whether 0.7 s is enough (RULES 40); the tones by ear; the
  smoke's look (design may restyle it: it is the cannon puff, small); economy numbers (need an owner run with `?econ=1`).
