# World redesign: structure-gated sea, knowledge as progression

Status: proposal (nothing in `src/` changed). Inputs: the Hoist Story Atlas (15 planned places, seven questions Q1 to Q7), `docs/STORY_EXPLORATION.txt`, and a code audit by two specialist passes (topology, lore). Rules kept from CLAUDE.md: horror implied, never explained; HUD text minimal; no popups for clues.

## 0. The core finding

Today the story is paced by **where you are**, not by **what you have found or what your ship can do**.
- Dread is a pure radial function: `dreadAtDistance(d) = clamp(d / 2200)` (`src/palette.js`).
- Chapter progress is a fog wall: `GATES = [430,430,820,1250,1650,1650]` and `gateRadius()` (`src/objectives.js`), removed wholesale by `story.free`. `src/gates.js` greys the UI by quest index.
- Knowledge changes nothing mechanical until the final table; the Kestrel chain, the longest in the game, pays gold only. Marks and fragments are stored and never read.

The redesign swaps both axes: the sea is open and is limited by ship, oil, tide and night; story knowledge is a by-product of looking, and each thing seen grants a capability.

## 1. Expert baseline: what a cosmic-horror director would flag (not requested)

1. **Dread needs a second variable.** Lovecraft's dread comes from implication plus *irreversibility*. Here you can walk back to r=0 and the stage resets. Fix: dread follows peak progress with hysteresis.
2. **Geometry should lie.** Non-Euclidean horror is a place whose distance, size or direction disagrees with memory. Here the map is concentric rings. Fix: distance lies, seams, longer return.
3. **Absence beats presence.** Several scenes show the monster-shaped thing (eye, lid, "she"). Fix: banned-word list, bright reading first.
4. **Knowledge should be a burden and a tool.** Good lore games make what you learned change what you can do. Fix: the `seen` ledger and capabilities.
5. **Relief must be authored.** A dread curve with no valleys numbs. Fix: oil/rest hubs placed before each descent.
6. **Out-of-order discovery is the norm in open worlds.** Every clue must be true alone.
7. **Single points of failure are tonal bugs.** A seed that wakes 3 of 7 threads can lack the clue a question needs.

## 2. Raw material audit (read primary sources, not summaries)

| Material | Where | What it shows |
|---|---|---|
| Dread function | `src/palette.js` `dreadAtDistance`, `DREAD_RANGE` | purely radial, saturates at r=2200 |
| Sector factions | `src/sectors.js` `sectorInfo` | faction picked at random per 550-unit sector; atlas wedges do not exist in code |
| Abyss ramp | `src/abyss.js` ~L196 | effects start at dread 0.86 (r~1890), too late |
| Gates | `objectives.js`, `main.js` `fogLost`, `story.free` | chapter-index wall, dropped at end of demo chain |
| Barriers | `landmarks.js` `BARRIERS` | three, all r<700; nothing gates 1000-2300 |
| Lore text | `lore.js` GOSSIP/NOTES, `main.js:1591` | several lines state the horror or the hut verb |
| Knowledge | `state.story.know`, `marks.js`, `state.life.frags` | written, almost never read |
| Threads | `marks.js` `pickAwake` | 3 of 7 wake per seed, so a clue can be missing |
| Doc drift | atlas vs `STORY_EXPLORATION.txt` | Mara forgets vs remembers; Two Players refusers vs Long Sleep; demo end differs |

## 3. Methodology and toolkit

- **Radial content census**: place every landmark by r and dread; look for density and gap bands. Result: seven places at r 500-1050, near-nothing 1100-1800, three at 1850+, D3 at 2300 beyond the dread cap.
- **Gate audit**: for each gate ask "does it test the ship or the script?" Result: all chapter gates test the script.
- **Question-route matrix**: for each of Q1-Q7 list independent routes by region. Pass = at least two regions, none seed-dependent.
- **Dependency graph / single-point-of-failure scan** on the clue graph.
- **Tone lint**: grep player-facing strings for banned words (lid, eye, sleeper, Lady, kept soft, "Mara is from") and for "she/the hut/a number" in clues readable before `hutKnown`.
- **Order-permutation test**: replay every pair of clues in both orders and read both logs.
- **Dread-curve plot**: dread vs minutes along a scripted route (headless Playwright with `?dread=`, `?x=&z=`, `window.__game`).

