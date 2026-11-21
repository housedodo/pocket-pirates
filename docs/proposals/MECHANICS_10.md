# Ten new mechanics (proposal, drafts only)

Common to all: full game only; no marker, popup or "clue found"; knowledge is the player's, and the game keeps only a flag (`state.story.*`, empty default, so an old save loads). A clue is a row in `src/clues.js` (RULES 32), seen once, granting a capability. All wording below is a draft for the writer and obeys RULES 6. Each wrong thing fires once (RULES 8). Mara has at most one remark, and a shrug is her alibi. New code goes in `src/systems/`, with a row in `docs/AREAS.md` (RULES 34).

## 1. Band Reckoning
**Family:** celestial navigation. **Loop:** On a night with a full milky way (the sky already varies, CANON 2026-11-18), the band's bright heel stands in a fixed place against the mast. Hold the heel on the stem line and the ship holds one true course, unlike a compass, which in the fog wall's far side swims. Steer by the band through the 1950 fog and the water stays plain; lose it and the fog closes. **Taught:** a Free Cays night fisher says "keep the road over the bow"; Teo's night talk; a Reef log margin sketch. **Progress:** a new way through the 1950 wall (`passes.js`), a fifth after the ones listed, for a captain with no clues from three regions. **Touchpoints:** `src/sky.js` (band angle, read only), `systems/passes.js`, `objectives.js` strataGate; new `systems/bandfix.js`. **State:** `story.bandfix` (count of clean runs). **Risk:** nights with no band must never trap a ship; the fog only fails to open, never harms. The cosy twin is plain: no band, no pass, wait for a clear night. **Size:** M.

## 2. The Still Star
**Family:** perception shift. **Loop:** Over a few named waters one star does not wheel with the rest of the sky. A player who looks up at the same place on two nights, an hour apart, sees the rest move and that one stay. Nothing else changes. **Taught:** an old salt's saying ("one nail in the roof"); a Crown clerk's almanac with one star left blank. **Progress:** raises Q2 (What is the Eye?) through a new Glass Lagoon-region clue row `CL-X-star`, cap `stillstar`: once seen, the chart's pencil gains a tiny tick where it holds (RULES 23). **Touchpoints:** `sky.js` (one fixed star per band-night, only inside chosen cells), `clues.js`, `chartstyles.js`; new `systems/stillstar.js`. **State:** `story.seen['CL-X-star']`. **Risk:** RULES 23a, the game never ties the star to any other source. Show it, never name it. **Size:** S.

## 3. Hull Echo
**Family:** acoustic resonance. **Loop:** Strike the ship's bell (E at the bell, anchored or under way, RULES 18). A ring spreads on the water; where the water lies over hollow ground the ring returns late and doubled. Cosy reading: a bell sounds shallows and caves. **Silent twin:** the ring and its return are drawn on the water, and the lamp swings to it. **Taught:** a harbour bell-ringer; the Tama bells already teach a count; a Drowned child's game of "shout to the bottom". **Progress:** reveals the approach to the Hollow Harbour's quay (the Drowned thread, CANON 2026-11-12); the late echo raises Q6 through `CL-D-echo`. **Touchpoints:** `systems/drowned.js`, `seaevents.js` (the ring), `audio.js` (a bell cue in `CUES.oneShots` and `docs/AUDIO.md`); new `systems/hullecho.js`. **State:** `story.echo` (cells struck). **Risk:** no new rocks; the quay already exists. Keep the strike rare enough to not be a sonar for every island (a cooldown of one day). **Size:** M.

## 4. Salt Line
**Family:** salt-rot and decay. **Loop:** The Gull's hull wears a white salt line that climbs with miles sailed and dread-free days and is scrubbed at any harbour yard for coin. Ordinary rule: dirty hull, slower ship, a small cost. Beside the Pained Raven there is no line, ever; its planks are bare, the old rope still golden. **Taught:** a shipwright's saying ("a ship tells its age at the waterline"); Nilo scrubbing a hull. **Progress:** raises Q3 (Who sat before you?) through `CL-R-raven`, cap `saltline`; scraping the line off before the Raven also lets the ship tie alongside it once. **Touchpoints:** `ship.js` (hull material tint), `systems/reef.js`, `ui/harbour.js` (yard); new `systems/saltline.js`. **State:** `story.salt` (0..1; absent means 0), `story.ravenAlong` once. **Risk:** CANON 2026-11-12: the Raven is "not old, not rotten"; this follows it exactly and says nothing. **Size:** M.

