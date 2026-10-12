# HOIST roadmap: from demo to complete game

The demo (Tama, Velto, the first hut throw, no dread) is done and in playtest. This is the plan for the full game. Tick items off as they land. The story itself lives in the Story Bible; what exists lives in `docs/PROGRESS.md`.

## Where we are
| Area | State |
|---|---|
| Sailing, wind, tides, weather, day/night | Built, polished |
| Tutorial, quiet start, intro cinematic, Mara | Built, being playtested |
| Harbours, jobs, passengers, crew, shipyard, fishing, dice, encounters | Built |
| Dread arc and full-dread effects | Built, hidden in the demo |
| Story: Perrin's riddles, the hut, the first throw | Built to the demo end |
| Story: Acts 2 to 5, the ending | Designed (Story Bible), not built |
| Audio | Synthesised stand-ins plus mixer; no final audio |
| Biomes, walkable islands, harbour mini-quests | Concepts only |
| Save slots, settings, gamepad, accessibility | Basic only |

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
- [ ] Gamepad support
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
- [ ] Optional: walkable beaches, towns, cave mouths
**Gameplay**
- [ ] Encounter deck: more cards, advantage/disadvantage sources, hut-roll effects
- [ ] Crew personalities with timed stays and small stories

## Phase 3: Acts 3 and 4, the descent
**Story**
- [ ] The lady's errands (gull feather, bell clapper, Mara's hat)
- [ ] Mara fading: forgets her village, says wrong things, stops answering hints
- [ ] Hut changes on later visits (candles, second chair, darker die, ledger with your ship)
- [ ] The Eye and the leviathan tied to the ledger
**Horror systems**
- [ ] Tune the dread arc to the real playtime (DREAD_RANGE and gates are demo values)
- [ ] Choice-driven dread, not only distance
- [ ] Ten full-dread effects one by one: check each is scary, readable and skippable
- [ ] Rule: horror stays implied, never explained; review every new line for that
**World**
- [ ] The Drowned sectors, wrong harbours (twin harbour), the island that moves

## Phase 4: the ending
- [ ] Ending logic from the final Lady's d20 and ledger: sleep 100 years (20), good dreams (10 to 19), she rises (1 to 9) plus ledger bonus or punishment
- [ ] Three endings: keep it asleep, wake it, take her seat
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
- [ ] Name and branding: the game is called HOIST; repo, files and title still say Pocket Pirates
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