## 4. Validation criteria (empirical, independent of opinion)

| # | Indicator | Pass |
|---|---|---|
| V1 | Every Q1-Q7 reachable by >= 2 independent regional routes; no route needs a thread | scripted graph check |
| V2 | Content density per 300-unit radial band, r 450-2400 | no band empty; max/min <= 3 |
| V3 | Sailing from Tama to D3 with zero story progress | possible once ship gates are met (no chapter wall) |
| V4 | Round-trip time to a stratum S3+ place | return >= 1.4x outbound at equal wind |
| V5 | Dread after turning back from peak 0.8 | >= 0.68, not a reset |
| V6 | Tone lint over all clue strings | 0 banned words; 0 pre-`hutKnown` uses of she/hut/numbers |
| V7 | Order-permutation | every ordered pair of clues in one question reads without contradiction (checked by a reviewer against a fixed rubric) |
| V8 | Capability usefulness | each capability documented with a use that needs no lore |
| V9 | Playtest telemetry (headless bot with random routes, plus real players): % of runs reaching D3 with >= 3 questions at level 2; time spent in S3 | no seed blocks D3; S3 time within 15-25% of run |
| V10 | Players asked "what is under the sea?" unprompted, free text | answers are varied and uncertain, not a single stated answer |

V1-V6 are automatable; V7, V10 need human readers.

## 5. Agent 1: world and topology

### 5.1 Flaws
1. Concentric Euclidean dread; no place can be near but deep.
2. Atlas wedges are fiction; `sectorInfo` randomises faction.
3. Pacing: crowded (r<1050), empty (1100-1800), crammed (1850+); D3 gets no more dread than D1.
4. Exploration is script-gated; after `story.free` almost nothing stops you.
5. Three barriers, all near home, none story-bearing; oil, tide and night exist but gate nothing.
6. Q6 and Q7 each hang on one chain; D3 needed Q1, Q3, Q4, Q6 all at level 2.
7. The return trip is free: every route is the same length both ways.

### 5.2 Rule
The sea is open from minute one. What stops you is the ship and the sea. Places check `state.story.seen` only to vary text, never to appear or vanish (except the three tide/night "lies" below).

### 5.3 Strata (replace GATES; dread follows stratum)
| # | Name | Dread | Radius | Structural gate | Feel |
|---|---|---|---|---|---|
| S0 | Home Sound | 0-0.12 | 0-450 | none | warm, busy, gulls |
| S1 | The Shoals | 0.12-0.28 | 450-800 | Rudder 2 or a chart bought at Velto | bars and reefs; first tide wreck |
| S2 | Trade Belt | 0.28-0.45 | 800-1150 | 2+ oil flasks (`oil.js`), Hull 2 | long hauls; night is real |
| S3 | The Slack | 0.45-0.62 | 1150-1550 | Lantern 2 (fog belt) | NPCs repeat, wind drops, current turns you |
| S4 | The Dim | 0.62-0.82 | 1550-1950 | Hull/Sails 3, falling tide | fog, magenta beam, lit empty windows |
| S5 | The Lid | 0.82-1.0 | 1950-2400 | three seen clues from different regions (readable chart; otherwise the compass drifts like `fogLost`) | black sun, abyss set |

Implementation: `STRATA` table in `src/palette.js` (piecewise-linear, `DREAD_RANGE` becomes 2400 so D3 is full dread); `gateRadius` becomes `strataGate(state, upgrades)`; `BARRIERS` gains `kind:'belt'` ring-fog entries reusing `fogLost`. Old GATES stay for the demo build only.

### 5.4 Regions made real
Fixed angular layout in `sectors.js` (blend via existing `lookFactionAt`): Crown -100..-60, Free Cays -20..45, Reef 100..140, Lantern 160..215. The Drowned are not a wedge: the inner sea at S5 plus outliers D1 and D3 placed by wrap/lie below.

