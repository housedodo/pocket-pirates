# Modernised Gameplay & Systems Design Document (proposal)

Phase 2 of three (after `docs/proposals/LORE_BIBLE.md`). Nothing here is built and nothing here is canon. Each proposal has an ID
(G-01 ...) so the owner can approve, tweak or cut it by ID. Every proposal keeps `docs/CANON.md` and `docs/RULES.md`; anything that
would touch a rule or canon is in section 6 instead.

**How far to trust it.** Every number below was read in the code on 2026-11-16 (file and line, or the constant). Nothing was played.
RULES 40: feel cannot be judged headless, so each proposal says whether it is **confident from reading** (a plain logic fault or a
gap anyone can see in the code) or **needs the owner's hands** (it is about how something feels). Line numbers will drift.

**Words used here.** *Range* is always distance from an island's shoreline unless said otherwise (`world.nearest` measures the edge,
`src/world.js:1822`). *Units* are world units; the ship's top speed is 11 units/s (`MAX_SPEED`, `src/ship.js:11`). Times are game
seconds (the game's clock stops in any menu). A day is 690 s (`DAY_LENGTH`). "Stage n" means `stageOf(dread) + 1`, the fifths
1 to 5 (see G-31 for why this needs saying).

---

## 1. Summary for the owner

### The ten changes that would matter most
| # | ID | One line |
|---|---|---|
| 1 | G-01 | Pausing, opening the log or alt-tabbing no longer throws away a half-dug beach or a fish on the line: menus suspend, never cancel. |
| 2 | G-02 | A controller can use every screen: today it cannot press a single button in the harbour, the pause menu, the log or a sea card. |
| 3 | G-03 | An action keeps its target until it ends: a passing boat or a nearby fruit isle no longer cancels a patch, a pick or a salvage. |
| 4 | G-08 | Selling fish or fruit keeps back what an errand in hand needs; today Sell empties the hold and wipes the errand's count. |
| 5 | G-07 | Space means one thing at a time: in a raider fight it fires, and never just skips Mara's "Raiders, off the bow!" line. |
| 6 | G-04 | E forgives: the last thing in reach stays usable for 0.6 s after drifting out, and an E pressed 0.25 s early still counts. |
| 7 | G-05 | C works under way like E does (RULES 18): the anchor goes down and the cast meter starts when she has slowed, no refusal toast. |
| 8 | G-09 | Going into a harbour brings the ship to rest at the pier; today she leaves the harbour at the speed she came in. |
| 9 | G-06 | The fishing strike forgives 60 ms either side of a mark, and a C pressed just before a bite hooks it instead of reeling in. |
| 10 | G-11 | The stick steers by how far it is pushed; today it is an on/off key press past 45%. |

Owner questions that should not wait (section 6): G-28 (post-hut places reachable before the first throw, against CANON
2026-11-13), G-30 (the Ribs count as Reef but lie in Lantern water), G-31 (three ways of numbering dread stages).

### Left alone on purpose
The ship's weight (the rudder barely answers at a standstill, the hull takes about 2 s to come up to speed), the slow wedge into the
wind, dread by place and its 85% floor, the helm going in fog and at the Edge, the glimpse, secrets that show only when you stopped
by yourself, coral that stops you dead, the Drowned belt's wait for low water, raiders breaking off in deep water, no markers and
no minimap, the lamp going out and fishing with it, the sail that tears in a gale, the slow ceremony of the d20, Mara's pacing, the
chapter fog, the Cays' stalls shut by day. The mechanical ones are listed with their reason in section 3 (rows K-01 to K-14); the
rest are canon already (dread by place, the glimpse, the Edge, no minimap, the Cays' music) and are not reopened here.

### Counts
33 proposals: 4 tuning, 24 behaviour, 4 new, 1 documentation only. 27 sit inside the rules (sections 3 and 4); 6 need the owner
(section 6). 14 deliberate frictions are kept (K-rows).

---

## 2. Systems inventory (as the code stands)

Gamepad buttons are standard mapping; the pad is turned into key presses (`src/gamepad.js`). "Pad" below names what the pad sends.

| System | Controls (keyboard / pad) | The rule | Key numbers (source) |
|---|---|---|---|
| **Sailing** | A/D or arrows steer, W/S or arrows trim (pad: left stick past 0.45 / 0.55, or d-pad) | Speed eases to a target set by trim, wind angle, wind strength, gusts, waves, torn sail. The rudder needs water flowing past it. The keel kills sideways slide. Leeway pushes a little downwind. | Target = 11 x sails mod x trim x eff x wind (`ship.js:436`). Ease up 0.5/s, down 0.7/s (`:437`). Trim changes 0.6/s, so 0 to 1 in 1.7 s (`:427`). Rudder follows input at 4/s (`:399`). Turn rate = rudder x turn mod x (0.08 + 0.62 x flow), flow = speed/5 capped at 1, so about 40 deg/s at speed 5+ and 4.6 deg/s at rest (`:445`); yaw eases at 2.2/s (`:446`). Side slip decays 5.5/s (`:453`). Hard turn drag 0.22 x rudder x speed/11 per s (`:439`). |
| **Wind** | none (read on the wind ring) | Wanders over minutes; strength 0.45 to 1.3 with short gusts. Into-wind wedge cuts speed. Early chapters get a gentler wedge and a floor. | Wedge 0.6 pi to 0.95 pi (108 to 171 deg off), floor 0.2 + 0.07 x sails; chapters I and II 0.68 pi to 0.97 pi, floor 0.45 (`main.js:1149`). Felt wind eases at 0.45/s. A shift is announced past 0.95 rad (54 deg) (`wind.js` `shifted`). |
| **Gusts and currents** | sail into them | Dark ruffled patches come down the wind; touch one with trim over 0.3 for a burst. Three current lanes push the ship. The Slack pushes outward. | Gusts every 5 to 11 s, 55 to 95 upwind, +/-35 to the side, drift 6.5/s, radius 7 to 11, caught within R+2; burst x1.32 for 4.5 s (7.5 s with `gustLong`) (`seaplay.js`). Lanes 2.6 to 3.0 units/s, 20 to 24 wide; Slack 2.0 outward between 1150 and 2050. Currents fade out near fog. |
| **Oars** | G toggles (pad LT); W/S row | Sails furl, slow but windless. | Unlocked at chapter 2 (`UNLOCK`). Target 2.6 x sails mod, back 0.9; turn 0.55 rad/s with no flow needed (`ship.js:416-419`). |
| **Interact (E) and the anchor** | E (pad A) | One lookup a frame (`rt.tg`) picks the single thing E would do (priority in section 4.5). For `HEAVE_KINDS` (thread, spring, cave, treasure, fruit, wreck, landmark, patch) E under way drops the anchor and the action starts when she lies still. While an action, a dig or a line is on, the ship is pinned. | Ranges: hut 18, landmark and treasure 16, fruit 14, harbour 38 and within 22 of the pier, "sail to the pier" under 16, wreck 22, hail 24, dead light 45, sighting 15 from the card (`systems/interact.js:31-57`). Anchor: speed x e^(-2.6 t), trim in at 1.6/s (`ship.js:401-409`); from 11 she stops in about 1.4 s and 4.2 units. Starts at speed 0.3 or less; heave gives up after 8 s or if the target changes (`interact.js:66`). |
| **Timed actions** | E starts | A bar on the prompt fills; leaving the target cancels ("The crew came back empty-handed", `main.js:1342`). | Arch 2.2 s, fruit 2.4 s, going ashore 2.6 s, wreck 3.4 s x crew, patch 4.5 s, secret 3.2 s (Kestrel 5 s). |
| **Camera** | wheel zoom; drag orbit and tilt; Z/X orbit (pad LB/RB, right stick X); R/F tilt; V resets | Follows behind the ship, rises with the slow swell, swings back behind after 6 s of no input. | Zoom 24 (14 to 70 + 16 x spyglass), wheel x1.1 a notch; tilt 0.72 rad (0.06 to 1.35); heading follow 1.6/s; orbit 1.8 rad/s; return 0.7/s after 6 s; look point 0.2 x zoom ahead; never under y 3.2; shake decays 1.8/s; tremor over dread 0.85; first sight of an island pulls out 15% over 2 s (`ui/camera.js`). No keyboard or pad zoom. |
| **Fishing** | C (pad X) to start, C to cast, C or Space (pad RT) to hook and strike; hold for deep water | Power meter, wait, bite, then the bite ring: strike on green (gold better). The water picks the ring (wreck, night, swell, deep, reef, calm). | Start only under speed 2.5 ("Too fast to fish"); cancelled over 3.2 (`fishing.js:145, 241`). Meter swings 1.15 s each way. Wait 2.5 to 7 s x (1 - 0.25 bonus) + 2.5 x power. Bite window 1.3 s. Needle 2.0 + 2.3 x difficulty rad/s; meter starts 0.35, +0.18 green, +0.30 gold, drains 0.02 + 0.02 x difficulty a second; 3 misses lose it; deep: hold, 0.7 s off the mark is a miss (`fishing.js:177-188, 320-336`). Lamp out: no fishing. |
| **Digging** | arrows/WASD and E or Space (pad d-pad and A or RT), or click | Probe an 8 x 5 beach: darker sand is closer; stones crack the shovel; the tide rises a step each dig. Wrong shore (more than 0.85 rad off the riddle's bearing) is a 2.2 s dig that finds sand. | Digs 10 (13 for the first chest) + crew (up to +3.6) + dig buff 2, -1 past dread 0.5; stones 3 (+1 past 0.4; 2 for the first); 2 cracks break the shovel (shingle 3 with +3 stones); dunes refill the oldest hole every third dig; mud +3 digs and no tide; 30% of squares lie past dread 0.5; a fail costs 6 s (`interact.js:145-200`, `digging.js`). |
| **Deliveries, passengers, commissions** | harbour board (mouse; keys 1-4 for tabs) | One delivery, one passenger, up to 3 commissions held. Crown deliveries have a deadline. | Delivery pay 20 + 0.12 x distance + 40 x dread (`jobs.js:42`); passenger 15 + 0.09 x distance (`passengers.js:79`); Crown deadline distance/6 + 60 s, on time x1.45, late x0.55 (`regions.js:55`). Reputation up to 3 stars, 5% each. |
| **Trade and upgrades** | harbour Market and Shipwright (mouse) | Sell the whole catch or all fruit in one press. Seven upgrades, three levels. | Costs 80 to 700 a level; all 21 levels cost 6,680 gold (`upgrades.js`). Sails +12% speed a level, rudder +22% turn, hull +30, cannons +4 damage and -0.3 s reload, crew -20% dig time and +20% loot, lantern +15% night view, spyglass +16 zoom. |
| **Combat** | Space (pad RT) fires at the nearest raider in range | Optional. Raiders chase inside 170, fight inside 85, circle under 50, give up past 210, break off past dread 0.55. | Player: 2 balls a volley, 14 + 4 x level damage, reload 1.9 - 0.3 x level s, range 85, ball speed 38 (`combat.js`, `upgrades.js`). Raider: first shot after 2 to 4 s, then every 4.6 to 7 s, 7 to 10 damage, spread grows with your speed (`combat.js:72-79`). Raider hp 20 to 95 (`traffic.js:24`). Hit taken: shake 0.25 + 0.03 x damage, 60 to 80 ms hitstop, a 140 ms red frame (`storybeats.js:202-205`). Sinking: wake at the nearest harbour, -25% gold. |
| **Lamp oil** | L puts the lantern out | Burns when it is dark, foggy or stormy; empty = the dark comes in, no fishing. | Cap 100 + 30 x lantern; burn 0.26 x (1 + 0.8 x dread)/s, so a full lamp lasts 385 s at home and 234 s at dread 0.8; Mara warns at 25% (`oil.js`, `storybeats.js:168`). Lantern Guild: x0.5 near a lit light, x2 in the open dark. |
| **Torn sails** | none; E with a kit | Full sail in a real storm strains the canvas. | Warning at 7, tear at 20 strain; x0.66 speed until patched (`storybeats.js:173-185`). |
| **The log and the chart** | M (pad Y) log, J orders, 1-3 bookmarks, arrows turn pages; mouse pins | Three bookmarks; the chart pans and zooms by mouse; a pin steers the wind ring's dot until you are within 22. | `logbook.js`, `chart.js`, `ui/hud.js:31-33`. |
| **Harbour screens** | E (pad A) closes; 1-4 or left/right pick a tab; M opens the log | Board, Market, Tavern, Shipwright; greyed signs answer with one line (RULES 13). | `ui/harbour.js`, `main.js:615-623`. |
| **The die and tavern games** | Space throws at the hut, E leaves; tavern games by their own keys, E or Esc leave | One d20 (with advantage and disadvantage) for checks; eight tavern games. | `tabletop.js:70-97` (result held 1.5 s); `localgames.js`. |
| **Region rules** | none | Each region's numbers in `src/regions.js` (DESIGN "Regions that play differently"). | Coral: hurt 6 + 1.2 x speed, speed x0.25, 1.5 s between hits (`systems/reef.js:20-27`). Drowned belt 1740 to 1800, open below tide -0.3, throws you back and 5 hull every 2 s (`systems/drowned.js`); the tide runs two cycles a day (345 s each), open about 40% of each. |
| **Barriers and fog** | none | Reef, breakers and fog banks round three places push you out and say which upgrade lets you in; the chapter fog and the fog banks take the helm. | `places.js` `BARRIERS`; lost: helm ignored over `lostK` 0.3, heading eases outward, speed to 3.2, drift 1.8/s (`storybeats.js:73-85`). |
| **Dread** | none | By distance from Tama through six strata; never below 85% of the worst reached; +0.05 at night from the Trade Belt out. | `palette.js` `STRATA`, `main.js:734`; eased 0.4/s; Cays cap 0.45 on a still night (`lullaby.js:8`). |
| **Saving** | none | Every 4 s silently; on a finished goal or a dock with the ship icon. URL test flags never write. | `main.js:309-322, 1424`. |

---

## 3. Friction-to-solution audit

Kinds: **accidental** (nobody meant it), **deliberate-keep** (part of the game; left alone), **deliberate-but-soften** (meant, but
harder than it needs to be). Type: tuning / behaviour / new. Effort: S under an hour, M a session, L more. Identity risk: what could
be lost. Confidence: **R** confident from reading, **H** needs the owner's hands.

### 3.1 Input, locks and waits
| ID | Where | What the player gets | Cause in the code | Kind | Proposal | Type, effort, files | Risk | Conf. |
|---|---|---|---|---|---|---|---|---|
| G-01 | `main.js:508-515` `openModal` | Pressing Esc, M, J, or alt-tabbing (blur opens pause, `main.js:710`) mid-dig or mid-fight: the beach or the fish is simply gone, without a word. "Reread the riddle in your orders" (`interact.js:159`) sends the player to the log, which wipes the dig. It also gives a free re-roll of a bad beach (`start()` hides the chest anew). | `openModal` calls `fishing.cancel()` and `digGame.cancel(); rt.dig = null`. | accidental | Any modal **suspends** the dig and the line (the game clock is already 0 in a modal, so both freeze); on `closeModal` their panels show again. Only G-10 (dig) and C in the wait (fishing) end them by choice. A timed action (`rt.dig` without `mini`) is kept the same way. | behaviour, M; `main.js`, `fishing.js` (a `suspend/resume` pair that hides and shows `#fishui`), `digging.js` (same for `#digui`) | none | R |
| G-07 | `main.js:637` | In a raider fight, the first Space only skips Mara's "Raiders, off the bow!" (said the moment a raider engages, `main.js:1285`), so the first broadside does not go. A Space during the 1.9 s reload is lost. | Space: fishing, else skip Mara, else fire. `playerFire` returns 'reload' and nothing waits. | accidental | While a raider is engaged (`s.engaged`), Space fires and never skips; Enter or a click skip Mara (they already do). A Space pressed up to 0.25 s before the reload ends fires when it ends. The 1.5 s guard after a strike stays. | behaviour, S; `main.js` keydown, `combat.js` (`pending` fire time) | none | R |
| G-12 | `main.js:630` | Holding W (or a pad direction) while a menu closes: the ship ignores it until the key is let go and pressed again. | `keys.clear()` on open; afterwards the held key only sends repeats, and `if (e.repeat) return` runs before `keys.add`. | accidental | Let repeats re-add the six movement codes (A, D, W, S and the arrows) only; actions still ignore repeats. | behaviour, S; `main.js` | none | R |
| G-10 | `digging.js` | Once a dig starts there is no way off the beach except finding, failing or (today) Esc, which G-01 removes. | No leave action. | accidental (once G-01 lands) | Hold E (pad A) 0.8 s on the beach: the crew packs up. It counts as a fail (6 s wait, the chest moves, `attempts` +1), so it is never a free re-roll. The prompt bar fills while held; no new words. | behaviour, S; `digging.js`, `main.js` | none | R |
| K-01 | `tabletop.js:90-95` | The die rolls, then the result holds 1.5 s. | ceremony | deliberate-keep | Keep: the throw is the game's one ritual (CANON 1.4). | | | |
| K-02 | `objectives.js` `Mate` | Mara's lines hold 3.2 s + 0.065 s a character, 1.4 s between; next goal after 8 s early, 5 s later. | pacing | deliberate-keep | Keep: the cosy pace, and Space/Enter/click already skip. | | | |

### 3.2 Ranges, forgiveness and cancellations
| ID | Where | What the player gets | Cause | Kind | Proposal | Type, effort, files | Risk | Conf. |
|---|---|---|---|---|---|---|---|---|
| G-03 | `main.js:1342` | A patch (4.5 s), a fruit pick, a salvage or a dig is cancelled ("The crew came back empty-handed") when something with a higher priority comes in reach, though the ship has not moved: a passing fishing boat inside 24 cancels a fruit pick or a patch; a torn sail cannot be patched within 14 of a fruit isle at all. | The running action is cancelled whenever this frame's `rt.tg.key` differs from it; priority, not distance, decides. | accidental | An action keeps its own target. It ends only when it is done, when the player ends it (G-10), when the game moves the ship (sinking, a teleport), or when the ship is more than the target's range + 8 from it (it cannot be while anchored). The prompt shows the action, not the new thing. | behaviour, S; `main.js` (store the target on `rt.dig`), `systems/interact.js` | none | R |
| G-04 | `interact.js:66` | E pressed at 15.9 units from a landmark at speed: she stops 4.2 units on, outside 16, and the heave is silently dropped (the 'ui' click played). E pressed a moment before the prompt appears does nothing. | Heave cancels as soon as `rt.tg.key` changes; no grace, no buffer. | accidental | **Grace:** the last actionable target stays E-able for 0.6 s and up to its range + 6 after it leaves reach. **Heave hold:** while the anchor is going down the target's range is +8 (covers the 4.2-unit stop). **Buffer:** an E with nothing in reach is held 0.25 s and fires if a target appears. Harbours are excluded from the grace (the pier rule stays exact). | behaviour, S; `systems/interact.js` | none | R |
| G-05 | `fishing.js:145` | C under way: "Too fast to fish: reef the sails (S)..." The player must stop by hand, which RULES 18 forbids for E. | `start()` refuses over 2.5. | accidental | C under way works like E: the anchor goes down (`anchorTick` already pins while `fishing.active`) and the power meter appears once speed is 2.5 or less. The toast goes. | behaviour, S; `fishing.js`, `systems/interact.js` (`anchorTick` reads a `fishing.pending` flag) | none | R |
| G-06 | `fishing.js:198-221, 140` | A strike a hair early or late counts as empty water. A C pressed in anticipation of the bite, a moment before it comes, reels the line in ("You reel in the empty line"). | Hit test is exact at the key press; C in `wait` cancels. | accidental | **Strike tolerance:** a strike counts if the needle is inside a mark now, or was within the last 60 ms, or will be within the next 60 ms at its current speed (gold the same, with the gold arc). Snags use no tolerance (a red mark is never forgiven). **Early hook:** a C in `wait` waits 0.25 s; a bite inside that window is hooked; otherwise the line comes in as now. Bite window 1.3 s unchanged. | behaviour, S; `fishing.js` | small: easier fish | R for the logic, H for 60 ms |
| G-13 | `interact.js:31-57` | Near a harbour's shore (under 16) E does nothing ("Sail to the pier") even when a wreck, a hail or a secret is in reach. A torn sail near a jungle isle: E picks fruit, never patches. | Fixed order: `harbourfar` (no action) sits above secret, landmark, treasure, wreck, hail; `patch` sits last. | accidental | `harbourfar` drops to just above `patch` (it is a hint, not an action); `patch` moves above `fruit` and `ship`. Full order in 4.5. | behaviour, S; `systems/interact.js` | none | R |
| G-14 | `interact.js:81-88` | Lecture toasts that RULES 18 means to avoid: "Bring the ship to a full stop first (S to reef the sails)" on a dug treasure isle (the heave is skipped for `isl.dug`, then the stop check fires) and when E is pressed at a secret under way. | Leftover stop checks. | accidental | Remove the stop toasts where the heave covers the kind; on a dug isle E does nothing (the prompt already says "Already plundered"). At a secret, E under way does nothing and the prompt stays hidden (K-05 keeps the rule itself). | behaviour, S; `systems/interact.js` (text removed: run `story_export.py`) | none | R |
| G-09 | `interact.js:104-144` | Into a harbour at 8 units/s, out of it at 8 units/s, a few units from the pier: the first thing after "Set sail" can be a bump. | Opening the harbour never touches `ship.speed`, `trim` or `vel`; the clock simply stops. | accidental | Docking lays her alongside: speed 0, `vel` null, trim to 0 (as the anchor does). Leaving, she is still, sails in; W raises them. | behaviour, S; `systems/interact.js` | small: a docking that is too tidy | R that the speed is kept; H whether it bites |
| G-17 | `seafeatures.js` (barrel 4.8, bottle 6.5), (crate 5.2, line 193) | Barrels and errand crates must be sailed through within 4.8 and 5.2 units with a ship that turns on an 11-unit radius at speed 8. | small radii | deliberate-but-soften | Barrel 4.8 to 6.0, crate 5.2 to 6.0; bottle stays 6.5. Still "sail into it". | tuning, S; `seafeatures.js` | small | H |
| K-03 | `ship.js:445` | The rudder barely answers at rest (0.08 of its turn), so a stopped ship must sail before it turns. | weight | deliberate-keep | Keep: "a ship with weight" (brief); `blockT` already gives 0.6 flow when pinned against a pier or shore, and oars turn freely. | | | |
| K-04 | `ship.js:437` | Speed comes up over about 2 s and dies over about 1.4 s. | weight | deliberate-keep | Keep. | | | |
| K-05 | `interact.js:84`, prompt `main.js:1359` | Secrets show only when you stopped by yourself (speed 0.6 or less). | discovery | deliberate-keep | Keep (DESIGN "The slip, the anchor"): you find them by stopping to look. | | | |

### 3.3 Menus and inventory
| ID | Where | What the player gets | Cause | Kind | Proposal | Type, effort, files | Risk | Conf. |
|---|---|---|---|---|---|---|---|---|
| G-08 | `ui/harbour.js:225-226`, `ui/shiptrade.js:91` | "Sell fish" sells the whole hold, including the five snapper an accepted commission needs; its count drops to 0/5 (`questProgress` counts `state.catch`, `jobs.js:114`). Fruit the same. | Sell empties `state.catch` and every fruit. | accidental | Sell keeps back what commissions in hand need (per species and per fruit, up to `n`); the button's sum and the "in the hold" line count only what is sold. If nothing else is left, the button says nothing more (it is not shown, as now with an empty hold). The Drowned's keeping (`drownedTake`) is unchanged: that loss is their rule. | behaviour, S; `ui/harbour.js`, `ui/shiptrade.js`, `jobs.js` (a `reserved(state)` helper) | none | R |
| G-21 | `fishing.js:194, 317`, `digging.js:62-63` | Every fight prints its water's name and tip ("Deep water. HOLD C / Space while the needle is on green; let go off it."), every beach its rules, every time. | `say` is set on every hook / start. | accidental | Show a ring's or a beach's tip the first two times it is met (`state.hints`), then the name only (fishing) or nothing (beach). The ring and the beach still look different, which is the real tell. | behaviour, S; `fishing.js`, `digging.js` | none | R |
| K-06 | `gates.js` | Greyed signs and buttons answer one line until their goal. | RULES 13 | deliberate-keep | Keep. | | | |

### 3.4 Traversal and wayfinding (inside "goals are found")
| ID | Where | What the player gets | Cause | Kind | Proposal | Type, effort, files | Risk | Conf. |
|---|---|---|---|---|---|---|---|---|
| G-23 | `systems/drowned.js` (race) | At high water the belt snaps the ship to its edge in one frame (`p.x *= tr / r`) and scrapes 5 hull every 2 s. | position set, not pushed | deliberate-but-soften | Same rule, read as water: an outward push of 12 units/s that dies over 1 s, speed x0.2 as now, scrape as now. Full game only. | behaviour, S; `systems/drowned.js` | small | H |
| K-07 | `places.js`, `storybeats.js:73` | Fog banks and the chapter fog take the helm and turn you out. | the sea is uneasy; gates | deliberate-keep | Keep; the `hum` capability already softens it (L9). | | | |
| K-08 | `systems/reef.js` | Coral stops the ship dead and costs hull. | Reef rule (CANON 2026-11-13) | deliberate-keep | Keep; it is visible coral. | | | |
| K-09 | `systems/drowned.js` | Waiting up to about 3.5 minutes for low water at the belt. | Drowned rule | deliberate-keep | Keep; the tide mark on the HUD shows it wordlessly. | | | |
| K-10 | `hud.js` `goalTarget` | Later goals give a "where to look" line, never a dot. | RULES 11 | deliberate-keep | Keep. | | | |

### 3.5 Camera
| ID | Where | What the player gets | Cause | Kind | Proposal | Type, effort, files | Risk | Conf. |
|---|---|---|---|---|---|---|---|---|
| G-15 | `ui/camera.js:91`, `main.js:1177-1178` | Zoom only by mouse wheel: keyboard-only and pad players cannot zoom (and the spyglass's wider zoom is mouse-only). Pressing F with the tilt under 0.3 snaps it to 0.3. | No zoom keys; `KeyF` clamps to 0.3, not `PITCH_MIN` 0.06. | accidental | Minus/Equal (and pad right stick Y past 0.5) zoom at x1.6 per second within 14 to `zoomMax`; F clamps to `PITCH_MIN`. | behaviour, S; `main.js`, `ui/camera.js`, `gamepad.js` | none | R |
| G-16 | `ui/camera.js:30` | At speed the ship sits mid-screen with as much water behind as ahead. | look point fixed at 0.2 x zoom | deliberate-but-soften | Look point 0.2 x zoom at rest rising to 0.32 x zoom at full speed, eased at 1/s; never past the bow when anchored. | tuning, S; `ui/camera.js` | small: the framing | H |
| G-27 | `ui/camera.js` | Unknown whether a hill ever hides the ship at a pier (no occlusion handling exists). | none | unverified | Only if the owner sees it: when terrain lies between the lens and the deck, raise the tilt up to +0.25 over 0.5 s; never cut, never move inside an island. Design and gameplay. | new, M; `ui/camera.js`, `world.js` (`terrainHeight`) | small | H (first see it) |

### 3.6 Combat readability
| ID | Where | What the player gets | Cause | Kind | Proposal | Type, effort, files | Risk | Conf. |
|---|---|---|---|---|---|---|---|---|
| G-22 | `combat.js:72-79`, `traffic.js` | A raider's shot has no warning (the `cannon` cue is unlisted, so silent), and a raider looks the same at 5 hp as at 95. | no tell; no damage state | deliberate-but-soften | **Tell:** 0.7 s before a raider fires, a small puff at its gun side (the existing `puff`, size 0.5) and it holds its turn; the shot then flies as now. **Damage:** under half hp a raider lists 6 deg and trails a thin smoke; under a quarter it runs (`speed[0]`, turns away). No bars, no numbers. | behaviour, M; `combat.js`, `traffic.js` (design does the smoke's look) | none | R the gap; H the 0.7 s |
| K-11 | `traffic.js:250` | Raiders break off past dread 0.55. | lore texture | deliberate-keep | Keep (owner 2026-11-13). | | | |

### 3.7 Progression loop and economy
| ID | Where | What | Cause | Kind | Proposal | Type, effort, files | Risk | Conf. |
|---|---|---|---|---|---|---|---|---|
| G-25 | whole economy | Nobody has measured gold per hour; ROADMAP Phase 1 asks for a balance pass. The sinks: 6,680 gold for every level; the strata ask S2 lantern 1 + hull 2 (440), S3 lantern 2 (+200), S4 hull 3 or sails 3 (520 or up to 1,070). | no data | missing tool | A test flag `?econ=1` (dev only, never demo or full) logs gold earned per game hour by source (treasure, delivery, passenger, commission, fish, fruit, salvage, bounty, places) to the debug line and `__game.econ`. Balance numbers come after one owner run with it. | new, S; new `src/systems/econ.js`, a few call sites | none | R |
| G-33 | `regions.js:55` | Crown deadline = distance/6 + 60 s. A 300-unit run gets 110 s; at cruising 8 units/s it takes 38 s, about twice that tacking. | numbers untested (ROADMAP 2a) | deliberate-but-soften | Keep the formula; arrivals within 15 s of the deadline count on time. | tuning, S; `regions.js` (`jobPay`) | small | H |
| G-24 | `upgrades.js:5` | Lantern 3's card promises it "keeps the dark back"; nothing in the code does more than the +15% view of levels 1 and 2. | text without a rule | accidental | Give the words an ordinary rule: at lantern 3 the lamp burns x0.8 (`oilRate`). No new text. | tuning, S; `oil.js` | none | R |
| K-12 | `storybeats.js:173` | Full sail in a gale tears the mainsail. | risk with warning | deliberate-keep | Keep; 13 strain between warning and tear. | | | |
| K-13 | `oil.js` | The lamp runs dry; no fishing in the dark. | planning | deliberate-keep | Keep. | | | |

### 3.8 Onboarding, gamepad parity, accessibility
| ID | Where | What the player gets | Cause | Kind | Proposal | Type, effort, files | Risk | Conf. |
|---|---|---|---|---|---|---|---|---|
| G-02 | `gamepad.js`, `main.js:566-623` | With a pad: no button in the pause menu, the harbour, the log, the shipyard, a sea card, a cave or the ship trade can be pressed. A in the harbour closes it (A sends E, and E closes). Card and cave choices need digit keys. B at sea opens the pause menu (it sends Escape), though the checklist says "B closes". | The pad dispatches synthetic `KeyboardEvent`s; a synthetic Enter or E never clicks a focused button; most screens are mouse-only. | accidental | In any modal: d-pad and left stick move focus between that screen's buttons (in reading order); A presses the focused button (the pad sends a new code `PadA` in menus, handled as `.click()`); B goes back one level, then closes. At sea: B does nothing; Start opens the pause. Card and cave choices take focus like buttons. The harbour keeps E-closes for the keyboard. | behaviour, M; `gamepad.js`, `main.js` keydown, `ui/harbour.js`, `ui/encounters.js`, `ui/pause.js`, `logbook.js` | none | R |
| G-11 | `gamepad.js:28-31` | Steering on a stick is a key press past 0.45; there is no half rudder. | axes turned into keys | accidental | The pad hands `rt.padSteer` = sign(x) x ((abs(x) - 0.15)/0.85)^1.5 (deadzone 0.15) to `shipInput.steer`; keys win when pressed. Trim stays on the stick as keys (it already changes slowly). | behaviour, S; `gamepad.js`, `main.js:1171` | none | R; H the curve |
| G-18 | prompts `main.js:1356-1365`, help `:643`, `fishing.js`, `digging.js` | With a pad, every prompt says "[E]", every tip "C / Space". | text names keys | accidental | Remember the last device; with a pad the prompts and tips name A, X, RT. Same lines, one more variant each (`story_export.py`). | behaviour, S; `gamepad.js`, `main.js`, `fishing.js`, `digging.js` | none | R |
| G-19 | `gamepad.js` | No rumble at all. | not built | new | Optional rumble (`vibrationActuator`, where the browser has it), a "Rumble" switch beside Shake in Pause > Settings, off under reduced motion like the other comfort switches. Patterns in section 5. Never for a horror beat. | new, S; `gamepad.js`, `core/config.js`, `ui/pause.js` | none | R |
| G-20 | `main.js` keydown | No remapping; prompts are QWERTY labels on a layout-independent `e.code` (on AZERTY "[E]" is right, but W/A/S/D read Z/Q/S/D). | hard-coded codes | missing | One `KEYMAP` (action to codes) in `core/config.js`, used by the keydown handler and the prompt text; Pause > Settings > Keys lists the actions with a press-to-set row. Where the browser exposes `navigator.keyboard.getLayoutMap`, prompts print the real label. | new, M; `core/config.js`, `main.js`, `ui/pause.js` | none | R |
| K-14 | `fishing.js` deep ring | Deep water asks you to hold, not tap. | the skill | deliberate-keep | Keep; a toggle would remove the fight. Said here because "hold versus toggle" was asked: every other hold in the game is either steering, trim (which keeps its value) or this. | | | |

Accessibility basics, in a line each: contrast stays inside the style (the HUD is navy panels with paper text; nothing to change without
design); comfort switches exist (G4); remapping G-20; rumble G-19; nothing in the game needs a timed hold except deep fishing (K-14)
and G-10's 0.8 s leave.

---

## 4. Core control rules

Rules a programmer can build and a level designer can rely on. **Today** = in the code now. **Proposed** = needs the ID's approval.

### 4.1 Frame and input model (today)
- One-shot actions (E, C, Space, G, L, M, J, Q, Y, H) run in the `keydown` handler as the event arrives (`main.js:555`), outside the
  frame. Held inputs (steer, trim, camera) are polled in frame step 2 from the `keys` set (`main.js:1171-1178`). The pad is polled once
  a display frame and turned into key events (`gamepad.js:24-36`).
- A key-repeat never triggers an action (`main.js:630`). Proposed G-12: repeats re-add the six movement codes only.
- `dt` is 0 in any modal and during the intro; the world's clock, timers and `after()` delays stop with it.

### 4.2 Input buffering
| Action | Buffers? | Window | Status |
|---|---|---|---|
| E with nothing in reach | yes | 250 ms: fires if a target appears | Proposed G-04 |
| E under way at a heave kind | the heave is the buffer | until stopped, max 8 s | Today |
| C under way | the anchor is the buffer | until speed 2.5, max 8 s | Proposed G-05 |
| C in the wait, before a bite | yes | 250 ms: a bite inside it is hooked | Proposed G-06 |
| Strike (C / Space on the ring) | tolerance, not buffer | +/-60 ms around a green or gold mark; never on red | Proposed G-06 |
| Space during the cannon reload | yes | 250 ms before ready | Proposed G-07 |
| Dig square (E / Space) | no | each press is a dig; a dug square costs nothing | Today |
| Menu keys | no | a key that opens a menu is spent; held keys are cleared on open | Today |
| Mara skip | no | | Today |

### 4.3 Forgiveness windows (the coyote-time equivalents)
| Window | Number | Status |
|---|---|---|
| Interact grace after leaving reach | 0.6 s and up to range + 6 (not harbours) | Proposed G-04 |
| Heave target hold | range + 8 while the anchor goes down | Proposed G-04 |
| Running action vs drift | never cancelled by drift: the anchor pins the hull (`interact.js:72`) | Today (RULES 18) |
| Running action vs priority | never cancelled by another target | Proposed G-03 |
| Bite window | 1.3 s | Today, keep |
| Deep-water strain | 0.7 s off the mark before a miss; 3 misses | Today |
| Three misses on the ring | 3 | Today |
| Dig shovel | 2 cracks (shingle 3) | Today |
| Coral | 1.5 s between hits | Today |
| Drowned belt | 2 s between scrapes | Today |
| Raider gives up | past 210 and 20 s old | Today |
| Sail strain | warning at 7, tear at 20; decays 0.8/s off full sail | Today |
| Sinking | never a game over: nearest harbour, -25% gold | Today |
| Crown deadline | 15 s grace | Proposed G-33 |
| Pin reached | within 22 | Today |

### 4.4 Interrupt and cancel rules
**No action may trap the player.** Every running action ends by itself or by a choice the player can make with one key.

| Running | Ends by itself | The player ends it | Never ends it |
|---|---|---|---|
| Heave (anchor going down) | the action starts at speed 0.3; 8 s timeout | another E elsewhere; steering does not (the helm is free, the anchor slows her) | drift, priority (proposed) |
| Timed action (arch, fruit, ashore, wreck, patch, secret) | done | none today; proposed: none needed (2.2 to 5 s) | menus (G-01), priority (G-03), drift |
| Dig (beach) | found, tide, shovel | hold E 0.8 s (G-10, counts as a fail) | menus (G-01), priority (G-03), drift |
| Fishing aim, wait | | C in the wait reels in (after G-06's 0.25 s) | menus (G-01) |
| Fishing bite, ring | slow, 3 misses, strain, snag | none needed (it ends in seconds) | menus (G-01) |
| Lost in fog, the Edge | leaving the fog; about 45 s | none (on purpose, K-07) | |
| Mara's line | its hold time | Space (unless a raider is engaged, G-07), Enter, click | |
| A modal | | Esc (pad B) closes or backs out; E closes the harbour, hut and ship trade | |

What can interrupt what: a menu suspends everything and resumes it (G-01). The hut throw, a card and the Table are modals and follow
the same rule. Nothing the world does opens a modal on top of a running dig or fight except a story card the player chose to open.

### 4.5 Interact priority (one target a frame)
Today (`interact.js:31-57`): hut 18 > sighting 15 > cave > spring > thread > harbour (38 and pier 22) > "sail to the pier" (under 16)
> secret > landmark 16 > treasure 16 > wreck 22 > hail 24 > fruit 14 > dead light 45 (lit) > patch.

Proposed (G-13): hut > sighting > cave > spring > thread > harbour > secret > landmark > treasure > wreck > **patch** > hail > fruit >
dead light > **"sail to the pier"**. A running action holds its own target regardless (G-03).

Level-design guarantee: two actionable things should not be placed within each other's range unless the higher one is the intended
one; a place with an E action keeps 30 units of clear water from any harbour pier.

### 4.6 Hold and tap conventions
- Tap: E, C, Space (fire, strike, skip), G oars, L lamp, M log, J orders, Q tracker, H hide HUD, Y hint.
- Hold: steering, trim (the value stays where you leave it), camera keys, deep-water fishing.
- Proposed hold: E 0.8 s on the beach to leave (G-10). No other hold is added. A hold always shows its fill on the existing prompt bar.

### 4.7 Steering and sail response (today, with proposals)
| Quantity | Curve | Number |
|---|---|---|
| Rudder from input | first-order | 4/s (time constant 0.25 s) |
| Turn rate | rudder x turn mod x (0.08 + 0.62 x min(1, speed/5)), x0.75 at speed 12 | 0.70 rad/s (40 deg/s) at speed 5+, 0.08 rad/s (4.6 deg/s) at rest; rudder 3: x1.66 |
| Yaw from turn rate | first-order | 2.2/s |
| Trim | linear while W/S held | 0.6/s (x1.7 after the bread dish) |
| Speed | first-order to target | up 0.5/s, down 0.7/s |
| Pad steer (proposed G-11) | deadzone 0.15, power 1.5 | full rudder at full stick |
| Oars | target 2.6 x sails mod, turn 0.55 rad/s without flow | |

### 4.8 Anchor behaviour (today; RULES 18)
1. E under way at a heave kind sets the heave; the 'ui' cue plays once.
2. `ship.anchored` while a heave, a dig (`rt.dig`) or a line is on. Speed decays x e^(-2.6 t), trim comes in at 1.6/s, yaw decays with it.
3. At speed under 0.3 the anchor bites: position pinned (`rt.anchorAt`), the bow dips 0.35, a foam ring at the bow (G1).
4. Pinned: currents, leeway and the Slack do not move her (`interact.js:72`).
5. The heave starts the action at speed 0.3 or less; it gives up after 8 s or if the target is lost (G-04 widens "lost").
6. Proposed: C uses the same anchor (G-05); a harbour visit lays her alongside at rest (G-09).

### 4.9 Camera rules
**Today:** follows the ship's heading at 1.6/s; looks 0.2 x zoom ahead; rises with the slow swell (0.65 x the hull's float, eased
1.1/s), never below y 3.2; orbit returns behind the boat 6 s after the last camera input; shake only by event and only with Shake on;
tremor over dread 0.85; the abyss roll except at the Edge; the Edge and the glimpse own the camera while they run.

**Proposed:** keyboard and pad zoom (G-15); look-ahead with speed (G-16); occlusion only if seen (G-27).

**The camera must never:** cut while sailing (only the intro, the Edge's fade and a sink); point at a goal, a clue or a horror (no
auto-framing of anything except the hut on the chart, which exists); zoom by itself except the 15% first-sight breath; go under the
water or inside an island; shake when Shake is off; roll when Shake is off; frame a lost sailor, the diver or the Edge's shapes any
closer than the world places them.

**Storms:** no camera change today; keep (the storm wall and the swell already carry it). **Harbour approach:** no change; the
player's zoom is kept. **The Edge:** the camera is the Edge's (`systems/edge.js`); fog is held at 90 to 420 so the shapes stay sharp.

### 4.10 Pause and menu rules
- Esc or P opens the pause; any modal stops the clock (`dt` 0), the music pauses only in the pause (`audio.setPaused`).
- A blur opens the pause, except in a screenshot run and while the Sound Studio window has focus.
- Proposed G-01: a modal never ends a dig, a line or a timed action; they resume on close.
- The log's bookmarks never move; a click beside the book does not close it (RULES 20).
- Proposed G-02: every modal is fully usable by pad: focus moves by d-pad, A presses, B backs out.

### 4.11 Gamepad mapping
| Pad | Today | Proposed |
|---|---|---|
| Left stick | steer and trim as keys past 0.45 / 0.55 | analogue steer (G-11); trim as today; moves focus in menus (G-02) |
| D-pad | arrows (steer and trim at sea; pages, tabs, dig grid) | same; moves focus in menus |
| A | E | E at sea; presses the focused button in menus (G-02) |
| B | Escape (opens pause at sea) | back / close in menus; nothing at sea |
| X | C (fish) | same |
| Y | M (log) | same |
| RT | Space (strike, fire, skip) | same |
| LT | G (oars) | same |
| LB / RB, right stick X | camera orbit | same |
| Right stick Y | nothing | zoom (G-15) |
| View / Select | Q (tracker) | tap Q; hold 0.6 s = Y (hint), which no pad button reaches today |
| Menu / Start | Escape | pause |
| Left stick press | L (lantern) | same |
| Rumble | none | G-19 |

---

## 5. Feedback and telegraphing matrix

Sound: cues listed in `CUES.oneShots` (`src/audio.js:24`) play: ui, dig, buy, pause, chapter, fail, success, card, roll_d6, roll_d20,
cast, bite, catch, thunder, oar, bell, deepbell. Anything else called is **silent on purpose** (RULES 25); a new cue is the owner's and
the audio area's. "Needs new cue" means a gap the owner may choose to fill, not a proposal to add one. Rumble refers to G-19 (proposed).
HUD stays wordless: "prompt" is the one action line above the ship; "toast" is a passing line.

| Event | Visual | Sound | Rumble (G-19) | HUD | Timing | Silent twin (RULES 28) | Demo |
|---|---|---|---|---|---|---|---|
| Interact available | prompt "[E] ..." (pad: G-18) | none | none | prompt only | while in reach (+0.6 s grace, G-04) | the prompt | same |
| Anchor going down | "Dropping anchor..." prompt; sail comes in | `ui` once | none | prompt | 1.4 s from full speed | the sail and the slowing | same |
| Anchor bites | bow dip 0.35, foam ring | none | 60 ms weak | none | at speed 0.3 | the foam | same |
| Timed action | prompt bar fills | `dig` at start | none | prompt bar | 2.2 to 5 s | the bar | same |
| Cast | rod swing, bobber arc | `cast` | none | fishing panel | 1.0 s | the bobber | same |
| Bite | bobber dips hard, "BITE!" blinking, toast | `bite` | 80 ms weak | fishing panel | 1.3 s to answer; no lead | the dip and the blink | same (no dark fish) |
| Strike on the ring | needle flash green / gold / red | a soft tone (see "Found" in the report: it bypasses the list) | 40 ms on gold | the ring | instant | the flash | same |
| Catch | toast with the fish, Catch book card | `catch` | 120 ms | toast | on the last strike | the card | same |
| Dig hit (square) | the hole's damp colour | `dig` | none | dig panel | instant | the colour | same |
| Stone | grey hole, crack pip | a high tone (bypasses the list) | 100 ms | dig panel pips | instant | the pip | same |
| Chest found | gold box in the hole, toast, roll | `roll_d20`, then `success`/`fail` | 150 ms | roll overlay | about 3 s with the roll | the box | same |
| Cargo or errand goods taken (delivery done) | toast, gold count-up pulse | silent (`treasure` unlisted) | none | gold pulses in two steps | at the pier | the gold pulse | same |
| Gust coming | dark ruffled patch upwind, bright flecks | none | none | none | 5 to 10 s lead (55 to 95 up, drifting 6.5/s) | the patch | same |
| Gust caught | patch fades, speed rises | none; needs new cue (owner) | 100 ms weak | sail bar | 4.5 s | the speed; proposed with design: the sail bulge (G1) on a catch | same |
| Current line | faint foam dashes along the lane; chart marks it once ridden | none | none | none | visible about 110 around | the foam | same |
| Shoal | shoal colour on the water; Reef coral heads | none | none | none | seen from the light's range | the colour | Reef coral yes |
| Coral hit | stop, shake, hitstop, hull plank drains | silent (`bump`, `hit` unlisted) | 200 ms strong | hull planks | instant | the plank | same |
| Storm building | red sky the evening before (Mara once), storm wall rising upwind | `thunder` in strong rain | none | none | about a day; the wall minutes before | the wall | same |
| Sail strain | the sail bar's strain class, toast | `ui` | 2 pulses 60 ms | sail bar | 13 strain before the tear | the bar | same |
| Raider intent | ship turns at you inside 170, circles under 50 | none | none | none | today none; proposed puff 0.7 s before each shot (G-22) | the turn; proposed puff | raiders exist (no dread) |
| Raider shot | muzzle puff, ball in flight (about 1 to 2 s at 40 to 80) | silent (`cannon` unlisted) | none | none | flight time | the ball | same |
| Hit taken | red stepped frame 140 ms, shake, 60 to 80 ms hitstop, plank drains | silent (`hit` unlisted) | 120 to 200 ms by damage | hull planks | instant | the frame and the plank | same |
| Raider damaged | none today; proposed list and smoke (G-22) | none | none | none | | proposed list | same |
| Low oil | Mara's line or a toast at 25%; flame shorter with dread | none | none | oil row | once a dark spell | the oil row | same (the flame stays upright) |
| Lamp out | the dark closes in to 32%, no glow | none | none | oil row | at 0 | the dark | same |
| Dread rising (stage 2) | paler palette | the band thins to its stage-2 stems | **none, on purpose** | none | by place, eased 0.4/s | the palette | **never** (no dread) |
| Stage 3 | green haze, wrong decor from 0.5, Mara's 0.5 remark | stage-3 stems | none, on purpose | none | | the haze | never |
| Stage 4 | fog, black flag, lost sailors from 0.6 | the stems bend | none, on purpose | none | | the fog | never |
| Stage 5 | abyss effects from 0.86, the Edge at 0.9 | nothing above 0.9 | none, on purpose | the HUD may lie (abyss) | | the effects | never |
| Region rule in effect | what the region looks like (buoys, stilt houses, coral, lamp rows, roofs); market notes in the harbour | none | none | none at sea | slow blend across the border | the look | Crown, Cays, Reef, Lantern; never the Drowned |
| Entering a new region | today a toast "Entering X: Y waters" at the sector line (G-32, owner); the place line shows the sector | none | none | place line | at the line | the place line | same |
| A clue seen | **no telegraph, on purpose**: one line in the log, nothing else | none | none | none | | the log line | never (no ledger) |
| A wrong thing (berths, hook, hole) | **no telegraph, on purpose**: it simply is there, once | none | none, never | none | | the thing itself | yes, these three are the demo's |
| A lost sailor, the diver, the Edge | **no telegraph, on purpose** | the world goes quiet (`audio.hush`) | none, never | none | | the stillness | the diver yes (glimpse); the rest never |
| Saving | ship icon on a goal or a dock; silent every 4 s | none | none | the icon | about 1 s | the icon | same |

---

## 6. Would need the owner

| ID | What | Rule or canon | Trade-off | Type, effort |
|---|---|---|---|---|
| G-28 | **Post-hut places reachable before the first throw.** Before a throw, `gateRadius` returns `max(strataGate, GATES[chapter])` (`objectives.js:272`), so a ship with lantern 2 and hull 3 (or sails 3) in chapters IV to VI can sail past 1650 to the Slack and the Dim before throwing. Proposal: before the first throw, the wall is the chapter's (`GATES[min(5, ch)]`), and the strata only widen it afterwards; a ship already outside drifts back out of the fog as now. | CANON 2026-11-13 "The chapter fog holds until the first throw at the hut"; but the comment on `strataGate` says "what stops you is the ship and the sea, never the script". | Canon's reading closes a sequence break; the comment's reading lets a well-fitted ship explore early. One must win. Full game only. | behaviour, S |
| G-29 | **Far labels exist.** DESIGN.md says `labelsTick` "once drew far labels over islands; removed", but `main.js:1255` still calls it and `places.js:188-207` draws "?", the spyglass word or the name over every hand-made place between 70 and 170 + 110 x spyglass. | RULES 11 (goals found), RULES 16, DESIGN | Labels help find places without markers; they are text over the sea. Either the doc or the code is wrong. If kept: the Table's label should follow `tableOpen` like going ashore does (`places.js:194` uses `d3Open`), see G-26. | behaviour or documentation, S |
| G-26 | **The Table: can be gone ashore on, but shows no label, after one throw.** `tableOpen` (one throw, or three questions) opens it (`places.js:181`, `interact.js:225`); its far label waits for `d3Open` (three questions; `places.js:194`, `main.js:1255`). Proposal: both read `tableOpen`, or both drop if G-29 removes labels. | CANON 2026-11-13 "The Table stands for every captain who has thrown at the hut once" | None beyond G-29. Full game only. | behaviour, S |
| G-30 | **A clue's region can disagree with the water it lies in.** `CL-RIBS-a` is tagged `reef` (`clues.js:25`), but the Ribs lie at (-560, 70) (`landmarks.js:19`), sector centre (-550, 0), 180 deg, inside the Lantern wedge (188 +/- 28, `sectors.js:19-24`), and the region rules use the sector (`regions.js:8`). So seeing the Ribs ticks Perrin's Reef letter (`regionSeen`) while the ship is in Lantern water, and counts Reef towards `regionsSeen` (the S5 gate needs 3). Proposal: the owner picks per clue which is true; the code then either moves the place or retags the clue, and a check in `clueLint` flags any clue whose fixed place's sector disagrees. | RULES 32 (clues are the ledger), CANON 2026-11-13 (Perrin's letters by region) | Retagging changes what counts for the Reef (it has 4 sources); moving the place changes the map. The lore bible (D-01) also notes the Sunken Street (Drowned clue, Cays water). | behaviour or data, S |
| G-31 | **Three ways of numbering dread stages.** `stageOf` is 0 to 4 (fifths, `palette.js:63`); DESIGN's table and the debug line number them 1 to 5; Mara's remarks cut at quarters 0.25 / 0.5 / 0.75 / 0.95 (`main.js:1284`); `lullaby.js:8` calls 0.5 "stage 3" (quarters) while `lostsailors.js:29` calls 0.6 "the fourth stage" (fifths from one). CANON's "below stage 3" (the Cays, held at 0.45) and "stage 4 and up" (lost sailors, 0.6) read in different schemes. Proposal: docs say "stage n = stageOf + 1" everywhere and quote the dread number beside any stage in CANON; no number in the game changes. | CANON 2026-11-12 (two rows); only the owner edits CANON | Pure wording; no behaviour changes. Mara's quarters stay (owner, 2026-11-15). | documentation, S |
| G-32 | **Words on the sea.** The wind-shift toast ("The wind is shifting: now from the NE", `main.js:1168`), the region toast at every sector line ("Entering X: Y waters", `main.js:1144`; a line, against the spirit of "never a line" for crossings), "[Q] hide", "+N more in your orders (J)", "You reached your pin.", the F1 legend. Proposal: drop the two toasts (the wind ring and the place line already show both), keep the rest until the owner says. | RULES 16; audit finding 13 (owner's call); CANON 2026-11-13 crossings | Fewer words; a new player loses an explicit wind notice. | behaviour, S |

---

## 7. Building blocks for phase 3

What a regional mechanic or a 30-second-to-3-minute environmental puzzle may rely on. Anything not here needs a new system and the
owner.

### 7.1 Verbs (what the player can do)
| Verb | Keys (pad) | Guarantee |
|---|---|---|
| Sail: steer, trim, catch gusts, ride currents | A/D W/S (stick) | top speed 11 x mods; turn about 40 deg/s at speed; stops in about 1.4 s by anchor, longer by trim alone |
| Row | G then W/S (LT) | 2.6 units/s, windless, turns at rest |
| Anchor (implicitly, by E or C under way) | E, C (A, X) | stops and pins; nothing moves an anchored ship |
| Interact (one thing at a time) | E (A) | ranges in 4.5; with G-03/G-04 a started action keeps its target; 0.6 s grace |
| Go ashore on a hand-made place | E | 2.6 s; `places.visit` can ask for night, calm, still, tide, Mara aboard (`VISITS` `need`) |
| Fish (with the water's ring) | C, Space (X, RT) | 6 ring kinds chosen by where and when; species by habitat and hour |
| Dig a beach | E, arrows (A, d-pad) | 8 x 5; 4 beach kinds; damp = near; the noon shadow can point |
| Hail a ship | E | a hidden roll against reputation |
| Read and pin the chart | M, mouse | a pin steers the wind-ring dot to within 22 |
| Light or douse the lamp | L | burns oil when dark, foggy or stormy |
| Throw the die | Space at the hut, or by a check | d20, advantage and disadvantage |
| Wait (time passes; the tide turns) | sail or sit | day 690 s; tide 345 s a cycle; night about 4 minutes |
| Fight (optional) | Space (RT) | auto-aim, range 85 |

### 7.2 Channels (what the player can sense and be told without words)
- **The water:** colour by region and depth, shoal colour, foam lines of currents, gust patches, the white race of the belt, wave
  height (low within about 15 of shore, up to 1.7x at 260 off), seabed in the shallows.
- **The sky and light:** time of day, storm wall upwind, red evening sky before a front, the moon (new or full), lighthouse beams.
- **The ship:** sail fill and bulge, heel, the bow dip of the anchor, the lantern flame's height and lean (dread), the pennant
  (points the way out of fog with `hum`), torn sail rags, the hull planks.
- **The HUD (wordless):** wind ring with the good-heading arc and one dot for an early goal or a pin, gold, clock, tide mark (rising
  or falling), sail bar, oil row, hull planks, cannonball count, the place line.
- **The world's props:** a place's state props from `world.gctx` (calm, still, upgrades, clues seen, Table open) shown or hidden,
  never rebuilt.
- **Sound:** the band and its stems by stage, the night stems panned (Cays, and toward the way out with `hum`), Tama's noon `bell`,
  `deepbell`, rain and thunder. Every sound that carries story has a sight twin (RULES 28).
- **Mara:** at most one short line per thing, once (`state.hints`), never explaining (RULES 7).
- **The log:** one line per clue, no popup.

### 7.3 Guarantees the control rules give
- E works under way; the player never has to stop by hand (RULES 18; with G-05, C too).
- An anchored ship does not drift; currents, leeway and the Slack stop at the anchor.
- A running action is not cancelled by drift (today) or by another target (G-03), and a menu does not end it (G-01).
- A dig is never cancelled by drift; a wrong shore costs 2.2 s and finds sand.
- Nothing is a game over: sinking wakes you at a harbour; fog lets go; the belt throws you back.
- Ranges are from the shoreline: interact 14 to 24, harbour pier 22, dead light 45, landfall sighting 150.
- Timed actions take 2.2 to 5 s; anything longer must be a minigame the player can leave (G-10).

### 7.4 Limits
- **No markers.** No dot, label or line for a later goal or a puzzle's answer (RULES 11). Only the early goals and the player's own
  pin move the wind-ring dot.
- **No explaining text.** A rule is read from what is seen (RULES 24b); a line, if any, is one short line in the game's voice and
  never names its cause.
- **Once is once.** A wrong thing fires once, one flag in `state.story`, no log entry naming it (RULES 8).
- **Dread by place, never by time.** A puzzle may read the hour, the tide, the weather or the moon; it may not raise dread by a timer.
- **The demo:** nothing from after the hut; no dread; no clue ledger; only the seven early places; no Drowned (RULES 29). A puzzle
  for the demo uses only the cosy reading.
- **Sound:** no new cue without the owner (RULES 25); every sound that carries story has a sight twin (RULES 28).
- **New state** goes in `state.story` with a safe default (RULES 31); a new system is a new file (RULES 34).
- **Camera:** a puzzle may not move or frame the camera (4.9).
- **Puzzle length:** 30 s to 3 minutes of play means at most one tide turn (345 s is too long to wait inside one) or one hour's change
  (about 29 s of play) as its clock.
