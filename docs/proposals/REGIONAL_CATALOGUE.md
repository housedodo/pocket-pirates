# Regional Mechanics & Puzzle Catalogue (proposal)

Status: **proposal, 2026-11-16.** Phase 3 of three (after `docs/proposals/LORE_BIBLE.md` and `docs/proposals/SYSTEMS_FEEL.md`).
Nothing here is built and nothing here is canon. The owner approves, tweaks or cuts each item by its ID (section 10, the checklist). The brief's sections map as: 0 here; 1 to 3 inside each region (identity, mechanics, puzzles); 4 cross-region sets is section 8; 5 my picks is section 9; 6 the checklist is section 10. No code, no
existing doc and no story line was changed to write it.

**Read for it:** CANON, RULES, AREAS, REGIONS, LORE_BIBLE (all), SYSTEMS_FEEL (all); code: `regions.js`, `systems/reef.js`,
`systems/drowned.js`, `systems/home.js`, `systems/noonbell.js`, `systems/lullaby.js`, `systems/calendar.js` (tide), `sectors.js`
(wedges), `landmarks.js` (coordinates), `regiondecor.js`, `places.js`, `secrets.js`, `digging.js`, `fishing.js`, `caves.js`,
`threads.js` and `thread_mods.js` (headers), `clues.js` (rows and capabilities), the salvage and customs lines of `interact.js` and
`traffic.js`. Nothing was played; every number is from reading (RULES 40).

---

## 0. How to read this

### IDs
- **M-REGION-n**: a regional mechanic variation, a region-wide twist on the core systems. 3 to 4 per region.
- **P-REGION-n**: a small puzzle, 30 seconds to 3 minutes of play. 4 to 5 per region.
- Regions: **HOME** (Home Sound, Tama's waters), **CROWN**, **FREE** (Free Cays), **REEF**, **LANT** (Lantern Guild), **DROWN**
  (the Drowned), and a short **DEEP** section (the Dim and the Lid, any region, dread 0.6 and up).

### Flavour tags (fixed vocabulary)
| Tag | Means |
|---|---|
| Classic | A shape players know from other games (route, race, find the gap, trade) |
| Cosy | Bright reading only; nothing is wrong on the second look |
| Systemic | Changes how existing systems combine, rather than adding a thing |
| Readable | Its main value is something new to read in the world without words |
| Experimental | A new rule whose feel nobody can predict from reading; needs the owner's hands |
| Weird | Has a second look that is quietly wrong |
| Dread-touched | Changes with dread, or only exists in it |
| Quiet | Easy to miss on purpose; nothing points at it |
| Risky-to-build | Needs new AI, new things on the water, or the owner's word on a standing rule |

Puzzles also carry a **span** label: *classic*, *middle*, *experimental* or *weird*, from safe to strange.

### Dependency marks
- **none**: rests only on established canon (CANON, code, existing lines) and today's controls. It may still need new code.
- **L-xx**: rests on a proposed lore item from the lore bible. Cutting the L-item cuts the item (said in each body).
- **G-xx**: rests on a phase-2 proposal. No item here *needs* one; where one would help it says "G-xx helps".
- **REGIONS**: rests on an idea in `docs/proposals/REGIONS.md` that the code does not have (signature weather, the price board,
  regional standing, flash-pattern piloting, route lamp-floats, streets as channels). CANON 2026-11-13 adopted the regions' looks and
  the rules now in `regions.js`; these extra ideas were never built, so they count as unapproved.
- **blocked: B-xx**: waits on an owner decision listed in the lore bible (section 2b).
- "flavour" after an L-id means the lore only gives a harbourfolk reason; the rule works without it.

### Other marks
- **Demo**: *demo-safe* (works in the demo build with its cosy reading only, nothing from after the hut) or *full-only*.
- **Effort**: S under an hour, M a session, L more (as SYSTEMS_FEEL).
- **Place by water.** Every item names the water by `regionAt` (the 550-unit sector), not by a clue's tag (lore bible D-01). Where
  the two disagree it is said. By `sectors.js`: Tama's sector is **home** (within 275 of the sea's centre on each axis); the Grey Tooth,
  Teo, Ilse, the Cup, the Hammock Isle, Glass Lagoon and the Sunken Street lie in Free Cays water; the Drowned Bell, the Name Wall and
  the Throwers' Wreck in mixed Free/Reef water; Wick's Rock in mixed Crown/Free water; Hollowgreen, the Ribs, the Oil Press, the
  Keepers' Ledger, the Halved Isle and the Dark Tower in Lantern water; Customs Pier and the Fort in Crown water.
- Dread numbers are quoted as numbers, never as stage names (SYSTEMS G-31: three stage schemes exist).
- An hour is about 29 s of play; a tide cycle is 345 s; the belt is open about 40% of each cycle (about 138 s).

### Overview
| ID | Region | Name | Type | Tags | Depends | Demo |
|---|---|---|---|---|---|---|
| M-HOME-1 | Home | Noon slack | mechanic | Cosy, Readable, Systemic | none | demo-safe |
| M-HOME-2 | Home | Fishers' marks | mechanic | Classic, Readable | none | demo-safe |
| M-HOME-3 | Home | Gulls go home | mechanic | Cosy, Readable | none | demo-safe |
| M-HOME-4 | Home | Still warm | mechanic | Cosy, Systemic | none | demo-safe |
| P-HOME-1 | Home | What the noon shows | puzzle (classic) | Cosy, Readable | none | demo-safe |
| P-HOME-2 | Home | The empty mark | puzzle (classic) | Classic, Readable | none | demo-safe |
| P-HOME-3 | Home | Wick answers | puzzle (middle) | Cosy, Readable | none | demo-safe |
| P-HOME-4 | Home | The Sunday race | puzzle (classic) | Classic, Risky-to-build | none | demo-safe |
| P-HOME-5 | Home | Home by the hush | puzzle (experimental) | Quiet, Experimental | none | demo-safe |
| M-CROWN-1 | Crown | Pennants come down | mechanic | Readable, Systemic | none | demo-safe |
| M-CROWN-2 | Crown | Office hours | mechanic | Systemic, Dread-touched | none | demo-safe (dread part full-only) |
| M-CROWN-3 | Crown | Charter runs | mechanic | Classic | REGIONS | demo-safe |
| M-CROWN-4 | Crown | Declared salvage | mechanic | Systemic, Risky-to-build | none | demo-safe |
| P-CROWN-1 | Crown | Rowing the lane | puzzle (classic) | Classic, Cosy | none | demo-safe |
| P-CROWN-2 | Crown | Running dark | puzzle (middle) | Classic, Risky-to-build | none | demo-safe |
| P-CROWN-3 | Crown | The declared wreck | puzzle (middle) | Systemic | none | demo-safe |
| P-CROWN-4 | Crown | Reckoning Day | puzzle (classic) | Classic | L-11 | full-only |
| P-CROWN-5 | Crown | The line already written | puzzle (weird) | Weird, Dread-touched | none | full-only |
| M-FREE-1 | Free Cays | Turned-round day | mechanic | Cosy, Systemic | none (L-13 flavour) | demo-safe |
| M-FREE-2 | Free Cays | Fires on the sandbars | mechanic | Readable, Quiet | L-14 | demo-safe (by the hour) |
| M-FREE-3 | Free Cays | Still nights | mechanic | Systemic, Quiet | REGIONS | demo-safe |
| M-FREE-4 | Free Cays | Oil for the night | mechanic | Systemic | REGIONS | demo-safe |
| P-FREE-1 | Free Cays | The loose kite | puzzle (classic) | Cosy, Classic | none | demo-safe |
| P-FREE-2 | Free Cays | Sight-casting in the lagoon | puzzle (classic) | Classic, Systemic | none | demo-safe |
| P-FREE-3 | Free Cays | Lamp out to see the shore | puzzle (experimental) | Experimental, Readable | none | demo-safe |
| P-FREE-4 | Free Cays | Out on a storm night | puzzle (middle) | Dread-touched, Risky-to-build | none (L-15 flavour) | full-only |
| M-REEF-1 | Reef | Teeth under the tide | mechanic | Readable, Systemic | none | demo-safe |
| M-REEF-2 | Reef | Stake your claim | mechanic | Systemic, Risky-to-build | L-16 | demo-safe |
| M-REEF-3 | Reef | Pay the toll | mechanic | Systemic | L-17 | demo-safe |
| M-REEF-4 | Reef | Salvage by the waterline | mechanic | Classic, Readable | none (L-18 flavour) | demo-safe |
| P-REEF-1 | Reef | The gap in the white | puzzle (classic) | Classic, Readable | none | demo-safe |
| P-REEF-2 | Reef | Before the tide takes it | puzzle (classic) | Classic, Systemic | none | demo-safe |
| P-REEF-3 | Reef | Onto the teeth | puzzle (middle) | Systemic, Risky-to-build | none | demo-safe |
| P-REEF-4 | Reef | The stake with no wreck | puzzle (weird) | Weird, Quiet | L-16 | full-only |
| P-REEF-5 | Reef | The bell in the fog | puzzle (weird) | Weird, Dread-touched, Risky-to-build | L-29; blocked: B-20 | full-only |
| M-LANT-1 | Lantern | Every light its rhythm | mechanic | Classic, Readable | REGIONS | demo-safe |
| M-LANT-2 | Lantern | Lit roads | mechanic | Systemic, Risky-to-build | REGIONS | demo-safe |
| M-LANT-3 | Lantern | Noon fog | mechanic | Systemic | REGIONS | demo-safe |
| M-LANT-4 | Lantern | Nothing from the deep | mechanic | Quiet, Dread-touched | L-20 | demo-safe |
| P-LANT-1 | Lantern | Keep in sight of a light | puzzle (classic) | Classic, Systemic | none | demo-safe |
| P-LANT-2 | Lantern | Rhythm in the fog | puzzle (classic) | Classic, Readable | REGIONS | demo-safe |
| P-LANT-3 | Lantern | The keeper's supper | puzzle (middle) | Cosy | none (L-20 flavour) | demo-safe |
| P-LANT-4 | Lantern | The sheen off the press | puzzle (weird) | Weird, Quiet | none (L-20 flavour) | full-only |
| M-DROWN-1 | Drowned | Streets at low water | mechanic | Readable, Systemic | REGIONS | full-only |
| M-DROWN-2 | Drowned | Lamps rowing home | mechanic | Quiet, Readable | none (L-22 flavour) | full-only |
| M-DROWN-3 | Drowned | Lit wrecks are kept | mechanic | Weird, Dread-touched | L-24 | full-only |
| M-DROWN-4 | Drowned | Low-water hours | mechanic | Systemic | none | full-only |
| P-DROWN-1 | Drowned | In by the street | puzzle (classic) | Classic, Readable | REGIONS | full-only |
| P-DROWN-2 | Drowned | A fish for the pier | puzzle (classic) | Systemic | none | full-only |
| P-DROWN-3 | Drowned | Follow the lamps | puzzle (middle) | Quiet, Classic | none (L-22 flavour) | full-only |
| P-DROWN-4 | Drowned | The step at low water | puzzle (weird) | Weird, Dread-touched | none | full-only |
| M-DEEP-1 | Deep | The sea runs the wrong way | mechanic | Weird, Dread-touched | none | full-only |
| P-DEEP-1 | Deep | Against the gulls | puzzle (middle) | Readable, Dread-touched | none | full-only |

Counts: 25 mechanics, 28 puzzles (Home 4/5, Crown 4/5, Free Cays 4/4, Reef 4/5, Lantern 4/4, Drowned 4/4, Deep 1/1).