### 5.5 Non-Euclidean devices (all cheap)
1. **Distance lie, D1 Sunken Street**: true r~900, forced stratum-4 palette and dread (`desc.dreadOverride`); visible only at the lowest tide and along the Bell's bearing.
2. **Loop seam**: east edge of S4 meets west edge of S5 via a strong current in `seaplay.js`, masked by `lostK` fog (~4 s). "I sailed east and arrived west."
3. **Longer return**: S3/S4 current term pushes outbound, resists inbound; home leg ~1.6x time and oil.
4. **Rename/shift**: sector names re-seed after you leave S3+; D2 re-hashes position from `dayN` each time it is charted.
5. **Tide/night-only**: D1 (lowest tide), Kestrel (low water, calm), F3 Cup (high tide), F1 Two Players (calm night), L3 Dark Tower (far, in fog, unlit).
6. **Compressed chart**: S3-S4 gap drawn at 60% (design area, `chart.js`).

### 5.6 Placement
| Place | r (angle) | Stratum / gate | Q |
|---|---|---|---|
| Tama, bell, crag, grove, keeper, Velto | 0-430 | S0 | Q4, Q5 (rest hub: Velto) |
| Kestrel transit | ~(150,230) | S0, low water | Q3 |
| F1 Two Players | 500 (8) | S1, calm night | Q2, Q7 |
| C1 Customs Pier | 600 (-75) | S1 | Q1 |
| lagoon / ribs / F3 Cup | 640 / 565 / 650 | S1 (rudder2 / hull2 / high tide) | Q2 / Q3 / Q3 |
| F2 Hammock Isle | 850 (-18) | S2 | Q4 |
| R1 Name Wall | 900 (105) | S2 | Q3 |
| C2 Archive | 1000 (-98) | S2, sighted from the Customs lamp | Q4, Q1 |
| L1 Oil Press | 1050 (165) | S2, oil hub before S3 | Q2 |
| R2 Throwers' Wreck | 1150 (80) | S2/S3, low tide | Q3, Q4 |
| Halved Isle ("broken") | moved 610 -> 1250 | S3, Lantern 2 | Q7 |
| R3 The Surrender | 1300 (128) | S3, night, low visibility | Q2 |
| L2 Keepers' Ledger | 1350 (192) | S3 | Q1, Q3 |
| L3 Dark Tower | 1560 (208) | S3/S4, calm night | Q2 |
| D1 Sunken Street | true 900, labelled S4 | tide lie | Q6 |
| D2 Island That Moves | 2050 | S5, loop seam | Q2, Q7 |
| D3 Table by the Water | 2300 -> 2400 | S5 end | Q7 |

Mandatory path: reach D3 and throw at the hut. Nothing else is required.

### 5.7 Question routes (>= 2 independent regions each)
- **Q1** Customs ledger -> Archive; Keepers' ledger; hut ledger on second look.
- **Q2** Two Players (Free); lagoon + Oil Press + Dark Tower (Lantern); Surrender (Reef); the sky at S5.
- **Q3** Tin box + Kestrel transit (home); Name Wall + ribs (Reef); the Cup (Free); Throwers' Wreck.
- **Q4** Tama bells (home); Archive (Crown); Hammock Isle (Free); Throwers' Wreck.
- **Q5** Tama second look; bell; hut ledger at S3+ (beam crosses the hut). Home by design, three sites.
- **Q6** D1 (tide lie); bell light; D2 Mara line; plus Mara's reaction to **any** drowned village at S3+ so D1 is not a single point.
- **Q7** Two Players tune; Halved Isle; D2; D3.

**Merge decision:** D3 appears on the chart at S5 when **any three** questions reach level 2 (replaces "Q1, Q3, Q4, Q6 all at 2").

### 5.8 Dread curve
| Beat | Where | Dread | Fix |
|---|---|---|---|
| Quiet | 0-450 | 0-0.12 | keep; tutorial UI only |
| First wrong note | 500-700 | 0.12-0.28 | NPC repeats, bell numbers, first tide wreck |
| First night at sea | S2 | 0.3-0.45 | limited oil, lamp-out warning |
| Shock | S3 | 0.45-0.62 | fill the 1100-1800 gap (Halved Isle, Surrender, Keepers, Tower) |
| Relief | Oil Press / Velto | ~0.3 | authored valley before S4 |
| Seam | S4 | 0.62-0.82 | loop seam, D1 lie |
| Abyss | S5 | 0.82-1.0 | start first abyss effect at 0.7, not 0.86 |
| Descent | return | >= 0.68 | `dread = max(distanceDread, 0.85 * peakDread)` |

