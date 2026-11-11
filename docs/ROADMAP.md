# HOIST roadmap: from demo to complete game

The demo (Tama, Velto, the first hut throw, no dread) is done and in playtest. This is the plan for the full game. Tick items off as they land. The story's truth is `docs/CANON.md`; what exists lives in `docs/PROGRESS.md`.

## Where we are (2026-11-11)
| Area | State |
|---|---|
| Sailing, wind, tides, weather, day/night, the anchor | Built, polished |
| Tutorial, quiet start, intro cinematic, Mara | Built; interface fixes after a UI critique are in; needs a fresh playtest |
| Harbours, jobs, passengers, crew, shipyard, fishing, dice, encounters | Built |
| The captain's log (Chart, Orders, Ship's book), the slip, the portolan chart | Built 2026-11-11 |
| Demo story: Perrin's riddles, four small wrong things, the hut, the first throw, the diver | Built; 16 goals |
| World after the demo: strata, 13 places, 17 clues, capabilities | Built (docs/WORLD_REDESIGN.md) |
| Dread arc and full-dread effects, the seven threads | Built, hidden in the demo |
| The ending: the Table by the Water, four actions, six endings | Built 2026-11-11; ending texts are drafts |
| Mara's memory of her village | Built 2026-11-11 (four pieces) |
| Audio | Stage-1 band, tavern, hut and night stems in; later stages and many effects are stand-ins or silent on purpose |
| Biomes, walkable islands, harbour mini-quests | Concepts only |
| Save slots, settings, accessibility | Basic only (gamepad works) |

## Next, in order
1. The owner plays one fresh voyage to the hut and notes: minutes to the hut (target under 45), which of the four wrong things were noticed, whether the second riddle trip is a chore.
2. The writer rewrites the six ending texts (`src/table.js`).
3. Make the gentle ending findable: a rumour or a Mara line that points at the music at night.
4. Decide the open points in `docs/CANON.md` section 8.
5. Check every screen in the new typeface (harbour, pause, tavern games, the Table) for text that no longer fits.

## Phase 0: finish the demo (now)
- [ ] Collect survey answers and friends' feedback (survey artifact, `responses` is still empty)
- [ ] Fix every blocker found (softlocks, confusing text, performance)
- [ ] Watch a stranger play the first 15 minutes without helping; note where they stall
- [ ] Decide what the demo teaches the next phases (pacing, text length, difficulty)

## Phase 1: tighten the core loop (before adding content)
**Gameplay**
- [ ] Balance gold, prices, upgrade costs and job pay over a 3 to 5 hour run
- [ ] Make sailing the main joy: wind shifts, tacking, gusts readable and fun at speed
- [ ] Combat pass: raider variety, cannon feel, escape and repair rules; keep it rare and optional
- [ ] Decide whether trading / selling relics is in (backlog idea) and design it once
- [ ] Hull, cargo and cannon upgrades (backlog)
**Onboarding and UX**
- [ ] Full controls rebinding and a proper settings menu
- [x] Gamepad support (`src/gamepad.js`)
- [ ] Accessibility: reduce flicker and wobble, text size, colour-safe wind ring, subtitles for sounds
- [ ] Mobile/touch pass (buttons exist, not tested on real devices)
**Technical**
- [ ] Multiple save slots, save versioning and migration
- [ ] Performance budget: target frame rate on a mid laptop and a phone; cull and LOD the world cells
- [ ] Automated smoke test (headless boot, tutorial run, no console errors) in CI
- [ ] Split `main.js` (very large) into modules: HUD, onboarding, story hooks, world loop