### What already exists (not re-proposed)
The Kestrel's two-post transit and its lamp; the noon-shadow dig and the four beach kinds; low-tide wrecks, smoke camps, the dusk
watchers and the dusk gulls (`secrets.js`); the four caves; every hand-made place's `need` (the Cup at high water, the Marigold at low,
the Sunken Street at the lowest with Mara aboard, Teo and Ilse on still nights, the Tower on calm nights); the Crown's lane arrival,
record, deadlines and customs; the Lantern's dead lights and lamp burn; the Reef's coral, dawn shoals, storm wrecks and bounty; the
Drowned's belt and keeping; the seven threads, including the Bell Below's stroke count (`thread_mods.js`). Items that extend one of
these say "extends".

---

## 1. Home Sound (Tama's waters)

### 1.1 Regional identity
- **Look and light.** Tama's Crown-classic town, a red-and-white lighthouse, Velto's nets; bright, busy water. By `regionAt` home is
  Tama's own sector (within 275 of the centre each way); the Sound as `home.js` draws it runs to 450 from Tama.
- **Rules (numbers).** No gate. A low throw's dread is not felt inside 450 and is fully felt again by 600 (`homeShift`). Tama's noon
  bell rings one stroke (swing 1.6 s, a stroke's life 4.2 s); while it swings the swell within 260 lies down by up to 60% (`homeCalm`,
  rising 1.2/s, letting go 0.4/s). Chapters I and II get the gentler wind wedge (0.68 pi to 0.97 pi, floor 0.45).
- **Lore it carries.** Q5 (Tama's bells, CL-C3-a), Q3 (the Kestrel, CL-K-a, weight 2; the three small wrong things, each once,
  CANON 2026-11-12). Velto is kept plain (L-05, proposed). L-06 "past hearing", L-07 "we ring it gently" (proposed).
- **Feeling.** The normal. Safe, learnable, a little proud. What you learn here is what you use far out.
- **Never reveal.** What the bell is for; that home is where it is kept gentle; any count of strokes (B-12); who the earlier sailors
  were. No clue and no earlier-dream fragment in Velto. **No new wrong thing near home**: canon fixes three before the hut.

### 1.2 Mechanic variations

**M-HOME-1 Noon slack** — Cosy, Readable, Systemic · depends: none · demo-safe
- *Rule.* From 11:30 to 12:30 (about 29 s of play), within 260 of Tama, the hush holds for the hour instead of for one stroke: the
  swell lies down by 60%, no new gust patches form, the current lanes in the Sound run at half strength, and in water shallow enough
  the bottom shows through. The bell still swings at noon exactly as now.
- *Read by.* The water going glassy (wave height), the seabed in the shallows, the gust patches and current foam fading; the HUD clock.
  The bell's swing stays the sound's silent twin.
- *Controls.* No new verb. Anchoring and E-targets sit steadier; sailing is slower without gusts: a breathing space at midday.
- *Lore.* GUIDE L4 (the swell lies down at the noon bell, built); CANON 2 backstage (the bells ring softly). L-07 only as flavour.
- *As dread rises.* Not at all: home is gentle, and dread does not rise there.
- *Region rule.* **Extends** `home.js`. It decouples the hush from the stroke count, so it works whatever the owner decides for B-12
  (one stroke today lasts about 4 s, too short to build anything on).
- *Effort.* S for the rule (`systems/home.js` hour window; `seaplay.js` gusts off and lanes x0.5 inside reach). The seabed showing is
  design's (`seawater.js`), M.
- *Risks.* Overdone, noon reads as magic. Keep the bottom showing to the shallows only.