## 5. Second Ebb
**Family:** tide and time. **Loop:** Every pier gauge post shows its own water mark. A captain who writes the lag between Tama's low and a far harbour's (tide lag, seen on posts and the harbour clock) can predict slack water. In one Drowned strait there is a second low, a few minutes past the first, which the table does not predict. The shoal belt (which opens at low water) stays open for that extra stretch. **Taught:** a harbourmaster ("the sea takes two breaths there"); the chart's pencil low-water sign (RULES 23). **Progress:** opens the inner shoal belt to a captain who waited, reaching a clue place (Sunken Street approach) without the fog wall. **Touchpoints:** `regions.js` (tide table), `systems/drowned.js`, `chart` pencil mark; new `systems/secondebb.js`. **State:** `story.ebb2` (once seen). **Risk:** do not turn the sea into a timer for impatient players; the second low is gentle and wide. **Size:** M.

## 6. Soundings in Pencil
**Family:** eldritch cartography, memory. **Loop:** A lead line cast at any harbour or buoy writes a depth in pencil on the chart. In a few places the depths repeat your own thrown numbers (`hut.rolls`), in the order you threw them. Only a player who threw and cast will notice. **Taught:** Perrin's letter about "numbers beside the shore"; the lead line in the sea chest. **Progress:** raises Q4 (What does a throw cost?) through `CL-S-sound`; a reader who matches them is shown the throw as a place by name only on the pencil mark. **Touchpoints:** `chest.js`, `chart.js`, `hut` state; new `systems/soundings.js`. **State:** `story.soundings` (cells cast). **Risk:** RULES 23a: no line ties numbers to throws. Never the same cell twice. **Size:** M.

## 7. Variation
**Family:** celestial navigation, perception shift. **Loop:** The compass needle stands off true by a fixed angle near some harbours and islands; the drift is smooth, regional, and never a jump (RULES 24a). A player who steers the same bearing twice and arrives elsewhere learns it. A Guild keeper's lamp always stands true. **Taught:** a keeper's remark about "the needle being tired"; the lamp's far rhythm already teaches. **Progress:** reveals the true side of the Halved Isle (Q7's other place) and lets a far harbour be found from the lamp alone; the leading light stays the other way in (`leadlight.js`). **Touchpoints:** `compass` in `ui/hud.js`, `regions.js`, `leadlight.js`; new `systems/variation.js`. **State:** `story.vari` (once felt). **Risk:** a compass that lies may anger players; it only drifts ten degrees at most, and the pin dot (RULES 11) always follows the true bearing. **Size:** M.

## 8. The Short Count
**Family:** counting, the hold. **Loop:** Barrels and sacks in the hold are counted at each pier (tally already exists). At a few ledger-keeping piers the clerk's count of your hold or crew differs from yours by one. Ordinary reading: a bad clerk, a miscount; recount and it agrees, once. **Taught:** a Crown customs clerk's scolding; the Keepers' Ledger. **Progress:** raises Q1 (Who counts?) through `CL-K-short`, cap `shortcount`; and lets the Customs Pier waive a fee once (a shifted world state, not a gift). **Touchpoints:** `systems/crown.js`, `econ.js`, `ui/harbour.js`; new `systems/shortcount.js`. **State:** `story.short` once per pier. **Risk:** CANON 2026-11-12 (the innkeeper counts one head) is an existing tell; keep this one in the hold and never in heads. **Size:** S.

## 9. The Glass
**Family:** weather. **Loop:** A barometer in the cabin, shown as a small pixel dial (RULES 16: no label, one `nameMeter`). Its fall warns of squalls; ordinary use is to reef sails in time. Near the Reef storm wrecks the glass falls on a flat day, and sinking wrecks wait out a squall that never comes. **Taught:** a harbour's old saying ("when the glass lies"); Crown's unused `forecast` cap (`CL-C2-a`). **Progress:** reading the glass early lets the player reach a storm wreck first and raises Q3 (`CL-R-glass`); a calm in the middle of a squall (an eye) opens a short gap in the 1650 wall. **Touchpoints:** `weather.js`, `systems/reef.js`, `seaevents.js`, `ui/hud.js`; new `systems/glass.js`. **State:** `story.glass` (once). **Risk:** the 1650 gap bends T4: the owner listed the existing ways; ask before adding. **Size:** L.

