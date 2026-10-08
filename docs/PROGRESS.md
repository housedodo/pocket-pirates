# Pocket Pirates: progress and open story threads

A living document. It records what is built, which storylines are started but not resolved yet,
and ideas waiting to be connected. Update it whenever a feature or story beat lands.
For how things must look, see `STYLE.md`; for how systems work, see `DESIGN.md`.

## 1. Where the game is now

### Chapters (the main thread, `objectives.js`)
- The story runs in chapters, each a few steps with nudges from Mara (no markers). A chapter card (CHAPTER IV,
  title, act) shows when one begins; Mara gives a gentle hint after ~4 minutes without progress.
  - I Sea legs (sail, dock at Tama) · II Perrin's riddle (dig, shipwright) · III Earn your keep (delivery, chart 8)
  - IV Check my chart (Perrin's note at Tama names a far island and a detail; sail there and look)
  - V Strange notes (two bottles that speak of a black hut; a tavern gossip elsewhere reveals it)
  - VI The table (first throw at the hut) -> demo end card "TO BE CONTINUED", then "Keep sailing" lifts the fog.
- **Unlocks:** fishing from II; oars and passengers from III; crew, tavern dice, haggling and encounter cards from IV.
- **The fog wall:** each chapter allows a radius from Tama (430, 430, 820, 1250, 1650, 1650). Near it the fog closes
  in; past it the ship is turned back. The chart greys out everything beyond.
- **The hut:** physically there all along, but the door does not open and it is not on the chart until chapter V's
  gossip. Then it appears on the chart by itself; the next time the chart opens, Mara asks who drew it.
  The Lady is never seen (the hut text describes only a chair in the dark).

### Core
- Endless procedural Caribbean (Three.js + Vite), deterministic from a seed: islands in 110-unit cells,
  550-unit sectors with factions (Crown Traders, Free Cays, Reef Brotherhood, Lantern Guild, The Drowned).
- PS1 renderer: low-res target, Bayer dither, 15-bit colour, vertex wobble; dirty, low-poly, grimy look.
- **Dread** depends only on distance from home (0 at Tama, full at about 2200 units). Five stages:
  Sunny, Off, Wrong, Eerie, Cosmic. It does not grow with time.
- Sailing with a shifting wind (gusts, efficiency by heading), day/night (10 minutes: 7.5 min of daylight 06-19,
  2.5 min of night; rest at a harbour tavern from 17:00 to sleep until 06:00 and mend the hull), weather
  (rain, storms, fog, lightning, dead calms), lighthouses lit only at night.

### Things to do
- Main goals with Mara (first mate, typewriter dialogue, hints with Y) and side goals.
- Harbours: job board (deliveries), commissions (fish, fruit, lost crates, bounties, spotting animals),
  market (sell fish, fruit), shipwright (upgrades), shipyard (paint, sails, flags, figureheads).
- Treasure islands with riddles on arches; dig on the right shore.
- Fishing minigame (species change with dread), fruit picking, wrecks, barrels, bottles with notes.
- Other ships (5 kinds, factions), hailing (reputation-based), trading, optional combat with raiders.
- Captain's log (M / J): pixel tome with bookmarks (Map, Goals, Quests, Riddles, Rumours, Journal,
  Ship, Standing); rough pixel chart (island names only when zoomed in; the ship has a red "you are here" ring). Mission tracker toggled with Q.

### Horror layer
- Islands swap to "wrong" decor above half dread, tentacles between islands, crows, ghost ships,
  black sun, star-eye constellation.
- **Full dread effects** come one at a time: one creeps in (3-12 s), holds (15-90 s), fades (5-19 s), then nothing
  for 8-120 s before a different one starts; every length is random. Calm, wind, HUD and ocean fade by strength.
  After ~140 s in the worst water the leviathan comes regardless, and the Eye opens at ~170 s. (always on for players; with `?dev=1` the pause menu has a test list to switch or try each one):
  glass calm, corrupted HUD, mad wind meter, Mara breaks, lighthouses stare, watchers (4 looks),
  living map, time loop, wrong ocean, wrong catches, leviathan + "the Eye awakens" ending.

### World layout and feel
- The sea is mostly open: island chance follows a slow noise field (about 5-30% of cells, ~17% on average), so
  there are archipelagos and long lonely stretches. Villages never sit within two cells of each other (median
  ~430 units apart); Tama's waters stay clear. Harbour Tama is the big home island (radius 38) with its pier facing the start.
- "LAND HO!" title card the first time an uncharted island comes within ~150 units (Mara comments on new kinds).
- Harbours are entered only at the end of their pier ("Sail to the pier to go ashore" elsewhere along the shore).
- Villagers stroll slowly between random spots with pauses instead of pacing the dock.

### Errands and passengers
- Only one errand is followed at a time (delivery, passenger or a commission); pick it with "Follow" in the log's
  Quests tab. Only the followed commission's crates float in the sea; the tracker shows "+N more in the log".