**M-HOME-2 Fishers' marks** — Classic, Readable · depends: none (G-05 helps) · demo-safe
- *Rule.* Each seed has three fishing marks in Home Sound, each where two tall things that already stand line up by eye (Tama's
  lighthouse, Wick's light, the Grey Tooth, the Drowned Bell's tower, Hollowgreen's dark wood). Within 12 of a mark the bite wait is
  x0.7 and snapper, bream and grouper count as in their habitat at any hour. From 06:00 to 15:00 a Tama or Velto fishing boat lies at
  anchor on each mark; at 15:00 they go home.
- *Read by.* The anchored boats (always the same three places), and two things in line when you sit where they sat.
- *Controls.* Anchor by E or C (C under way needs G-05; today the player slows by hand under 2.5), fish as now.
- *Lore.* The pilots' transit is already the Kestrel's language (`secrets.js`); the fishers already tell habitats (`HABITAT.say`).
- *As dread rises.* Not at all.
- *Region rule.* **Sits beside**; it teaches the Kestrel's technique on something harmless first.
- *Effort.* M: a small `homemarks.js` (marks from landmark pairs), `traffic.js` (three anchored boats), `fishing.js` (a `mark` zone).
- *Risks.* A mark must never fall on the Kestrel's line: that line stays the only one with a ship under it.

**M-HOME-3 Gulls go home** — Cosy, Readable · depends: none (L-30 flavour) · demo-safe
- *Rule.* At dusk (17:30 to 19:30) inside Home Sound the dusk gulls fly toward Tama's harbour, not the nearest land; at dawn they fly
  out from it. Elsewhere nothing changes (nearest land; the wrong way past dread 0.55, as built).
- *Read by.* The loose V of gulls that already crosses about 30 ahead of the bow.
- *Controls.* None new. A way home without a dot.
- *Lore.* `secrets.js` birds (built). L-30 "gulls carry the news" as flavour only.
- *As dread rises.* Home has none. The built reversal far out becomes readable because home taught the rule (P-DEEP-1).
- *Region rule.* **Extends** `secrets.js`.
- *Effort.* S (`secrets.js`, the target of the flock).
- *Risks.* None worth naming; dusk only.

**M-HOME-4 Still warm** — Cosy, Systemic · depends: none · demo-safe
- *Rule.* Between 11:00 and 13:00 each Home Sound harbour board may post one warm delivery (its house dish: harbour fish pie at Tama,
  fisher's stew at Velto). Handed in within two game hours (about 58 s) it pays x1.3; later it pays as any delivery, never less.
- *Read by.* A covered basket on the deck with a thin thread of steam while it is warm, gone when it is not; the clock.
- *Controls.* A plain delivery. It teaches the Crown's deadline with no penalty.
- *Lore.* House dishes by village style (`harbourlife.js` DISHES, built).
- *As dread rises.* Not at all.
- *Region rule.* **Sits beside**; the soft cousin of `deadlineFor`.
- *Effort.* M: `jobs.js` (a warm flag), the basket and steam on deck (design).
- *Risks.* One more lever in the economy; keep the bonus small.

### 1.3 Puzzle variations

**P-HOME-1 What the noon shows** — span classic · Cosy, Readable · depends: none · needs M-HOME-1 · demo-safe
- *Setup.* At the noon slack the shallows near Tama show their bottom. In one shallow patch (one per seed, within 260 of Tama, clear of
  the pier by 30) lies a small keg with a painted band. Bright reading: something rolled off a boat on regatta day.
- *Play.* (1) The player sees the water go glassy at noon (the slack is hard to miss near Tama). (2) Sailing over the shallows in the
  slack, one patch shows a dark shape with a pale band. (3) E within 14 (the salvage prompt) anchors and the crew hook it up (3.4 s, as
  a wreck). *Wrong try:* outside the slack the keg cannot be seen, so there is no prompt and nothing happens; it is there again at the
  next noon.
- *Second look.* None. Home stays plain.
- *Lore.* GUIDE L4; the low-tide sand patch in `secrets.js` is the same pattern (a thing that shows only when the water allows).
- *Reward.* Cargo: the keg sells for 25 to 40 at any harbour.
- *Pacing.* 30 to 60 s, set by the slack's hour.
- *Repeat.* Once per voyage.
- *Effort, risks.* S on top of M-HOME-1 (`secrets.js` spot, `interact.js` target visible only in the slack). Depends on design
  making the bottom readable.

**P-HOME-2 The empty mark** — span classic · Classic, Readable · depends: none (G-05 helps) · needs M-HOME-2 · demo-safe
- *Setup.* By day the Velto boats lie on their marks. After 15:00 they row home, and the water where they lay is empty.
- *Play.* (1) Over a few days the player sees boats always in the same three places. (2) After they leave, the player sails to one of
  them and looks for what stood behind the boat: two tall things in line. (3) Anchors on the line (E or C) and fishes. On the mark a
  morning snapper bites in the afternoon, or a golden grouper away from any wreck. *Wrong try:* off the line by more than 12, it is
  ordinary fishing. Nothing lost.
- *Second look.* None.
- *Lore.* The transit (Kestrel, `secrets.js`); the fishers' habitat lines.
- *Reward.* A catch (grouper pays 14 a kg).
- *Pacing.* 1 to 2 minutes: the sail, one cast (wait 2.5 to 7 s), the fight.
- *Repeat.* Daily.
- *Effort, risks.* Rides on M-HOME-2. None beyond it.

**P-HOME-3 Wick answers** — span middle · Cosy, Readable · depends: none · demo-safe
- *Setup.* Wick's Rock at night, its beam sweeping (lighthouse beams exist, `world.js`). Bright reading: a keeper who looks after boats.
  **Placement:** Wick's Rock is about 536 from the sea's centre, in mixed Crown/Free water by `regionAt`, outside Tama's sector. If the
  owner wants this strictly in home water, the same puzzle runs on Tama's own lighthouse.
- *Play.* (1) The player once sees a Velto boat at night blink its lamp twice near the rock, and the beam stop on it for a moment: the
  language is shown, never told. (2) Within 150 of the rock the player puts the lantern out and lights it again twice within 6 s (L four
  times). (3) The beam stops sweeping and holds for 20 s on one bearing: the nearest salvage barrel, bottle or unvisited treasure isle
  within 600, then sweeps again. *Wrong try:* one blink, or too slow: the beam keeps turning.
- *Second look.* None. Wick is kind.
- *Lore.* VISITS keeper ("Wick keeps the light"); PAS-0012 ("so the harbours can find the ships").
- *Reward.* A find: a barrel, a bottle, an isle.
- *Pacing.* 30 s to ask and see; 1 to 2 minutes to sail there.
- *Repeat.* Once a night.
- *Mara (once, optional).* "He saw us. Good old Wick."
- *Effort, risks.* M: beam hold (design), a blink detector on L (`oil.js` or `main.js`), one blinking boat (`traffic.js`). **The beam
  never holds on a story place, a clue or a goal** (RULES 11): it points only at optional finds.

**P-HOME-4 The Sunday race** — span classic · Classic, Risky-to-build · depends: none · demo-safe
- *Setup.* The Sunday regatta (Sunday afternoons, `traffic.js` schedule) gathers off Tama when the ship is in the Sound: six boats with
  coloured sails hove-to by a committee boat flying a flag.
- *Play.* (1) When the committee flag drops, all six raise sail at once (seen). (2) They round a rolled isle 150 to 200 out and come
  back to Tama: about 400 units, 50 to 80 s. (3) Following them shows the course; catching gust patches and the current lane is how you
  beat them. Dock at Tama before the last boat is in and the harbour pays the purse (one harbour row). *Wrong try:* last in: the boats
  moor, nothing else. A late start may still race.
- *Second look.* None.
- *Lore.* SM F5 (the Sunday regatta); CANON 2026-11-13 (no sighting messages: the race just happens).
- *Reward.* Coin, 30 to 60 by how many boats you beat.
- *Pacing.* 1.5 to 3 minutes.
- *Repeat.* Weekly.
- *Effort, risks.* L: race AI with gust use (`traffic.js`), a harbour row (`ui/harbour.js`, story export). AI fairness. Independent of
  the bell (B-12): the start is the flag, not a stroke.

**P-HOME-5 Home by the hush** — span experimental · Quiet, Experimental · depends: none · needs M-HOME-1 · demo-safe
- *Setup.* Weather fog in Home Sound in the noon hour (rare at home: fog scales with dread). Bright reading: fog bells guide boats home.
- *Play.* Within 260 of Tama in the slack, the swell is flatter the nearer you are to Tama (a radial falloff of the hush). In fog you
  steer toward the flatter water and find the pier. With sound on, the noon stroke helps; with sound off, the flat water is its twin.
  *Wrong try:* steering into rougher water takes you out of reach; the fog lifts in its own time. Nothing traps.
- *Second look.* Backstage only: the water lies down near home. Never said, never shown as more than calm.
- *Lore.* GUIDE L4; CANON 2 (backstage).
- *Reward.* The way home.
- *Pacing.* 30 to 40 s: you are found only if you are already near (260 at 8 units/s is about 33 s).
- *Repeat.* Whenever noon fog falls at home.
- *Effort, risks.* S on top of M-HOME-1 (a falloff with distance). The tell may go unnoticed; that is acceptable for a Quiet item.

---

## 2. The Crown Traders (north wedge)

### 2.1 Regional identity
- **Look and light.** Cobalt water, clean white sky, the longest view; a buoyed lane into every harbour (five pairs, 12 to 56 out, red
  to one side, green to the other, lit at night), a white signal mast with six pennants, lone daymarks off other Crown isles; merchant
  brigs, galleons, customs cutters (15% of Crown traffic).
- **Rules (numbers).** Timed deliveries: allowed distance/6 + 60 s; on time x1.45, late x0.55. The shared record: +5% a clean line up
  to five (+25%), -15% a black line, never below x0.55; three clean in a row wipe a black. One clean line a day per harbour for coming in
  between the buoys (8 to 75 out, within 8.5 of the lane's middle). Customs cutters close in from 200 and inspect at 24 (dark cargo
  taken, a black line; else a stamp and 5 gold). Fruit sells x1.5. After the Customs Pier, `arrivals` shows the next line faint.
- **Lore it carries.** Q1 (Customs Pier, 600; the Governor's Fort, 999), Q4 (the Fort's small numbers); threads: the Ferryman's Coin,
  the Strange High House. Proposed: L-08 lines, L-09 buoy-keepers, L-10 loud bells, L-11 Reckoning Day, L-12 the paper, L-33 chalkers.
- **Feeling.** Tidy, proud, a little tired. You are being written down, and it is mostly about trade.
- **Never reveal.** Who writes the master's line or the lines ahead; why the books are kept; that the record is about anything but trade.

### 2.2 Mechanic variations

**M-CROWN-1 Pennants come down** — Readable, Systemic · depends: none · demo-safe
- *Rule.* While you carry a timed Crown delivery, the destination harbour's signal mast flies one pennant for each game hour left (up to
  its six); one is struck each hour (about 29 s). When the last is down you are late. A 300-unit run (110 s allowed) starts at four.
- *Read by.* The pennant string, which the Crown's long view lets you count from far off; the HUD clock.
- *Controls.* None new; it rewards route choice (current lanes, gust patches).
- *Lore.* REGIONS (the mast); the deadline rule (built).
- *As dread rises.* Unchanged: the masts are the Crown's order.
- *Region rule.* **Extends** deadlines. It **replaces** REGIONS' unbuilt "a pennant each time you arrive" for the same mast.
- *Effort.* M: `regiondecor.js` (pennants as separate meshes), `regions.js`/`jobs.js` (hours left), `main.js`.
- *Risks.* None against RULES 11: the destination of an errand in hand may already be shown.

**M-CROWN-2 Office hours** — Systemic, Dread-touched · depends: none (L-08 flavour) · demo-safe (the dread part full-only)
- *Rule.* The Crown's book keeps day hours. From 18:00 to 06:00 a timed delivery's clock stops and the boards post no timed work; the
  harbour office window is dark. Past dread 0.5 in Crown water (full game) the window stays lit and the clock no longer stops at night.
- *Read by.* The office window, lit or dark (a village light); with M-CROWN-1, pennants that are not struck at night.
- *Controls.* None new.
- *Lore.* PLC-0043 ("We never worked out why we keep it"); the Fort's sight line, "a pale fort with one lit window" (landmarks.js).
- *As dread rises.* The book never shuts far out. Ordinary reading: busy clerks. Second look: Q1, unspoken.
- *Region rule.* **Extends** `jobPay`/`nowD`.
- *Effort.* M: `regions.js` (deadline counted in day hours), the window light (design). Saved deadlines change meaning: a save
  migration for `due` (RULES 31).
- *Risks.* Night deliveries become free time; that may be the point (the Crown rests, the Cays wake).

**M-CROWN-3 Charter runs** — Classic · depends: REGIONS (regional standing) · demo-safe
- *Rule.* With five clean lines and no black, a Crown board may offer a charter: three Crown harbours in a fixed order, one cargo left at
  each, each leg timed. Each leg on time pays x1.45, the third x1.6. A late leg ends the charter, paid to that point, with one black line.
- *Read by.* The record's row of ticks (built) is the only gate; nothing new to read.
- *Lore.* The record (built); REGIONS "regional standing".
- *As dread rises.* Unchanged.
- *Region rule.* **Extends** the record.
- *Effort.* M: `jobs.js`, `regions.js`, one board row (story export).
- *Risks.* It is the most ordinary item here; it earns its place only if the middle of the game needs more Crown work.

**M-CROWN-4 Declared salvage** — Systemic, Risky-to-build · depends: none (L-08 flavour) · demo-safe
- *Rule.* Wreck salvage in Crown water is not paid on the spot: it goes into the hold. Declared at a Crown harbour it pays as found
  and earns a clean line; sold in any harbour outside Crown water it pays x1.3 (no dues). A customs cutter that inspects you while you
  carry undeclared Crown salvage writes a black line and takes it. So: the record, or the gold.
- *Read by.* The cutter turning toward you from 200 (built); the salvage in the hold; the market's sell row.
- *Lore.* Customs cutters and dark cargo (`traffic.js`, built).
- *As dread rises.* Unchanged.
- *Region rule.* **Replaces** instant salvage gold, for Crown water only. It stands opposite the Reef's x1.5 and the Drowned's keeping.
- *Effort.* M: `interact.js` (salvage to the hold), `ui/harbour.js` (declare), `traffic.js` (`onCustoms`).
- *Risks.* Changes a habit in one region; a cutter's black line can feel like a gotcha unless the cutter is always seen coming.

### 2.3 Puzzle variations

**P-CROWN-1 Rowing the lane** — span classic · Classic, Cosy · depends: none · demo-safe
- *Setup.* A Crown harbour on a day the wind blows straight out along its buoyed lane, so the lane lies in the wind ring's dead arc.
  Bright reading: a tidy harbour that ticks a line for ships that come in properly.
- *Play.* (1) Under sail the ship cannot hold the lane's heading, and a tack (turning radius about 11) is wider than the lane (17).
  Coming in outside the buoys opens the harbour as usual but gives no tick. (2) The player furls and rows (G): 2.6 units/s, turning at
  rest, between the five pairs (about 25 s). (3) Docks: a clean tick appears on the record. *Wrong try:* no tick, nothing else.
- *Second look.* None.
- *Lore.* `inLane`, `laneArrival` (built); L-09 as flavour.
- *Reward.* A clean line (+5% on Crown pay, up to +25%).
- *Pacing.* 30 to 60 s.
- *Repeat.* Once a day per harbour (the rule's own limit).
- *Mara (once, optional).* "Oars, Captain? In front of the whole town?"
- *Effort, risks.* None to S: it should already work (check that `inLane` counts a rowing ship). The tick may need to be more visible
  in the harbour (design).

**P-CROWN-2 Running dark** — span middle · Classic, Risky-to-build · depends: none · demo-safe
- *Setup.* At night a brig leaves a Crown harbour with no lamps and turns out of the lit lane. Bright reading: a smuggler, a bit of
  harbour mischief.
- *Play.* (1) Among lit traffic, a dark sail stands out against the sky (easier under a full moon). (2) Follow at 60 to 150. With your
  lamp lit and within 100, it sees you and turns back to harbour: the chase is off for tonight. (3) Put the lamp out (L; the dark closes
  in to 32%, a real cost) and follow its sail. (4) It anchors in the lee of a rolled isle 300 to 500 away. (5) Hail the next customs cutter
  you meet (E within 24): it turns for the cove; or hail the brig yourself and it sells you its cargo at x0.6. *Wrong try:* it spots you
  and goes home; try another night.
- *Second look.* None. The Crown fears disorder, not the dark.
- *Lore.* Customs (built); L-09 ("Outside them you are weather") as flavour.
- *Reward.* 30 and a clean line, or cheap cargo.
- *Pacing.* 2 to 3 minutes.
- *Repeat.* About one night in four, at one Crown harbour.
- *Effort, risks.* L: smuggler AI that reads your lamp (`traffic.js`), a hail choice (`interact.js`). A chase in a slow ship can drag;
  keep the cove within 500.

**P-CROWN-3 The declared wreck** — span middle · Systemic · depends: none · needs M-CROWN-4 · demo-safe
- *Setup.* A wreck in Crown water a little off a lane; a cutter on the horizon (the long view shows it at 300 or more).
- *Play.* (1) Salvage it (3.4 s). (2) The cutter turns toward you once you are within 200. (3) Choose: run for the nearest Crown lane and
  declare (as found, and a clean line), or run out of Crown water (the colour blend and the place line show the edge) and sell it at
  any harbour beyond for x1.3. *Wrong try:* caught inside Crown water
  with it undeclared: a black line and the salvage taken. Three clean lines wipe it.
- *Second look.* None.
- *Lore.* Customs (built).
- *Reward.* Coin or record.
- *Pacing.* 1 to 3 minutes.
- *Repeat.* Any Crown wreck.
- *Effort, risks.* S on top of M-CROWN-4. Tune the cutter slower than the Gull on a broad reach.

**P-CROWN-4 Reckoning Day** — span classic · Classic · depends: L-11 · full-only
- *Setup.* On the Fort's festival day, a Lantern harbour's board offers a sealed ledger box for the Governor's Fort, due by noon.
- *Play.* A long timed run, Lantern water to Crown water (about 1,000 units), across the mixed water where the wedges meet. The Fort's
  mast (M-CROWN-1, if built) shows the hours. The straight line runs near home; the current lanes may beat it. Arrive by noon: the box
  is taken (one harbour row: "Reckoning Day").
- *Second look.* None in this puzzle. It would naturally feed **Q1** (two books, one sea); the clue, if any, is the owner's.
- *Lore.* **L-11 (proposed). Cutting L-11 cuts this puzzle.** CANON 4 (Q1's sources are Crown and Lantern).
- *Reward.* Delivery pay x1.45, and the record.
- *Pacing.* 2 to 3 minutes of sailing.
- *Repeat.* Weekly.
- *Effort, risks.* M: a special job (`jobs.js`), a festival day (`harbourlife.js`). The Fort is a post-hut place: full game only.

**P-CROWN-5 The line already written** — span weird · Weird, Dread-touched · depends: none (needs `arrivals`, CL-C1-a) · full-only
- *Setup.* Once per voyage, after the Customs Pier, while the player holds a tight timed Crown delivery: the record's faint next line
  (the `arrivals` capability, built) is a black one.
- *Play.* (1) The player sees the faint black mark beside the clean ticks. (2) The run can be made on time only by the current lane or a
  chain of gust patches (both visible). (3) On time: the faint black turns into a clean tick, as it should. Late: the black line is
  written, as the normal late rule writes it. Nothing extra is lost either way.
- *Second look.* If the player beat it, the record row keeps a faint black mark struck through beside the new tick. Ordinary reading: a
  clerk's correction. It never reaches the log (RULES 8), it never repeats, and nobody comments.
- *Lore.* CL-C1-a (built), CANON 4 Q1, lore bible A-02 (never show who writes).
- *Reward.* A clean line, if beaten.
- *Pacing.* 1 to 3 minutes (one delivery).
- *Repeat.* Once (one flag in `state.story`).
- *Effort, risks.* S to M: `regions.js` `recordMarks` (a struck mark), a flag. Risk: it can read as fate, which leans hard on Q1. Keep
  the struck mark faint; G-33's 15 s grace, if approved, must not apply to this one run.

---

## 3. The Free Cays (east wedge)

### 3.1 Regional identity
- **Look and light.** Emerald lagoon water under a golden haze, the calmest sea; houses on stilts by the way in, canoes, coloured lantern
  strings at night. Teo's Sandbar (495, 70), Ilse's Rock (880, 190), the Cup, the Hammock Isle, Glass Lagoon and the Grey Tooth lie in
  Cays water; so does the Sunken Street (a Drowned clue, D-01).
- **Rules (numbers).** Everything safe follows the music (`caysQuiet`: `lullK` > 0.5, rising at 0.2/s when in the Cays, night > 0.4 and
  storm < 0.3): the night market pays x1.4 for fish and fruit, no raiders (0.1 when nobody plays), dread held at 0.45. Storm nights are
  unprotected. The music carries 600. Swordfish, cuttlefish and moonfish come into open water and bite x2 in their hours. The demo uses
  the hour (19:00 to 05:00) instead.
- **Lore it carries.** Q2, Q4, Q7 (Teo and Ilse, the Hammock Isle, the Cup, Glass Lagoon); the Music out of the Fog. Proposed: L-13
  night hours, L-14 fire-sitters, L-15 storm nights.
- **Feeling.** Warm, slow, slightly too comfortable.
- **Never reveal.** That the music keeps anything asleep; that the Players refused to throw; no second gentle ending; no other tune doing
  what theirs does; fires never soothe anything (L-14's own limit).

### 3.2 Mechanic variations

**M-FREE-1 Turned-round day** — Cosy, Systemic · depends: none (L-13 flavour) · demo-safe
- *Rule.* Cays harbours live by night. From 07:00 to 17:00 the tavern has no passengers and no gossip, and the board posts only
  deliveries out of the Cays. From 17:00 to 05:00 passengers, residents and commissions are about, with the night market.
- *Read by.* Figures asleep on the quay by day (in hammocks, against a wall, a basket on the knees); the lantern strings lit at night.
- *Controls.* None.
- *Lore.* OBJ-0156 (they sleep by day), `marketNote` (stalls shuttered by day): both built. L-13 only gives the greeting.
- *As dread rises.* Nothing new; the existing `caysQuiet` already carries it.
- *Region rule.* **Extends** the market's day and night split to the tavern and the board.
- *Effort.* M: `harbourlife.js`, `passengers.js`, `ui/harbour.js`; sleeping figures (design).
- *Risks.* A by-day player finds the Cays dull. That is the region's character, said by the quay.

**M-FREE-2 Fires on the sandbars** — Readable, Quiet · depends: L-14 · demo-safe (by the hour)
- *Rule.* Whenever the Cays are quiet, each Cays village has a small fire on its nearest sandbar or beach; on storm nights they are out.
  Fish come to firelight: within 40 of a fire, cuttlefish and moonfish count as in habitat, and the night ring's marks glow a little
  brighter (an easier night fight).
- *Read by.* Firelight low on the water at night; dark sandbars on a storm night.
- *Controls.* Fishing as now.
- *Lore.* REGIONS (beach fires; the low firelight as the Players' silent twin). **L-14 (proposed) gives one fire per village "for the
  players". Cutting L-14 cuts the village fires; Teo's own fire stays.**
- *As dread rises.* Fires follow `caysQuiet` and never feed it. On a storm night they are out, and the night is unprotected, as now.
- *Region rule.* **Sits beside** `caysQuiet`: its silent twin made useful.
- *Effort.* M: fires (`regiondecor.js`, design), a `fire` zone in `fishing.js`.
- *Risks.* A player may read the fires as what keeps the dark away. The order of cause in the code must stay one-way.

**M-FREE-3 Still nights** — Systemic, Quiet · depends: REGIONS (signature weather) · demo-safe
- *Rule.* Still nights come two to three times as often in Cays water. On one, the wind there falls to 0.1 to 0.2 and the sea goes
  mirror-flat; sails barely draw, so the oars (2.6 units/s) are the way about, and the canoes come out.
- *Read by.* A slack sail and a low sail bar, lights doubled in the mirror water, canoes rowing.
- *Controls.* Oars (G), unlocked in chapter 2.
- *Lore.* CANON 2026-11-13 (Teo and Ilse on still nights only); REGIONS (still nights in the Cays).
- *As dread rises.* Nothing new.
- *Region rule.* **Sits beside**: it makes "still" common and visible.
- *Effort.* M: `wind.js`/`weather.js` regional factor; mirror water (design).
- *Risks.* Rowing Teo to Ilse (about 400) takes about 150 s. Keep still nights to one night in three at most.

**M-FREE-4 Oil for the night** — Systemic · depends: REGIONS (the price board) · demo-safe
- *Rule.* While the night market is open, Cays harbours buy lamp oil at 0.7 a unit (Tama sells at 0.42, the Guild pays 0.9), up to 40
  units a night per harbour. By day nobody buys it.
- *Read by.* The market's sell row; the lantern strings it burns.
- *Lore.* REGIONS ("lamp oil becomes part of trade").
- *As dread rises.* Nothing.
- *Region rule.* **Extends** `sellMul`; ties the Cays to the Lantern.
- *Effort.* S: `regions.js`, `ui/harbour.js`.
- *Risks.* An oil loop from Tama; the cap holds it.

### 3.3 Puzzle variations

**P-FREE-1 The loose kite** — span classic · Cosy, Classic · depends: none · demo-safe
- *Setup.* Kite Day at a thatch harbour (the kite game exists, `harbourlife.js` GAMES). At dusk a kite breaks loose and drifts
  downwind, high, a coloured diamond with a tail. **Extends** Kite Day. Thatch villages are Cays and Reef; this one is the Cays', where the
  dusk festival fits the turned-round day.
- *Play.* (1) Run downwind after it (the fastest point of sail). (2) The kite drops whenever the wind lulls (strength under 0.6) and
  floats for one game hour (29 s). (3) Come within 14 and E (2.2 s). (4) Bring it back. *Wrong try:* missed the drop: the next gust lifts
  it and it drifts on; past 600 out it lands for good and floats until dawn.
- *Second look.* None.
- *Lore.* Kite Day (built festival).
- *Reward.* 20 gold and the family's house dish (an existing dish buff); the "red kite tail" keepsake already exists.
- *Pacing.* 1 to 2 minutes.
- *Repeat.* Each Kite Day.
- *Effort, risks.* M: a kite in the sky (design), a floating pickup (`seafeatures.js`). It is in the sky, not sea life (RULES 24c).

**P-FREE-2 Sight-casting in the lagoon** — span classic · Classic, Systemic · depends: none · demo-safe
- *Setup.* Inside Glass Lagoon (540, 360, Cays water; "so clear the boat seems to hang in the air"), three to five fish shadows move over
  the white bottom, each species with its own outline (cuttlefish round, snapper long, bream deep-bodied).
- *Play.* (1) Anchor. (2) The cast meter (1.15 s each way) sets how far the bobber lands. (3) Land within about 3 of a shadow and that
  species bites in 1 to 2.5 s. Missed: an ordinary bite roll. The bobber's landing beside the shadow teaches the distance.
- *Second look.* None. The lagoon's own clue stays the chest.
- *Lore.* VISITS lagoon; `HABITAT`; `CAYS_DUSK`.
- *Reward.* The species you chose (a commission's fish).
- *Pacing.* 30 to 90 s.
- *Repeat.* Yes.
- *Effort, risks.* M: cast distance from power (`fishing.js`), shadows inside the lagoon only (design). The lagoon sits behind a
  barrier; a ship not yet fitted for it cannot try this.

**P-FREE-3 Lamp out to see the shore** — span experimental · Experimental, Readable · depends: none · demo-safe
- *Setup.* A new-moon night in the Cays, lamp lit, looking for a harbour or a fire. Far lights are faint inside your own glow.
- *Play.* (1) Put the lamp out (L). (2) After 3 s far lights (lantern strings, fires, lighthouse lamps) brighten x1.8 and carry twice as
  far, while the near water goes dark. (3) Pick the harbour's lights, sail, light up again at the pier. *Wrong try:* lamp left on: the
  lights are still there, only faint.
- *New rule.* With the lamp lit, glow lights beyond 150 are dimmed to 0.55. It is global, but the Cays are where it pays: a lit shore
  and a safe dark. In Lantern water the opposite pays (P-LANT-1).
- *Second look.* None.
- *Lore.* The lantern strings (built); `caysQuiet` (the dark there is safe while somebody plays).
- *Reward.* The way; a view.
- *Pacing.* 30 to 60 s.
- *Repeat.* Yes.
- *Mara (once, optional).* "Lamp out a moment. There. Lights."
- *Effort, risks.* S to M: `oil.js`/`main.js` (lamp state to the glow material), design must agree, since every night changes a little.

**P-FREE-4 Out on a storm night** — span middle · Dread-touched, Risky-to-build · depends: none (L-15 flavour) · full-only
- *Setup.* A storm night in the Cays: nobody plays, the lantern strings are dark, the doors barred (seen). One canoe's lamp bobs 150 to
  300 off a harbour.
- *Play.* (1) Reef the sail (trim under full: the sail bar's strain, warning at 7, tear at 20). (2) Find the bobbing lamp in the rain
  (P-FREE-3's trick helps). (3) Within 24, hail (E): the fisher comes aboard as a passenger. If the passenger berth is taken, his canoe
  follows in your wake at 30. (4) Dock at his harbour. *Wrong try:* a torn sail (patch it); a raider (0.1 when nobody plays); the dread
  is not held tonight. Nothing ends.
- *Second look.* None spoken. The night itself is the wrong thing: silence where there is music every other night.
- *Lore.* `caysQuiet`, `raiderChance` (built); L-15 as flavour.
- *Reward.* 25 and a reputation step at that harbour.
- *Pacing.* 1.5 to 3 minutes.
- *Repeat.* Once per storm night; storm nights are rare.
- *Mara (once, optional).* "Somebody is out in this."
- *Effort, risks.* M: a drifting canoe (`traffic.js` or `seafeatures.js`), the passenger hand-off. Full game only because in the demo
  the hour, not the music, decides, so a storm night there is still quiet.

---

## 4. The Reef Brotherhood (south-west wedge)

### 4.1 Regional identity
- **Look and light.** Jade shoal water, grey salt sky, heavy chop and spray haze; black coral heads in white breakers across the way in,
  a mast leaning out of the water; schooners.
- **Rules (numbers).** Coral bites only above speed 1.2: 6 + 1.2 x speed to the hull, speed x0.25, 1.5 s between hits. A harbour keeps a
  channel open (within 10 of its line). The heads are laid out again each dawn. In a blow (storm over 0.5) a wreck rises 70 to 110 from
  the ship, once a blow; once the tide has come in, the next low water (under -0.5) takes it, **but only while the ship is more than 60
  away**. Salvage x1.5 (and, everywhere, x1.3 below tide -0.45). Raiders 0.22, breaking off past dread 0.55; a bounty of 40 at the next
  Reef harbour; powder and sailcloth x0.6.
- **Lore it carries.** Q3 and Q4 (the Name Wall and the Throwers' Wreck lie in mixed Free/Reef water; the Ribs in Lantern water,
  D-01); the Other Captain. Proposed: L-16 naming right, L-17 accounts both ways, L-18 tide rule, L-26 the stool at the sea end, L-29 the
  fog bell.
- **Feeling.** Rough, salty, honourable in its own way. Ships come here and stay.
- **Never reveal.** Whose names are wet at the top; that the Marigold's captain was like you; who sailed the Raven, or how long; no
  log concludes.

### 4.2 Mechanic variations

**M-REEF-1 Teeth under the tide** — Readable, Systemic · depends: none · demo-safe
- *Rule.* Coral heads break white at low and middle tide. Above tide 0.4 the white fades to a pale-green slick over each head; above 0.7
  to a faint ripple ring. They bite the same at any tide.
- *Read by.* White water against slick; the HUD tide mark.
- *Controls.* The bite threshold (speed 1.2) makes ghosting in at bare steerage the safe way in at high water.
- *Lore.* REGIONS (breakers over the heads); `reef.js`.
- *As dread rises.* Nothing new.
- *Region rule.* **Extends** coral.
- *Effort.* S: foam opacity by tide (`regiondecor.js`, design).
- *Risks.* Fairness: there must always be a tell (RULES 28 in spirit). The faint ring at 0.7 is the floor.

**M-REEF-2 Stake your claim** — Systemic, Risky-to-build · depends: L-16 · demo-safe
- *Rule.* After salvaging a wreck in Reef water, E again within 22 plants a stake with a white rag (2.2 s). While the stake stands, the
  wreck yields again every 3 days at half value. A blow in Reef water takes your oldest stake. At most three.
- *Read by.* The rag on its stake, seen far through the haze.
- *Lore.* **L-16 (proposed). Cutting L-16 cuts this mechanic.** REGIONS (stakes with white rags, unbuilt); the Ribs' "every: 3" in
  VISITS (built).
- *As dread rises.* Nothing.
- *Region rule.* **Extends** salvage x1.5.
- *Effort.* M: `seafeatures.js`, `interact.js`, `state.story.stakes`.
- *Risks.* A prop on the open water beside a wreck: owner's word (RULES 24c).

**M-REEF-3 Pay the toll** — Systemic · depends: L-17 (G-22 helps) · demo-safe
- *Rule.* A raider that has engaged you can be hailed (E within 24) before its second shot: pay 15% of your gold (at least 10) and it
  dips its black flag and sheers off. The next bounty you claim pays the toll back on top. That raider does not engage you again that day.
- *Read by.* The flag dipping, the raider turning away.
- *Controls.* Hail (built verb); fighting stays optional. G-22's puff before each shot would tell when the second shot is coming.
- *Lore.* **L-17 (proposed). Cutting L-17 cuts this mechanic.** `BOUNTY` (built).
- *As dread rises.* Raiders break off past 0.55, as now.
- *Region rule.* **Sits beside** the bounty.
- *Effort.* M: `traffic.js`, `combat.js`, hailing a hostile ship.
- *Risks.* Hail range 24 is inside the fight range 85, so you take one volley first.

**M-REEF-4 Salvage by the waterline** — Classic, Readable · depends: none (L-18 flavour) · demo-safe
- *Rule.* Today every wreck pays x1.3 below tide -0.45. In Reef water make it three steps you can see: above tide 0.3 only the deck shows
  (x0.8, 2.2 s); in between, as now; below -0.45 the hold is bare (x1.3 as now, plus one more loot roll). Reef wrecks sit visibly higher
  as the water falls (up to 1.5, as the low-tide wrecks in `secrets.js` do).
- *Read by.* How much hull shows; the tide mark.
- *Lore.* `interact.js` (the low-water bonus, built); L-18 "salvage at low water, a grave at high" only as the saying.
- *As dread rises.* Nothing.
- *Region rule.* **Extends** salvage.
- *Effort.* S to M: wreck height by tide (design), `interact.js`.
- *Risks.* Nobody should wait a tide (345 s); the rule is about arriving at the right time.

### 4.3 Puzzle variations

**P-REEF-1 The gap in the white** — span classic · Classic, Readable · depends: none · demo-safe
- *Setup.* A rolled Reef isle (not a harbour) with a treasure arch or fruit, its way in strewn with today's coral heads in white water.
- *Play.* (1) Read the white rings and find today's line between them. (2) Come in through it; near the heads keep under 1.2 or keep
  clear. (3) E at the isle's range (the anchor stops her within about 4.2). *Wrong try:* a hit: hull and a dead stop; back off, read
  again. Tomorrow the heads lie elsewhere.
- *Second look.* None.
- *Lore.* `reef.js`, `regiondecor.js` (dawn layout).
- *Reward.* The isle's treasure or fruit.
- *Pacing.* 30 to 90 s.
- *Repeat.* Daily, a new layout.
- *Effort, risks.* None to S: it works today. Optional: guarantee one gap at least 14 wide on every isle (`regiondecor.js`).

**P-REEF-2 Before the tide takes it** — span classic · Classic, Systemic · depends: none · demo-safe
- *Setup.* A blow in Reef water. A storm wreck rises ahead, mast in the chop.
- *Play.* (1) Reach it with the sail short of full (a tear at strain 20). (2) Either salvage now, or (3) read the tide mark: once the tide
  has come in, the next low water takes the wreck, **unless you are within 60 of it**. So sit by it as the water falls, and salvage
  below -0.45: x1.5 for the Reef, x1.3 for the low water. *Wrong try:* sail off and come back too late: it is gone at low water.
- *Second look.* None.
- *Lore.* `reef.js` (built); M-REEF-4 if built makes the hull rise visibly.
- *Reward.* Salvage, up to about x2 of an ordinary wreck.
- *Pacing.* 1 to 3 minutes.
- *Repeat.* Each blow.
- *Effort, risks.* None: it works today. The rule that the wreck waits for a ship within 60 is a happy accident worth keeping.

**P-REEF-3 Onto the teeth** — span middle · Systemic, Risky-to-build · depends: none · demo-safe
- *Setup.* A raider chasing you (inside 170) near a Reef isle with coral.
- *Play.* (1) Lead it through a gap you have read. (2) Raiders steer straight for you and cut the corner; one that crosses a head above
  speed 1.2 runs aground: it stops, lists and strikes its flag. (3) Hail it (E within 24): it gives up its purse and cargo. *Wrong try:*
  it follows the gap; you are in an ordinary fight (optional) or a run.
- *Second look.* None.
- *Lore.* `reef.js`, `BOUNTY`, raiders (built).
- *Reward.* The bounty (40, paid at the next Reef harbour) and its cargo.
- *Pacing.* 1 to 2 minutes.
- *Repeat.* Yes.
- *Effort, risks.* M: raiders against coral (`traffic.js`), striking the flag (`combat.js`). Make raiders avoid a head they have seen
  for 3 s, or it becomes an exploit.

**P-REEF-4 The stake with no wreck** — span weird · Weird, Quiet · depends: L-16 · full-only
- *Setup.* Once per voyage, in open Reef water at least 300 from any island, a stake with a white rag stands alone. Bright reading: a
  salvager's mark over something below, or a claim somebody forgot.
- *Play.* (1) The player notices it; E finds nothing there (no prompt). (2) The next blow in Reef water raises its wreck right beside the
  stake instead of near the ship. (3) A player who remembers sails there (the rag shows far through the haze) and salvages as usual. At
  the next low water the wreck goes; the stake stays.
- *Second look.* The claim was there before the ship. Nobody says who planted it. It would naturally feed **Q3**; the clue, if any, is the
  owner's.
- *Lore.* **L-16 (proposed). Cutting L-16 cuts it.** Lore bible 4.8 ("a rag on a stake where there is no wreck yet"), A-08.
- *Reward.* Salvage x1.5.
- *Pacing.* 1 to 3 minutes inside the blow.
- *Repeat.* Once (RULES 8, one flag).
- *Effort, risks.* M: the storm wreck's site (`reef.js`), the stake (`seafeatures.js`). A prop on open water: owner's word.

**P-REEF-5 The bell in the fog** — span weird · Weird, Dread-touched, Risky-to-build · depends: L-29; blocked: B-20 · full-only
- *Setup.* Fog in Reef water by day. A single bell stroke every 20 to 40 s, from off one bow. Bright reading: a bell buoy.
- *Play.* (1) The sound alone is not enough (RULES 28): with each stroke a faint ring of ripples comes through the fog from the bearing of
  the sound. (2) Steer toward where the rings come from. (3) After 2 to 3 minutes the strokes stop. There is open water and nothing
  else. (4) Once, one more stroke, and its ripple comes from astern. The fog lifts in a ring round the ship.
- *Second look.* There is no buoy and no wreck. Never explained.
- *Lore.* **L-29 (proposed). Cutting L-29 cuts it.** S-40 (sample line, unapproved), NEWS-0025. Single strokes only: independent of any
  count (B-12).
- *Reward.* A view: clear water in a ring in the fog.
- *Pacing.* 2 to 3 minutes.
- *Repeat.* Once.
- *Blocked.* **B-20** (whether the fog bell ever sounds). Playing `bell` (Tama's band bell) outside Tama is the owner's and audio's
  call (RULES 25). If it is Tama's own bell, this would be a **Q5** source in a second region (the gap C-06); the clue is the owner's.
- *Effort, risks.* M: regional fog, ripple rings (design), audio placement (audio).

---

## 5. The Lantern Guild (west wedge)

### 5.1 Regional identity
- **Look and light.** Near-black slick water under amber smoke, a short view, fog and evening light; two rows of lamps on floats along
  the way in (five pairs at a harbour, three elsewhere), lit day and night; a tall dark tower with a light on top.
- **Rules (numbers).** Guild harbours buy oil at 0.9 (Tama sells at 0.42). In Lantern water the lamp burns x0.5 within 260 of a lit
  lighthouse and x2 in the open dark (burn 0.26 x (1 + 0.8 x dread) a second). Half the lighthouses are dark at night until a captain
  relights one: 30 oil **from the ship's own lamp**, pays 30 and chart marks, range 45. Fish sells x1.5.
- **Lore it carries.** Q2 (the Oil Press, the Dark Tower), Q1 and Q3 (the Keepers' Ledger, lit at noon), Q7 (the Halved Isle); the Bell
  Below; Hollowgreen and the Ribs also lie in Lantern water. "Every lighthouse has its own rhythm." (PAS-0015). Proposed: L-19 the
  Guild counts lights, L-20 the pressers' grace, L-21 past the last light.
- **Feeling.** Orderly, amber, foggy. Light is money, and the lights must be kept lit.
- **Never reveal.** What the oil is or where it comes up; what the second doors open on; what the tower's window looks up at; what the
  lights are for. The `bluelamp` capability is the owner's (B-14).

### 5.2 Mechanic variations

**M-LANT-1 Every light its rhythm** — Classic, Readable · depends: REGIONS (flash-pattern piloting; L-19 flavour) · demo-safe
- *Rule.* Each lighthouse in Lantern water flashes its own pattern from its seed: one to three flashes, short (0.3 s) or long (1 s), every
  6 to 10 s. Once you have been within 45 of it, the chart draws its pattern beside it in ink, dots and dashes, no words. At night or in
  fog a light is named by counting.
- *Read by.* The flashes; the chart's ink.
- *Controls.* The chart (M).
- *Lore.* PAS-0015 (built line); REGIONS lists fog piloting by flash pattern, not built.
- *As dread rises.* Nothing.
- *Region rule.* **Sits beside** the dead lights.
- *Effort.* M: the lamp's timing (`world.js`, design), chart ink (`chart.js`, design).
- *Risks.* RULES 23: the chart's bare paper is reserved; the ink must sit on painted (sailed) water only.

**M-LANT-2 Lit roads** — Systemic, Risky-to-build · depends: REGIONS (route lamp-floats) · demo-safe
- *Rule.* Between Lantern harbours less than 450 apart, a line of lamp-floats every 60 marks the Guild's road. Within 40 of a float the
  lamp burns x0.5, as near a lighthouse; off the road in the dark, x2 as now. One float on each road burns the wrong colour (REGIONS).
- *Read by.* The float lines; the oil row draining slower or faster.
- *Lore.* REGIONS ("lines of lamp-floats marking the routes ... one burns the wrong colour"), `lampBurnMul`.
- *As dread rises.* Nothing new; the wrong-coloured float is REGIONS' own second look.
- *Region rule.* **Extends** `lampBurnMul`.
- *Effort.* M: floats (`regiondecor.js`), the near-light test (`storybeats.js`).
- *Risks.* Props on the open sea. REGIONS proposed them before RULES 24b/24c were written; the owner decides which wins.

**M-LANT-3 Noon fog** — Systemic · depends: REGIONS (signature weather) · demo-safe
- *Rule.* In Lantern water on most days a fog bank comes in from the west about 11:00 and lifts by 14:00 (about 86 s). The lamp burns
  in it; the lighthouses stay lit through it, and windows are lit at noon.
- *Read by.* The fog wall coming in from the west, minutes ahead; lit windows at midday.
- *Lore.* REGIONS (Lantern noon fog; windows lit at noon); the Keepers' Ledger is lit at noon (VISITS, built).
- *As dread rises.* Nothing new (fog already rises with dread).
- *Region rule.* **Sits beside**; it gives M-LANT-1 its use.
- *Effort.* S to M: a regional schedule in `weather.js`.
- *Risks.* An eighth of the day in fog; tune how often.

**M-LANT-4 Nothing from the deep** — Quiet, Dread-touched · depends: L-20 · demo-safe
- *Rule.* Guild markets pay x1.5 for fish of the reefs, the piers and the near water (sardine, snapper, bream, cuttlefish, barracuda,
  grouper), x1.0 for deep-water fish (tuna, swordfish, mahi-mahi, moonfish), and will not take the dark fish at all (pale lanternfish,
  the glass eel, the pike, the key-shaped fish, the drowned angler): Sell leaves them in the hold.
- *Read by.* The sell row's sum; the dark fish still in the hold.
- *Lore.* `sellMul` (fish x1.5, built). **L-20 (proposed: "We do not go down"). Cutting L-20 leaves only the flat x1.5.**
- *As dread rises.* Dark fish exist only past dread 0.3, so the refusal is met only far out. In the demo it never shows.
- *Region rule.* **Replaces** the flat fish x1.5.
- *Effort.* S: `regions.js` by species, `ui/harbour.js`.
- *Risks.* Touches G-08 (what Sell keeps back). No line may explain the refusal.

### 5.3 Puzzle variations

**P-LANT-1 Keep in sight of a light** — span classic · Classic, Systemic · depends: none · demo-safe
- *Setup.* Dusk at a Guild harbour; a dead light 400 to 600 away across open water; about 45 oil in the lamp.
- *Play.* Straight across the open dark at dread 0.3 the lamp burns about 0.64 a second: a 50 s crossing costs about 32, and you arrive
  short of the 30 the relight needs. Along the coast, within 260 of lit lighthouses, it burns about 0.16: a longer road, and you arrive
  with plenty. The oil row on the HUD shows the difference within seconds. *Wrong try:* arrive short; the light stays dark; buy oil and
  try again. Nothing else lost.
- *Second look.* None.
- *Lore.* `lampBurnMul`, `RELIGHT_OIL` (built).
- *Reward.* The relight's 30 and its chart marks (built).
- *Pacing.* 1 to 2 minutes.
- *Repeat.* Nightly.
- *Effort, risks.* None: it works today.

**P-LANT-2 Rhythm in the fog** — span classic · Classic, Readable · depends: REGIONS · needs M-LANT-1, M-LANT-3 · demo-safe
- *Setup.* Noon fog comes in while you carry cargo between two Guild harbours about 300 apart. Two glows flash through it: your harbour,
  and a bare light on a rock.
- *Play.* Count the flashes, open the chart, match the ink, steer. *Wrong try:* the rock; turn for the other glow (60 to 90 s lost, no
  deadline in the Lantern).
- *Second look.* None.
- *Lore.* PAS-0015; L-19 as flavour.
- *Reward.* The delivery; a light you now know.
- *Pacing.* 30 to 90 s.
- *Repeat.* Yes.
- *Effort, risks.* Rides on M-LANT-1 and M-LANT-3.

**P-LANT-3 The keeper's supper** — span middle · Cosy · depends: none (L-20 flavour) · demo-safe
- *Setup.* At dusk, a lone lighthouse rock in Lantern water with no harbour. When you pass within 120 its keeper swings a lantern on the
  gallery twice: come closer, in any port.
- *Play.* (1) Anchor within 45 (E, 2.6 s, as going ashore). (2) If you carry a fish, a basket comes down on a line and takes the first
  fish; it goes up and comes down again with 20 oil. (3) No fish: the basket comes down empty and goes up empty. So: catch one first
  (the reef ring by the rock is quick).
- *Second look.* None.
- *Lore.* `sellMul` (fish x1.5: "the Guild's people tend lamps, not nets", built comment); L-20 as flavour.
- *Reward.* 20 oil (about 18 gold at Guild prices, for a fish worth about 10).
- *Pacing.* 30 to 90 s, plus a cast.
- *Repeat.* Once a day per light.
- *Effort, risks.* M: keeper and basket (design), an interact kind placed after `relight` in the priority list.

**P-LANT-4 The sheen off the press** — span weird · Weird, Quiet · depends: none (L-20 flavour) · full-only
- *Setup.* On calm nights within 200 of the Oil Press (-1014, 272), two oil sheens at a time rise on the water: flat, faintly rainbowed
  patches about 6 across, each lasting one game hour. Bright reading: a natural seep, free lamp oil.
- *Play.* Sail through one (within 6, as a barrel): +8 oil to the lamp.
- *Second look.* The press's own boats stay tied at the quay; nobody else skims the sheens, and none rises where a press boat lies. It
  would feed **Q2**; never say what the oil is (A-10).
- *Lore.* VISITS press ("It comes up"), built; L-20 as flavour.
- *Reward.* Oil.
- *Pacing.* 30 to 60 s.
- *Repeat.* Calm nights.
- *Effort, risks.* M: a flat sheen feature (`seafeatures.js`, design). It must not burn blue (`bluelamp`, B-14). Two at a time keeps it
  inside RULES 24c's sparseness.

---

## 6. The Drowned (far out, full game only)

### 6.1 Regional identity
- **Look and light.** Lead-grey flat water and fog; roofs to the ridge and chimneys along the way in (six at a harbour), a leaning
  belfry; derelicts with their lamps lit.
- **Rules (numbers).** The belt (1740 to 1800 from Tama) opens below tide -0.3, about 40% of each 345 s cycle (about 138 s); at high water
  a white race throws the ship back and scrapes 5 hull every 2 s. Harbours take no coin, give what you lack (fill the lamp, sailcloth,
  mend), and keep the first thing to hand: a fish, then fruit, then the newest treasure. Each kept thing comes back once out of the deep
  (up to 12 held).
- **Lore it carries.** Q6 (the Sunken Street, which lies in Cays water about 900 out with a forced dread of 0.74: a distance lie, D-01,
  D-11); the Table by the Water (1377, -1966); threads: the Colour, the Hollow Harbour. Proposed: L-22 names called home, L-23 tide
  poles, L-24 kept, not taken.
- **Feeling.** The same world, only wrong and quiet. Answers that are no longer reliable.
- **Never reveal.** Who the harbourfolk are; why no coin; the name of Mara's village; that the street is hers; anything about what is
  under the sea. Nothing touches the "place set" trade (B-17) or a blue door.

### 6.2 Mechanic variations

**M-DROWN-1 Streets at low water** — Readable, Systemic · depends: REGIONS (streets as channels) · full-only
- *Rule.* In Drowned water the roofs along a way in stand clear below tide -0.3 and are solid then: running onto one is speed x0.25 and 3
  hull, gentler than coral. Above -0.3 they are under, and a ship passes over them. At low water the way in is the street between the
  two rows (about 25 wide).
- *Read by.* Roofs standing or gone; the tide mark.
- *Lore.* REGIONS ("streets that become channels at low tide"); the roofs (`regiondecor.js`, built).
- *As dread rises.* Always deep.
- *Region rule.* **Sits beside** the belt: two tide rules that agree.
- *Effort.* M to L: roofs that rise and fall with the tide (as the `secrets.js` low-tide wrecks do), collision in `drowned.js`.
- *Risks.* None that traps: a roof only slows.

**M-DROWN-2 Lamps rowing home** — Quiet, Readable · depends: none (L-22 flavour) · full-only
- *Rule.* At dusk (17:30 to 19:30) in Drowned water, two to four rowing boats with a lantern in the bow pull for the nearest Drowned
  harbour from 200 to 400 out, at 2.4 units/s, straight through the fog. They do not answer a hail.
- *Read by.* Low lights on the water in fog, all heading one way.
- *Lore.* NEWS-0024 ("Fishers are asked to call out their names on the way home", built). L-22 only as flavour; no voices (no new cue).
- *As dread rises.* In the thickest fog they are the only lights.
- *Region rule.* **Sits beside.**
- *Effort.* M: rowboats (`traffic.js`).
- *Risks.* None.

**M-DROWN-3 Lit wrecks are kept** — Weird, Dread-touched · depends: L-24 · full-only
- *Rule.* In Drowned water, a wreck or derelict with its lamp lit cannot be salvaged: E sends the crew over (2.2 s), they come back with
  nothing, and the lamp burns a little brighter after. Unlit wrecks salvage as anywhere (x1.0).
- *Read by.* The lit lamp.
- *Lore.* SM F3-DROWNED ("derelicts with lamps lit", built); MAIN-0319, MAIN-0320. **L-24 (proposed) gives the reading. Cutting L-24
  leaves a rule with no reason anyone would give; keep it only if the owner likes it bare.**
- *As dread rises.* Always deep. It inverts the Reef's x1.5 and the Crown's declaration (section 8).
- *Region rule.* **Replaces** salvage for lit wrecks there.
- *Effort.* S: `interact.js` (the existing "came back empty-handed" line).
- *Risks.* An E that gives nothing must read as a rule, not a bug: the brighter lamp is that tell.

**M-DROWN-4 Low-water hours** — Systemic · depends: none · full-only
- *Rule.* A Drowned harbour gives and keeps only while the tide is below 0 (half of each cycle, about 172 s). Above it the pier lies awash
  (a film of water over the planks); you may dock, and nothing is given or kept.
- *Read by.* The awash pier; the tide mark.
- *Lore.* CANON 2026-11-13 (the Drowned: the tide decides); REGIONS.
- *As dread rises.* Always deep.
- *Region rule.* **Extends** `drownedTake`'s timing. Clock by region: the Crown by the hour, the Cays by the music, the Drowned by the tide.
- *Effort.* M: `ui/harbour.js`, the pier state (design).
- *Risks.* A wait of up to about 170 s; it is about arriving at the right state, which the tide mark shows.

### 6.3 Puzzle variations

**P-DROWN-1 In by the street** — span classic · Classic, Readable · depends: REGIONS · needs M-DROWN-1 · full-only
- *Setup.* A Drowned harbour in fog, its way in lined by two rows of roofs, a leaning belfry 50 out.
- *Play.* (1) Arrive as the tide falls past -0.3: the roofs stand. (2) Take the street between the rows, the belfry ahead. (3) Dock while
  the water is low (M-DROWN-4: it gives only then). *Wrong try:* a roof: slowed, 3 hull. At high water you sail over and the harbour gives
  nothing.
- *Second look.* At the lowest water, doorsteps show along the street. Plain stone. Never a door, never blue (L-37 is the owner's).
- *Lore.* REGIONS.
- *Reward.* The harbour's gifts: lamp filled, hull mended.
- *Pacing.* 30 to 90 s.
- *Repeat.* Yes.
- *Effort, risks.* Rides on M-DROWN-1.

**P-DROWN-2 A fish for the pier** — span classic · Systemic · depends: none · full-only
- *Setup.* You carry a treasure you care about and are about to dock at a coinless harbour. Last time they kept your newest treasure.
- *Play.* Catch any fish first (a sardine, about 30 s). Dock: they keep the fish, the first thing to hand. The treasure stays. *Wrong try:*
  dock with no fish and no fruit: they keep the newest treasure; it comes back once, out of the deep.
- *Second look.* The fish you gave comes back on your line far out (built, `keptBack`).
- *Lore.* `drownedTake` order, `keptBack` (built).
- *Reward.* Keeping what you meant to keep.
- *Pacing.* 30 to 60 s.
- *Repeat.* Yes.
- *Effort, risks.* None: it works today. It wants the order to be learnable; the chalk tally of what was kept (lore bible 4.8) would help.

**P-DROWN-3 Follow the lamps** — span middle · Quiet, Classic · depends: none (L-22 flavour) · needs M-DROWN-2 · full-only
- *Setup.* Dusk in Drowned fog, just over the belt, no harbour in sight. Two to four low lanterns on the water, converging.
- *Play.* Follow them (2.4 units/s: sail slowly, or row) for 200 to 400. They reach a harbour you could not see. *Wrong try:* lose them in
  the fog (P-FREE-3's trick helps); the next dusk they row again.
- *Second look.* They row in step, every stroke together, and never look back.
- *Lore.* NEWS-0024.
- *Reward.* The harbour.
- *Pacing.* 1.5 to 3 minutes.
- *Repeat.* Each dusk.
- *Effort, risks.* Rides on M-DROWN-2.

**P-DROWN-4 The step at low water** — span weird · Weird, Dread-touched · depends: none · full-only
- *Setup.* At the lowest water (tide under -0.55, about 31% of a cycle, about 106 s) a stretch of pale sand bares beside a Drowned rolled
  isle (the low-tide sand patch of `secrets.js`), and on it three stone steps going up to nothing.
- *Play.* (1) E: the dig opens. **Extends** the dig: a plain sand beach, the three steps drawn where the arch stands, the dig's own tide
  rising a step with each dig (here it matches the real tide). (2) Damp means near; the chest is under the steps' shadow. (3) Find it before
  the tide floods the strip. *Wrong try:* the tide wins; the crew dig out; the sand bares again at the next lowest water.
- *Second look.* Only the top step is worn, as if somebody sat there. Never a door; never blue; never on the Sunken Street's water.
- *Lore.* `secrets.js` (low-tide sand), `digging.js`; it echoes Glass Lagoon's "Somebody's savings, a long time ago." Kept clear of L-37.
- *Reward.* A jar of coins, 40 to 80.
- *Pacing.* 1 to 2 minutes, set by the low water.
- *Repeat.* Once per isle.
- *Effort, risks.* M: `digging.js` (steps instead of an arch, full game only), `secrets.js`. Q6 adjacency: if the owner picks L-37 B
  (one street in many places), cut this.

---

## 7. The deep dread (the Dim and the Lid, any region)

Safe ground from the lore bible's handoff: the lost sailors each once, the Edge once, the abyss effects, Mara breaking; lingering at full dread is not an ending
(you wake off Tama, CANON 6). Never reveal who the lost sailors were or what the Edge's shapes are. Nothing below names, adds or explains anything;
both items only bend rules the player already knows.

**M-DEEP-1 The sea runs the wrong way** — Weird, Dread-touched · depends: none · full-only
- *Rule.* From dread 0.86 (where the abyss effects begin) gust patches drift toward the wind instead of with it, and current lanes run
  backwards. Catching either still gives its push.
- *Read by.* The patches and the foam moving against the wind ring.
- *Lore.* CANON 2026-11-12 (the deep goes wrong; the Edge); `seaplay.js`.
- *As dread rises.* It is only in the deepest water.
- *Region rule.* Any region. It does not touch the Edge, where the helm is not yours anyway.
- *Effort.* S: `seaplay.js` (a sign by dread).
- *Risks.* A lost player is more lost. P-DEEP-1 keeps a way back.

**P-DEEP-1 Against the gulls** — span middle · Readable, Dread-touched · depends: none (pairs with M-HOME-3) · full-only
- *Setup.* Past dread 0.55, at dusk, the gulls fly the wrong way (built: away from land).
- *Play.* A player who learned at home that dusk gulls fly to land (M-HOME-3 makes that lesson reliable) turns the bow to where the
  flock comes from: land lies behind them. *Wrong try:* following them leads further out; nothing ends.
- *Second look.* Gulls flying out to sea at dusk.
- *Reward.* The way back.
- *Pacing.* 30 s to read it, then the sail.
- *Repeat.* Each dusk.
- *Effort, risks.* None: it works today.

---

## 8. Cross-region sets

### 8.1 Builds per region
| Region | Minimal (works today or S) | Balanced | Adventurous |
|---|---|---|---|
| Home | M-HOME-3 (S), M-HOME-1 (S) and P-HOME-1 | M-HOME-1, M-HOME-2; P-HOME-1, P-HOME-2, P-HOME-3 | add M-HOME-4, P-HOME-4, P-HOME-5 |
| Crown | P-CROWN-1 | M-CROWN-1; P-CROWN-1, P-CROWN-5 | add M-CROWN-2, M-CROWN-4, P-CROWN-2, P-CROWN-3 (P-CROWN-4 if L-11) |
| Free Cays | P-FREE-3 | M-FREE-1; P-FREE-2, P-FREE-3 | add M-FREE-2 (L-14), M-FREE-3, P-FREE-1, P-FREE-4 |
| Reef | P-REEF-1, P-REEF-2 | M-REEF-1, M-REEF-4; P-REEF-1, P-REEF-2 | add M-REEF-2 (L-16), M-REEF-3 (L-17), P-REEF-3, P-REEF-4 (P-REEF-5 once B-20 is decided) |
| Lantern | P-LANT-1 | M-LANT-1, M-LANT-3; P-LANT-1, P-LANT-2, P-LANT-3 | add M-LANT-2, M-LANT-4 (L-20), P-LANT-4 |
| Drowned | P-DROWN-2 | M-DROWN-4, M-DROWN-2; P-DROWN-2, P-DROWN-3 | add M-DROWN-1, M-DROWN-3 (L-24), P-DROWN-1, P-DROWN-4 |
| Deep | P-DEEP-1 | P-DEEP-1 | add M-DEEP-1 |

Six items need no code or almost none: P-CROWN-1, P-REEF-1, P-REEF-2, P-LANT-1, P-DROWN-2, P-DEEP-1. They are a minimal build on their own.

### 8.2 What each region's clock is (if the balanced sets are built)
| Region | What decides when things work | Item |
|---|---|---|
| Home | noon | M-HOME-1 |
| Crown | office hours, the mast's pennants | M-CROWN-1, M-CROWN-2 |
| Free Cays | night and the music | M-FREE-1 (and the built `caysQuiet`) |
| Reef | the tide on the coral and the wrecks | M-REEF-1, M-REEF-4 |
| Lantern | noon fog and the lights' rhythm | M-LANT-1, M-LANT-3 |
| Drowned | the tide at the pier | M-DROWN-4 |

### 8.3 Pairs that answer each other
CANON 4: a question is understood when two or three regions agree. These pairs agree by what the player does, not by words. None of
them adds a clue row; each names the question it would feed, and the clue is the owner's.

| Pair | What agrees | Question it would feed |
|---|---|---|
| P-CROWN-5 (Crown) and P-REEF-4 (Reef), with the built Keepers' Ledger date (Lantern) | the record comes before the event: a black line before the lateness, a claim before the wreck, a date ahead | Q1, Q3 |
| P-HOME-1 / P-HOME-5 (Home) and P-DROWN-1 / P-DROWN-4 (Drowned) | the water lies down near home at noon; far out it breathes and shows a street | Q5 against Q2, by contrast only |
| M-HOME-3 (Home) and P-DEEP-1 (Deep) | gulls go home; far out they go the other way | none (a skill, not a question) |
| P-FREE-3 (Cays) and P-LANT-1 (Lantern) | in the Cays you see better with your light out; in the Lantern your light is your life | Q7 and Q2 in flavour: what keeps the dark back |
| M-CROWN-4 (Crown), M-REEF-3 (Reef), M-DROWN-3 (Drowned) | three laws of salvage: declared, tolled, kept | Q4 (a cost lands somewhere) |
| P-CROWN-4 (Crown) and the Lantern's harbours | two books carried to one table | Q1 (needs L-11) |
| P-REEF-5 (Reef) and Tama's noon bell (Home) | a bell heard where none hangs | Q5's missing second region (C-06); blocked on B-20 |
| M-HOME-2 (Home) and M-LANT-1 (Lantern) | pilots' skills learned near home, used far out (the Kestrel's transit is the first) | none (a skill) |

---

## 9. What I would pick

Separate from the menu. One line each.

- **M-HOME-1 Noon slack**: gives the built noon hush something to do, and frees it from the bell count.
- **M-HOME-3 Gulls go home**: an S change that makes a built behaviour into a lesson the deep pays off (P-DEEP-1).
- **P-HOME-2 The empty mark** (with M-HOME-2): teaches the Kestrel's transit on something harmless first.
- **P-CROWN-1 Rowing the lane**: works today, uses the oars for something, and is pure Crown.
- **M-CROWN-1 Pennants come down**: a deadline you read off the world instead of the slip.
- **P-CROWN-5 The line already written**: the region's one wrong thing, once, built on a capability that exists.
- **M-FREE-1 Turned-round day**: the Cays' character in the harbour, not only in the market note.
- **P-FREE-3 Lamp out to see the shore**: a new use for L, and the Cays' answer to the Lantern.
- **M-REEF-1 Teeth under the tide**: makes the tide matter on the Reef's most visible rule, for S effort.
- **P-REEF-2 Before the tide takes it**: works today; it only needs to be noticed.
- **P-REEF-4 The stake with no wreck** (if L-16 is approved): the Reef's wrong thing, quiet, once.
- **P-LANT-1 Keep in sight of a light**: works today and is the cleanest puzzle in the catalogue.
- **M-LANT-1 Every light its rhythm**: the lore already says it; the region has no reason to read the chart without it.
- **P-LANT-3 The keeper's supper**: cosy, short, and only makes sense where nobody fishes.
- **M-DROWN-4 Low-water hours**: gives the Drowned its own clock beside the belt.
- **P-DROWN-2 A fish for the pier**: works today; turns the keeping into a choice the player makes.
- **P-DEEP-1 Against the gulls**: works today; a way back out that nobody explains.

---

## 10. Curation checklist

### Home Sound
- **M-HOME-1** Noon slack (Cosy, Readable, Systemic; depends: none) — [ ] Approve / [ ] Tweak / [ ] Cut
  Notes:
- **M-HOME-2** Fishers' marks (Classic, Readable; depends: none) — [ ] Approve / [ ] Tweak / [ ] Cut
  Notes:
- **M-HOME-3** Gulls go home (Cosy, Readable; depends: none) — [ ] Approve / [ ] Tweak / [ ] Cut
  Notes:
- **M-HOME-4** Still warm (Cosy, Systemic; depends: none) — [ ] Approve / [ ] Tweak / [ ] Cut
  Notes:
- **P-HOME-1** What the noon shows (Cosy, Readable; depends: none) — [ ] Approve / [ ] Tweak / [ ] Cut
  Notes:
- **P-HOME-2** The empty mark (Classic, Readable; depends: none) — [ ] Approve / [ ] Tweak / [ ] Cut
  Notes:
- **P-HOME-3** Wick answers (Cosy, Readable; depends: none) — [ ] Approve / [ ] Tweak / [ ] Cut
  Notes:
- **P-HOME-4** The Sunday race (Classic, Risky-to-build; depends: none) — [ ] Approve / [ ] Tweak / [ ] Cut
  Notes:
- **P-HOME-5** Home by the hush (Quiet, Experimental; depends: none) — [ ] Approve / [ ] Tweak / [ ] Cut
  Notes:

### The Crown Traders
- **M-CROWN-1** Pennants come down (Readable, Systemic; depends: none) — [ ] Approve / [ ] Tweak / [ ] Cut
  Notes:
- **M-CROWN-2** Office hours (Systemic, Dread-touched; depends: none) — [ ] Approve / [ ] Tweak / [ ] Cut
  Notes:
- **M-CROWN-3** Charter runs (Classic; depends: REGIONS) — [ ] Approve / [ ] Tweak / [ ] Cut
  Notes:
- **M-CROWN-4** Declared salvage (Systemic, Risky-to-build; depends: none) — [ ] Approve / [ ] Tweak / [ ] Cut
  Notes:
- **P-CROWN-1** Rowing the lane (Classic, Cosy; depends: none) — [ ] Approve / [ ] Tweak / [ ] Cut
  Notes:
- **P-CROWN-2** Running dark (Classic, Risky-to-build; depends: none) — [ ] Approve / [ ] Tweak / [ ] Cut
  Notes:
- **P-CROWN-3** The declared wreck (Systemic; depends: none) — [ ] Approve / [ ] Tweak / [ ] Cut
  Notes:
- **P-CROWN-4** Reckoning Day (Classic; depends: L-11) — [ ] Approve / [ ] Tweak / [ ] Cut
  Notes:
- **P-CROWN-5** The line already written (Weird, Dread-touched; depends: none) — [ ] Approve / [ ] Tweak / [ ] Cut
  Notes:

### The Free Cays
- **M-FREE-1** Turned-round day (Cosy, Systemic; depends: none) — [ ] Approve / [ ] Tweak / [ ] Cut
  Notes:
- **M-FREE-2** Fires on the sandbars (Readable, Quiet; depends: L-14) — [ ] Approve / [ ] Tweak / [ ] Cut
  Notes:
- **M-FREE-3** Still nights (Systemic, Quiet; depends: REGIONS) — [ ] Approve / [ ] Tweak / [ ] Cut
  Notes:
- **M-FREE-4** Oil for the night (Systemic; depends: REGIONS) — [ ] Approve / [ ] Tweak / [ ] Cut
  Notes:
- **P-FREE-1** The loose kite (Cosy, Classic; depends: none) — [ ] Approve / [ ] Tweak / [ ] Cut
  Notes:
- **P-FREE-2** Sight-casting in the lagoon (Classic, Systemic; depends: none) — [ ] Approve / [ ] Tweak / [ ] Cut
  Notes:
- **P-FREE-3** Lamp out to see the shore (Experimental, Readable; depends: none) — [ ] Approve / [ ] Tweak / [ ] Cut
  Notes:
- **P-FREE-4** Out on a storm night (Dread-touched, Risky-to-build; depends: none) — [ ] Approve / [ ] Tweak / [ ] Cut
  Notes:

### The Reef Brotherhood
- **M-REEF-1** Teeth under the tide (Readable, Systemic; depends: none) — [ ] Approve / [ ] Tweak / [ ] Cut
  Notes:
- **M-REEF-2** Stake your claim (Systemic, Risky-to-build; depends: L-16) — [ ] Approve / [ ] Tweak / [ ] Cut
  Notes:
- **M-REEF-3** Pay the toll (Systemic; depends: L-17) — [ ] Approve / [ ] Tweak / [ ] Cut
  Notes:
- **M-REEF-4** Salvage by the waterline (Classic, Readable; depends: none) — [ ] Approve / [ ] Tweak / [ ] Cut
  Notes:
- **P-REEF-1** The gap in the white (Classic, Readable; depends: none) — [ ] Approve / [ ] Tweak / [ ] Cut
  Notes:
- **P-REEF-2** Before the tide takes it (Classic, Systemic; depends: none) — [ ] Approve / [ ] Tweak / [ ] Cut
  Notes:
- **P-REEF-3** Onto the teeth (Systemic, Risky-to-build; depends: none) — [ ] Approve / [ ] Tweak / [ ] Cut
  Notes:
- **P-REEF-4** The stake with no wreck (Weird, Quiet; depends: L-16) — [ ] Approve / [ ] Tweak / [ ] Cut
  Notes:
- **P-REEF-5** The bell in the fog (Weird, Dread-touched, Risky-to-build; depends: L-29, blocked B-20) — [ ] Approve / [ ] Tweak / [ ] Cut
  Notes:

### The Lantern Guild
- **M-LANT-1** Every light its rhythm (Classic, Readable; depends: REGIONS) — [ ] Approve / [ ] Tweak / [ ] Cut
  Notes:
- **M-LANT-2** Lit roads (Systemic, Risky-to-build; depends: REGIONS) — [ ] Approve / [ ] Tweak / [ ] Cut
  Notes:
- **M-LANT-3** Noon fog (Systemic; depends: REGIONS) — [ ] Approve / [ ] Tweak / [ ] Cut
  Notes:
- **M-LANT-4** Nothing from the deep (Quiet, Dread-touched; depends: L-20) — [ ] Approve / [ ] Tweak / [ ] Cut
  Notes:
- **P-LANT-1** Keep in sight of a light (Classic, Systemic; depends: none) — [ ] Approve / [ ] Tweak / [ ] Cut
  Notes:
- **P-LANT-2** Rhythm in the fog (Classic, Readable; depends: REGIONS) — [ ] Approve / [ ] Tweak / [ ] Cut
  Notes:
- **P-LANT-3** The keeper's supper (Cosy; depends: none) — [ ] Approve / [ ] Tweak / [ ] Cut
  Notes:
- **P-LANT-4** The sheen off the press (Weird, Quiet; depends: none) — [ ] Approve / [ ] Tweak / [ ] Cut
  Notes:

### The Drowned
- **M-DROWN-1** Streets at low water (Readable, Systemic; depends: REGIONS) — [ ] Approve / [ ] Tweak / [ ] Cut
  Notes:
- **M-DROWN-2** Lamps rowing home (Quiet, Readable; depends: none) — [ ] Approve / [ ] Tweak / [ ] Cut
  Notes:
- **M-DROWN-3** Lit wrecks are kept (Weird, Dread-touched; depends: L-24) — [ ] Approve / [ ] Tweak / [ ] Cut
  Notes:
- **M-DROWN-4** Low-water hours (Systemic; depends: none) — [ ] Approve / [ ] Tweak / [ ] Cut
  Notes:
- **P-DROWN-1** In by the street (Classic, Readable; depends: REGIONS) — [ ] Approve / [ ] Tweak / [ ] Cut
  Notes:
- **P-DROWN-2** A fish for the pier (Systemic; depends: none) — [ ] Approve / [ ] Tweak / [ ] Cut
  Notes:
- **P-DROWN-3** Follow the lamps (Quiet, Classic; depends: none) — [ ] Approve / [ ] Tweak / [ ] Cut
  Notes:
- **P-DROWN-4** The step at low water (Weird, Dread-touched; depends: none) — [ ] Approve / [ ] Tweak / [ ] Cut
  Notes:

### The deep dread
- **M-DEEP-1** The sea runs the wrong way (Weird, Dread-touched; depends: none) — [ ] Approve / [ ] Tweak / [ ] Cut
  Notes:
- **P-DEEP-1** Against the gulls (Readable, Dread-touched; depends: none) — [ ] Approve / [ ] Tweak / [ ] Cut
  Notes:

### Decisions that block items
- **B-20, whether a fog bell ever sounds**, and with it whether `bell` may play outside Tama (RULES 25): blocks **P-REEF-5**.
- **B-12, the bell counts**: blocks nothing here. M-HOME-1 and P-HOME-4 were made independent of it. If the owner wants the noon hush tied
  to the strokes instead of the hour, M-HOME-1, P-HOME-1 and P-HOME-5 need re-timing.
- **Props on the open water (RULES 24b, 24c)**: a stake beside a wreck or alone (**M-REEF-2**, **P-REEF-4**), lamp-floats along routes
  (**M-LANT-2**), oil sheens (**P-LANT-4**). REGIONS proposed the stakes and route floats before the rules; the owner decides which wins.
- **Lore approvals**: L-11 (**P-CROWN-4**), L-14 (**M-FREE-2**), L-16 (**M-REEF-2**, **P-REEF-4**), L-17 (**M-REEF-3**), L-20 (**M-LANT-4**),
  L-24 (**M-DROWN-3**), L-29 (**P-REEF-5**).
- **The unbuilt REGIONS ideas**: signature weather (**M-FREE-3**, **M-LANT-3**, **P-LANT-2**), the price board (**M-FREE-4**), regional standing (**M-CROWN-3**), flash-pattern piloting (**M-LANT-1**, **P-LANT-2**), route floats
  (**M-LANT-2**), streets as channels (**M-DROWN-1**, **P-DROWN-1**).
- **D-01 / G-30, places and their water**: **P-HOME-3** stands at Wick's Rock, which is in mixed Crown/Free water, not home. Either accept
  it at the Sound's edge or move it to Tama's own lighthouse.
- **L-37, the drowned streets**: if the owner picks option B (one street in many places), cut **P-DROWN-4**, and keep P-DROWN-1's doorsteps out.
- **B-14, `bluelamp`**: blocks nothing, but P-LANT-4's oil must not burn blue until it is decided.