## Phase 2: Act 2, the sunny world gets bigger
**Story**
- [ ] Act 2 beats from the Story Bible: rumours of The Drowned, Perrin's later riddles, Mara's village thread starts
- [ ] The Pained Raven seeds (name inside the hull, bottles on your route)
- [ ] Side stories 1 to 12 in `PROGRESS.md`: pick 5 to build, link them loosely
**World and content**
- [ ] Harbour mini-quests (kitten, cake, the other kitten)
- [ ] More villages with customs and local charts; more species per region
- [ ] Biomes: coral reef, rain forest isle, sunken area (concepts exist; keep clear of Dredge)
- [x] A forest isle exists: Hollowgreen (hand-made, landmarks.js); the forest bed plays near it
- [ ] Big forest islands you can step onto: mark them `desc.forest`; the `forest` ambience cue is already in and plays very quietly once you are ashore there (`forestLevel` in main.js)
- [ ] Optional: walkable beaches, towns, cave mouths
**Gameplay**
- [ ] Encounter deck: more cards, advantage/disadvantage sources, hut-roll effects
- [ ] Crew personalities with timed stays and small stories

## Phase 3: Acts 3 and 4, the descent
**Story**
- [x] ~~The lady's errands~~ cut 2026-11-11: the story after the demo is told by going places
- [x] Mara remembers her village in four pieces (decided 2026-11-11, `src/table.js`); still open: she says wrong things, stops answering hints
- [ ] Hut changes on later visits (candles, second chair, darker die, ledger with your ship)
- [x] The book weighs the last throw; She Rises runs the Eye sequence
**Horror systems**
- [x] Strata replace the single dread range (`STRATA` in `palette.js`); still to tune against real playtime
- [ ] Choice-driven dread, not only distance
- [ ] Ten full-dread effects one by one: check each is scary, readable and skippable
- [ ] Rule: horror stays implied, never explained; review every new line for that
**World**
- [ ] The Drowned sectors, wrong harbours (twin harbour), the island that moves

## Phase 4: the ending
- [x] Ending logic from the last throw and the book: Long Sleep (20), Good Dreams (10 to 19), She Rises (1 to 9), weighed by earlier throws
- [x] Six endings at the Table (throw x3, the tune, sit, leave); texts are drafts
- [ ] Epilogue and the new-game-plus hint (what stays, what resets)
- [ ] Credits and a clean return to the title

## Phase 5: audio, art and feel
**Audio**
- [ ] Replace synthesised stand-ins with final music and sounds (drop-in files, mixer ready)
- [ ] Adaptive music across the five dread stages
- [ ] Mara's voice grunts/cheerful sound pass; harbour ambience per village
**Visuals**
- [ ] Style review against `docs/STYLE.md` (dither, grime, no thin lines) across all new content
- [ ] Fish, villager and ship art pass for variety; shipyard parts and flags
- [ ] Title screen, logo, loading and pause polish
**Writing**
- [ ] Full text pass for tone, length and typos; QUOTES.md kept in sync
- [ ] Localisation decision (English only vs. later)

## Phase 6: testing and release
- [ ] Closed beta with 10 to 20 players; survey after each act
- [ ] Bug triage list, softlock hunt through every goal order (players do things out of order)
- [ ] Cross-browser and device checks (Chrome, Firefox, Safari, mobile)
- [ ] Decide platform: itch.io page / own site / Steam via wrapper
- [ ] Name and branding: the game is called HOIST and the title screen says so; repo and file names still say Pocket Pirates
- [ ] Store page: trailer, screenshots (the intro cinematic helps), short description
- [ ] Press kit and a launch plan

## Risks to watch
- **Scope:** the story is large. Cut side stories before cutting the ending.
- **Information overload:** every new feature needs the quiet-start rule (`laterOK()`), one thing at a time.
- **main.js size:** the longer it waits, the harder the split. Do it at the start of Phase 1.
- **Procedural horror needs hand-tuning:** schedule real playtime for the dread arc.
- **Demo spoilers:** keep the demo free of full-game secrets until release.

## Suggested order
1. Phase 0 and 1 together (feedback, balance, refactor, save slots)
2. Phase 2 content in small drops, each playtested
3. Phase 3 and 4 once the world is large enough to descend through
4. Phase 5 in parallel from Phase 2 on (audio is the long pole)
5. Phase 6 last, with a beta before any public release