- Nothing completes on arrival: dock at the pier and use the top "FINISH HERE" section of the harbour board
  (deliver goods, drop off a passenger, hand in a finished commission).
- Passengers (`src/passengers.js`) sometimes offer to pay for passage to another harbour. While sailing they talk:
  little stories, gossip, treasure hints (added to rumours), dark lines at high dread, and banter where Mara answers.
  The captain never speaks.
- Digging, picking fruit and searching wrecks need the ship completely stopped (S).
- Dolphins never jump across islands.

### Weather that matters
- Storms shove the ship downwind (more with the sail up); waves hitting the side wear the hull. Turn into them or reef.
- Dead calm: no wind for a while. G puts the oars out (animated: they swing out from the rail and stroke); W rows
  forward slowly, S backs water, wind does not matter. G again stows them and the sail goes back up.
- Thick fog (from day 3 or further out): the compass and tracker blur, Mara rings the bell; trust the lighthouses.
- Deliveries made in a storm pay 60% extra; passengers get seasick in storms.
- Signs instead of HUD text: a red evening sky means a storm is coming; the harbourmaster only says to watch the sky.
- Later: rain makes fruit regrow and rare fish bite, wet decks steer slower.

### Lines
- Every line in the game is collected in `docs/QUOTES.md` (with the odd demo lines in section 2).