Also: +0.05 dread at night in S2+; D3 radius equals the dread cap.

## 6. Agent 2: lore and ludonarrative integration

### 6.1 Flaws
- **Told, not found**: `main.js:1591` fisher hands over "Do not sit down" before the hut is seen; `lore.js` GOSSIP[cosmic] and NOTES[cosmic] explain the Eye's temper and the Sit ending; NOTES[sunny] gives away the Kestrel posts to a dread-0 player; X9 level-3 log lines state conclusions.
- **Cosmetic**: Kestrel pays gold only; marks and fragments are never read; knowledge gates nothing until the end; `gates.js` keys on quest index.
- **Order hazards**: thread-woken clues vary per seed; Kestrel log says "she" before the hut is known; X-L3 and X-D1 have no prerequisite.
- **Drift**: the atlas and repo docs disagree on Mara, the Two Players and the demo end; same material in four files.

### 6.2 Principle
A clue is a thing in the world. Seeing it flips a flag and changes what the interface or world permits. No toast. The player learns by a button working, a mark on the chart, or a dread effect becoming survivable.

**Perception rule**: `seen(clueId)` fires when the ship is within R, the clue's condition holds (hour, tide, weather, trait), and the player has stopped or held the spyglass on it for 6-10 s. Sharp-eyed or Seamanship crew shorten it.

### 6.3 Clue table
| Clue | Physical form | Noticed by | Unlocks | Raises | Must NOT state |
|---|---|---|---|---|---|
| Tama bell count | noon strokes the day after a throw | at Tama at noon, stopped | Journal throw tally; tavern "Shutters" skips one dread tick after a low throw | Q4, Q5 | that bells are the throw; "pillow" |
| Customs ledger | line for the Merry Gull before arrival, master blank | read at the pier; night look | Board shows arrivals one harbour ahead | Q1 | who writes it |
| Kestrel posts | two white posts, dark streak at low water | align them | chart transit line (first of three readable marks); Kestrel's lamp shrinks dread-3 whiteout (survival tool, not gold) | Q3 | that she threw a 1 |
| Throwers' Wreck log | cabin at low tide, die missing a number | enter at low tide; read in three parts | hut option "Set the die down" (decline once, costs a day, no ledger line) | Q3, Q4 | that the cost lands elsewhere |
| Name Wall | cliff of names, wet paint on top | dusk, within 80, spyglass | chart wreck ticks (salvage routes) | Q3 | that the names are yours |
| Archive numbers | numbers beside black days | Seamanship / Sharp-eyed | chart margin marks bad days 1 ahead | Q4 | that they equal throws |
| Hammock Isle | sleepers murmuring numbers | moor quiet | crew "Let them sleep": rest on deck clears a dread penalty | Q4 | that low numbers wake them |
| Two Players | two tunes across water | calm night, moored | hut option "Hum" (instrument crew); steer by sound in fog (safe route home) | Q2, Q7 | that the tune keeps something asleep |
| The Cup | two cups, one rubbed out | Sharp-eyed | chart pencil "K" | Q3 | who K was |
| Oil Press doors | lamps burn blue, shut seaward doors | night, lamp lit | blue oil grade shows second doors on harbour charts (costs a day of quiet) | Q2 | what is behind |
| Keepers' ledger | lighthouse lit at noon, future date | fog or day visit | one date in the chart margin in a hand not yours | Q1, Q3 | that it is your date |
| Dark Tower window | stair down, window up through the sea | calm night, door open | spyglass "Look up": survive the glass-calm effect for a minute instead of being pulled home | Q2 | the words lid / eye |
| Sunken Street | roof peaks at lowest tide | low tide, Mara aboard | Mara dread-3 line variant; chart rings the Island That Moves | Q6 | that she is from here |

Region rule kept: only clues from different regions raise a question past level 1.

### 6.4 Ledger
- `state.story.seen = { clueId: dayN }`, set once. Replaces X3's counter as stored truth.
- Question level is **derived**: `lvl(q) = min(3, distinct regions among seen clues tagged q)` (Kestrel weighs +2). Never shown.
- Fragments (`state.life.frags`) map to clue IDs (CL-FR-n); marks stay as hidden reputation, plus `kept` and `listened`.
- `gates.js` gets a second gate kind `know`: `isKnown(state, 'tally')`, same "Not yet" pattern as `isOpen`.
- Single source of truth: `src/clues.js` (id, region, question, form, condition, capability, log line). `scripts/story_export.py` renders the docs from it, ending the drift.