## 10. Flag Hoists
**Family:** the crew (other crews). **Loop:** Passing ships hoist three-flag signals; the Ship's book fills a page of flags as each is seen. A captain who answers (E at the signal locker) gets a reply: a safe-water signal, a "follow me". Ordinary reading: sailors' courtesy. **Silent twin:** it is entirely visual. **Taught:** a harbour flag-seller; the Pained Raven's own flags, still flying. **Progress:** a pilot ship may lead the captain through the 1650 wall's thin lane (a new other way, like the Reef boat in the Ribs); the Raven's hoist raises Q3. **Touchpoints:** `ship.js`, `systems/seaevents.js`, `ui/shiptrade.js`, `src/chest.js`; new `systems/hoists.js`. **State:** `story.hoists` (list of seen flags, default empty). **Risk:** CANON 2026-11-18, the crew is never fixed; hoists must never confirm a crew count. Another bend of T4. **Size:** L.

## Closing table

| # | Name | Loop | Progression |
|---|---|---|---|
| 1 | Band Reckoning | Hold the milky way's heel on the stem at night | Fifth way through the 1950 wall |
| 2 | The Still Star | Notice one star that does not wheel | Q2 clue row `CL-X-star` |
| 3 | Hull Echo | Strike the bell, read the late ring | Reveals the Hollow Harbour's approach; Q6 |
| 4 | Salt Line | The hull's salt line; the Raven has none | Q3 clue row; tie alongside the Raven once |
| 5 | Second Ebb | Predict tide lag; wait for a second low | Opens the inner shoal belt to the Sunken Street |
| 6 | Soundings in Pencil | Cast the lead; pencil depths echo your throws | Q4 clue row |
| 7 | Variation | A compass that drifts; a lamp that stays true | Reaches the Halved Isle's far side (Q7) |
| 8 | The Short Count | A clerk's count of the hold is off by one | Q1 clue row; one fee waived |
| 9 | The Glass | A barometer that falls on a flat day | Early wreck access; Q3; a gap in the 1650 wall |
| 10 | Flag Hoists | Read and answer other ships' signals | A pilot through the 1650 wall; Q3 |

Section 8 of CANON (open items) is not touched. Nos. 9 and 10 bend T4's list of walls and need the owner's word.

## Architect's review (2026-11-21)
Checked against the code and canon:
- No. 1 Band Reckoning bypasses the 1950 wall, which is the KNOWLEDGE gate (clues from three regions), not an upgrade gate; a way round it
  undoes "the walls are part of the price" (owner, 2026-11-19). Suggest it guides instead: in the 1650 wall's fog at night the band
  points the way to the tune's gaps (a fifth sense of an existing way), or it leads to the Table once the 1950 wall is open.
- No. 5 Second Ebb: there is one shoal belt (regions.js BELT 1740-1800); the Sunken Street (r about 1779) already lies in it and needs the
  lowest tide. Rescope: the second low LENGTHENS the window in which both the belt is open and the Street is bare.
- No. 7 Variation: the Halved Isle has no "far side"; it is one fog bank (BARRIERS.broken). Rescope: the true lamp lets the captain hold
  a course through the Halved Isle's fog by night (a second sense of the leading light) or name an isle the chart has drawn wrong.
- No. 8 The Short Count: no hold tally exists ("tally" is the bell-count capability). It needs a new count of the hold at Crown piers;
  and it must not repeat the one-head tells (each once, CANON 2026-11-12).
- No. 9 The Glass overlaps the designed but unused `forecast` capability (the Fort's archive: bad days one ahead). Fold it in: the glass
  IS forecast's ordinary face. Its 1650-wall gap is beyond the approved list (owner).
- No. 10 Flag Hoists: the pilot through the 1650 wall is beyond the approved list (owner); a pilot already exists for the Ribs.
- Nos. 3 and 4 lean on threads (the Hollow Harbour, the Other Captain) that wake on only some voyages: they need a non-thread place too, or
  they become luck.
- No. 6 Soundings fits the sea chest's lead line well; its numbers appear only after the hut (RULES 6: no number about it before).
- No. 2 The Still Star respects "no drawn constellations" (CANON 2026-11-18) if the star is one of the existing points.
Synergy with the lore drafts: LX-08 "sign the log twice" teaches No. 8; LX-21 the keeper's log (a lamp lit when it was already lit)
teaches No. 7; LX-11 "never trim a wick in a falling tide" can teach No. 5; LX-16 "big water, slow breath... you can count it" teaches
No. 2; the shanty's growing count backs No. 8.