### Tabletop (src/tabletop.js)
- **d20 checks:** a low-poly 3D d20 (same build as the Lady's, `src/dice3d.js`, paler bone) tumbles on screen against a number (Seamanship, Talk, Luck); crew traits and standing add
  bonuses, natural 20 always wins, natural 1 always fails. Used by haggling (Market tab, once a day per harbour:
  +30% / +50% on a 20, or -10%) and by encounter cards.
- **Encounter cards:** every 3-6 minutes on open water a card turns over (floating chest, stowaway, peddler, squall,
  castaway, shoal, sails on the horizon, an empty rowboat, a singing buoy, the same gull, and at high dread a patch of glass). Two choices, many with a roll. Keys 1/2.
- **Crew:** up to two hired hands (taverns, Market tab), each silent, with a trait (Lucky, Old salt, Silver tongue,
  Strong rower, Sharp-eyed, Superstitious) and a wish (see a volcano/atoll/mangrove, visit family in a harbour).
  A fulfilled wish adds +1 to their bonus. Castaways can join for free. Listed in the log's Ship tab.
- **Dice at the tavern:** Pig against a local, first to 30, 10g stake (win 20g, sometimes a rumour). Space roll, H hold. A 3D pixel d6 tumbles for every throw, the local's too.
- Not yet: the Lady's die and these checks are deliberately separate; inspiration tokens could link them later.

### World variety
- Six villager designs, seven house kinds (taverns, bell towers, stilt houses...), three new island kinds:
  volcano (rare and big, ~1 in 250 cells), atoll, mangrove (each with a dark-mood detail). All emoji replaced by pixel glyphs.
- **Village life by the hour** (`villagePhase`): dawn 5-8 fishers on the dock and chimney smoke; day 8-18 market
  stalls, full crowd, dockers, laundry; evening 18-22 crowd and lanterns at the tavern; night 22-5 empty streets and
  one watchman with a lantern. Each harbour has a liveliness from its seed; sleepy villages (about 30%) have a
  siesta from 12-15 (hammocks, nobody else) and no night watchman. Atolls have a fisher family by day.
- `__game.scaleShot()` shows villagers next to houses and the ship. `__game.showcase('villagers' | 'houses')` puts a lineup on a raft for screenshots.

### Newest: the dark hut
- One island 4-6 cells from home (out of sight of the start) has a crooked black hut on stilts,
  a purple window, bones on poles, a dead tree and a ring of pale stones. On the chart it is a black hut icon.
- Inside: an old woman who never speaks, and an old twenty-sided bone die (rendered low-poly and pixelated).
- One throw per in-game day:
  - **11-20:** a small prize (gold, 10 + 2x the roll, +40 on a 20); 17+ also gives a trinket for the journal.
  - **10:** nothing happens. "She almost smiles."
  - **1-9:** the screen flips to the full-dread look for a moment and back; she says nothing and writes something down.
- Mara comments after the first visit and after the third bad throw.

## 2. Open storylines (started, resolved later)

### The Lady in the Hut (main thread)
- **What the player sees:** a silent woman, a die, a ledger she writes in after every low roll.
- **What is recorded:** `state.hut = { rolls: [{n, day}], wins, fails, visits, lastDay }`. Every throw is kept.
- **What it should lead to:**
  - The number of low rolls (her "entries") decides how the ending plays out (see brainstorm below).
  - Later visits: the hut changes (more candles, a second chair, the die gets darker, a page of the
    ledger left open with the player's ship drawn on it).
  - A natural 1 (not yet special) could be the trigger for a one-off event: the hut is empty next time.
  - The trinkets from high rolls (a tooth with a tiny ship carved in it, a warm black pearl...)
    are meant to come back as keys or offerings.
- **Never explained directly.** She never speaks; things are implied through Mara, notes in bottles, the map.

### The Eye
- The star-eye in the sky at full dread; the leviathan arches; the "Eye awakens" ending
  (after ~2.5 minutes at full dread). The ending currently loops you back to Tama with a wake-up line.
- To be linked with the hut: the lady's ledger and the Eye are connected (see brainstorm).

### Mara
- At full dread she forgets her village, says things she should not, stops answering hints.
- Not resolved: what Mara is, and whether she remembers any of it when you are back home.

### Old Perrin's riddles
- The first treasure riddle comes from Old Perrin via the harbourmaster. Perrin himself is never met.

## 3. Side stories (ideas, to be loosely linked)
1. **The Lighthouse Keepers' Ledger:** keepers log passing ships. Some entries are ships that have not
   sailed yet, one of them is yours, dated next week. Collect pages from several lighthouses.
2. **Old Perrin, the cartographer who never left port:** his riddles describe shores he could not have
   seen. His maps are drawn as if from below the water. He once visited the hut.
3. **Mara's village:** she cannot remember its name. A chain of rumours leads to an island that is on no map,
   because it was above water before the sea rose.
4. **The drowned bell:** a bell rings under the water near wrecks. Bring the clappers from five wrecks
   to a sunken belfry. Ringing it calls something up for one night.
5. **The fisherman's debt:** the fisherman who drags you home after a sinking keeps asking to be paid.
   He never wants gold.
6. **Letters in bottles from a captain on your route:** years old, same course, same stops, and the
   handwriting slowly becomes yours.
7. **The twin harbour:** two harbours with the same name on the chart. One of them is wrong, and the
   people there do not blink.
8. **Lantern Guild oil:** the guild's lamp oil comes from a deep fish. Oil deliveries; seen by that light,
   the world shows things it normally hides.
9. **The raider who surrenders:** a raider captain gives up without a fight and warns that the sea
   further out is eating sectors. Becomes an informant who can be found in different harbours.
10. **The other dice:** wrecks sometimes hold other twenty-sided dice, each missing a different number.
    The lady would very much like them back.
11. **The choir of gulls:** a gull follows the ship for days. At high dread the gulls cry in a rhythm
    that spells out the hut's location. The lady keeps one gull, very old.
12. **The island that moves:** one island is in a different place every time it is charted. It is resting
    on something.

## 4. Main story
The worked-out story (main story, Old Perrin, Mara's village, the island that moves, how they connect and
the build plan in six parts) lives in the shared story doc, which the user edits:
https://claude.ai/code/artifact/577e89fb-db92-4c7b-8108-25b3f56573e4
Read it before building any story part. Decided so far: the final throw of the Lady's d20 decides the ending (20 = she sleeps 100 more years, 10-19 = good dreams, 1-9 = she rises), the hidden ledger adds a bonus or punishment to that roll and is only revealed at the end, the Lady is never seen, Mara is a cheerful survivor (her real name is Mara), no handholding. The seeds below were the starting point.

### Original seeds
- The sea is a closed eyelid. Dread is the Eye stirring in its sleep; the full-dread effects are
  its dreams leaking.
- The lady keeps it asleep by throwing the die. Each low roll is a moment it nearly woke, and she writes it
  down. The player's throws count too: they have been helping her or hurting her without knowing.
- Possible endings driven by the ledger and the trinkets:
  - **Keep it asleep:** enough high rolls and the offerings; the world stays bright, Mara stays Mara.
  - **Wake it:** too many low rolls; the Eye opens and the Caribbean is remembered as something else.
  - **Take her seat:** the player becomes the next one at the table; the hut is now on Tama.
- Act structure idea: (1) sunny sailing and goals, (2) rumours of The Drowned, (3) the lady's errands
  (bring her a gull feather, a bell clapper, Mara's hat), (4) the descent through the Eerie and Cosmic waters,
  (5) the ending at the eye.

## 5. How to test quickly
- Pause menu > New voyage (erase save), clicked twice, wipes the save and restarts. `?fresh=1` plays without loading or saving.
- Camera: R / drag up lowers it to deck level, where the view tilts up to the sky (it never goes below the waterline).
- `npm run dev`, then use URL flags: `?autostart=1&fresh=1&nomate=1`, `&dread=1`, `&time=0.9`, `&x=..&z=..`.
- Dev keys (only with `?dev=1`): 1-5 force a dread stage, 0 back to automatic, [ ] change the hour, ` shows debug info.
- `window.__game` exposes the game (e.g. `__game.world.hutDesc` for the hut island, `__game.hut`).
- Single-file build: `pocket-pirates.html` (JS, CSS and fonts inlined).