### 6.5 Out-of-order rules
1. Every clue text is true alone and unfinished; none names another clue.
2. No "she", "the Lady", "the hut" or a number until `hutKnown`; say "someone", "a table", "a count".
3. A repeated detail differs between sources (Mara's green door, the street's blue one).
4. Every capability is useful with no lore (tally, forecast, route).
5. A clue at the wrong dread stage shows its dread-version text: earlier means stranger, not wrong.
6. Place gates use **seen** clues, never thread state; no required clue lives only in a thread.
7. Q6 clues require Mara aboard; if she left, it is a drowned street.
8. Each strange place has a bright reading (quiet island, tall rock, flooded village).

### 6.6 Endings from knowing
Three hidden axes: `weight` (low throws plus things taken), `kin` (crew still aboard), and the seen set. Only physical objects appear at the table.
- **Sleep**: always (the throw). With "Hum": play instead. With tally + Archive: set one number aside.
- **Wake**: throw low, or Q2 and Q7 at 2: turn the table.
- **Something else**: Sit (Q3 at 3 + Mara aboard); Leave (decline once earlier, `kept`); Bring someone (kin >= 1, Q6 at 3).
A player who saw nothing gets the die and a real ending. Mara's table line varies by `kin` and Q6, never by a counter.

### 6.7 Immersion guards
1. No popup, banner or toast for a clue; feedback is the added log line and the affordance.
2. No "new" badges; an opened control simply stops being greyed.
3. One short line per beat, <= 5 words where possible; log lines are facts in another hand, never inferences.
4. Banned in player text: lid, eye, sleeper, Lady, kept soft, "Mara is from".
5. Cut X9 level-3 conclusions; pair two facts from different places so the player joins them.
6. No quest markers to clues; sources point through rumours, wind, bearings, birds, watchers.
7. Mara comments at most once per clue and never explains; lines come from `seen` + dread.
8. Bright reading first; dread variants swap text at their stage, never add rules.

## 7. Reconciliations between the two passes

| Conflict | Resolution |
|---|---|
| Agent 1 proposed an entry toast ("Ahead the sea is a different colour") | Dropped: violates guard 1. The change is carried by palette and audio only. |
| Agent 1 gates S5 on "chart fragments"; Agent 2 has no fragments mechanic | S5 gate = any three **seen** clues from different regions (`seen` ledger). |
| D3 prerequisite: Q1, Q3, Q4, Q6 at 2 vs any three | Any three at level 2. |
| Agent 1 lets Mara react to any drowned village; Agent 2 says Q6 needs Mara aboard | Both: reaction at S3+ villages requires Mara aboard; D1 stays the main source. |
| Kestrel as early reward (Agent 1) vs bottle note spoiling it (Agent 2) | Cut the NOTES[sunny] posts line; Kestrel discoverable only by looking. |
| Atlas says F1 music starts after a Free Cays quest | Removed: F1 is calm-night, ship-stopped, quest-independent. |

## 8. Build order
1. `src/clues.js` + `state.story.seen` + `know` gates; migrate X3 counters; export docs. (gameplay)
2. Tone lint pass over `lore.js`, `main.js:1591`, X9 lines. (gameplay)
3. `STRATA`, peak-dread hysteresis, fixed wedges, `strataGate`. (gameplay; palette is shared with design)
4. Tide/night reachability and the 12 new landmarks, placed per 5.6. (gameplay + design)
5. Return current, loop seam, rename/shift. (gameplay)
6. Chart compression and pencil marks. (design, `chart.js`)
7. Stratum loops (five loops already planned) re-timed to strata; Look-up and Hum cues. (audio)
8. Run V1-V6 as a headless check; then the human tests V7, V9, V10.

Open decisions for the writer: which of the atlas's Mara variants is canon (forgets vs remembers); whether the Two Players are refusers or the Long Sleep; where the demo ends. Neither pass resolved these; `clues.js` should record the answer once.

Crosses areas: design (`chart.js`, palette), audio (stratum loops). Update `docs/PROGRESS.md` when each step lands.
