# Pocket Pirates: progress and open story threads

A living document. It records what is built, which storylines are started but not resolved yet,
and ideas waiting to be connected. Update it whenever a feature or story beat lands.
For how things must look, see `STYLE.md`; for how systems work, see `DESIGN.md`.

## 1. Where the game is now

### Core
- Endless procedural Caribbean (Three.js + Vite), deterministic from a seed: islands in 110-unit cells,
  550-unit sectors with factions (Crown Traders, Free Cays, Reef Brotherhood, Lantern Guild, The Drowned).
- PS1 renderer: low-res target, Bayer dither, 15-bit colour, vertex wobble; dirty, low-poly, grimy look.
- **Dread** depends only on distance from home (0 at Tama, full at about 2200 units). Five stages:
  Sunny, Off, Wrong, Eerie, Cosmic. It does not grow with time.
- Sailing with a shifting wind (gusts, efficiency by heading), day/night (10 minutes: 7.5 min of daylight 06-19,
  2.5 min of night; rest at a harbour tavern from 17:00 to sleep until 06:00 and mend the hull), weather
  (rain, storms, fog, lightning, rainbows), lighthouses lit only at night.

### Things to do
- Main goals with Mara (first mate, typewriter dialogue, hints with Y) and side goals.
- Harbours: job board (deliveries), commissions (fish, fruit, lost crates, bounties, spotting animals),
  market (sell fish, fruit), shipwright (upgrades), shipyard (paint, sails, flags, figureheads).
- Treasure islands with riddles on arches; dig on the right shore.
- Fishing minigame (species change with dread), fruit picking, wrecks, barrels, bottles with notes.
- Other ships (5 kinds, factions), hailing (reputation-based), trading, optional combat with raiders.
- Captain's log (M / J): pixel tome with bookmarks (Map, Goals, Quests, Riddles, Rumours, Journal,
  Ship, Standing); rough pixel chart. Mission tracker toggled with Q.

### Horror layer
- Islands swap to "wrong" decor above half dread, tentacles between islands, crows, ghost ships,
  black sun, star-eye constellation.
- **Full dread effects** (pause menu > Full-dread effects, each can be switched off or tried alone):
  glass calm, corrupted HUD, mad wind meter, Mara breaks, lighthouses stare, watchers (4 looks),
  living map, time loop, wrong ocean, wrong catches, leviathan + "the Eye awakens" ending.

### World variety
- Six villager designs, seven house kinds (taverns, bell towers, stilt houses...), three new island kinds:
  volcano, atoll, mangrove (each with a dark-mood detail). All emoji replaced by pixel glyphs.
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
- `npm run dev`, then use URL flags: `?autostart=1&fresh=1&nomate=1`, `&dread=1`, `&time=0.9`, `&x=..&z=..`.
- Keys: 1-5 force a dread stage, 0 back to automatic, [ ] change the hour, ` shows debug info.
- `window.__game` exposes the game (e.g. `__game.world.hutDesc` for the hut island, `__game.hut`).
- Single-file build: `pocket-pirates.html` (JS, CSS and fonts inlined).
